import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("react-native-reanimated", () => {
    const { View, Text } = require("react-native");
    const chain = {
        delay: () => chain,
        springify: () => chain,
    };

    return {
        __esModule: true,
        default: { View, Text },
        View,
        Text,
        FadeIn: {
            duration: () => chain,
        },
        FadeInDown: {
            duration: () => chain,
        },
        createAnimatedComponent: (Component: unknown) => Component,
    };
});

jest.mock("lucide-react-native", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Icon = () => React.createElement(View);
    return new Proxy({}, { get: () => Icon });
});

const mockStartTask = jest.fn();

jest.mock("@/services/backgroundTaskService", () => ({
    backgroundTaskService: {
        startTask: (...args: unknown[]) => mockStartTask(...args),
    },
}));

const mockAddTask = jest.fn(() => "task-1");
const mockFailTask = jest.fn();

jest.mock("@/stores/taskStore", () => ({
    useTaskStore: {
        getState: jest.fn(() => ({
            addTask: mockAddTask,
            failTask: mockFailTask,
        })),
    },
}));

let mockCurrentApiKey: string | null = null;

jest.mock("@/stores/settingsStore", () => ({
    useSettingsStore: () => ({
        geminiApiKey: mockCurrentApiKey,
    }),
}));

const messages: Array<Record<string, unknown>> = [];
let nextMessageId = 0;

const mockUpdateMessage = jest.fn();
const mockAppendToMessage = jest.fn();
const mockAppendToReasoning = jest.fn();
const mockAddStream = jest.fn();
const mockRemoveStream = jest.fn();
const mockIsStreaming = jest.fn(() => false);

const mockAddMessage = jest.fn((role: string, content: string, options: Record<string, unknown> = {}) => {
    nextMessageId += 1;
    const id = `m_${nextMessageId}`;
    messages.push({ id, role, content, timestamp: Date.now(), ...options });
    return id;
});

jest.mock("@/stores/chatStore", () => {
    const __mockUseChatStore = Object.assign(
        jest.fn(() => ({
            addMessage: mockAddMessage,
            updateMessage: mockUpdateMessage,
            appendToMessage: mockAppendToMessage,
            appendToReasoning: mockAppendToReasoning,
            addStream: mockAddStream,
            removeStream: mockRemoveStream,
            isStreaming: mockIsStreaming,
        })),
        {
            getState: jest.fn(() => ({
                messages,
                addMessage: mockAddMessage,
                updateMessage: mockUpdateMessage,
                appendToMessage: mockAppendToMessage,
                appendToReasoning: mockAppendToReasoning,
                addStream: mockAddStream,
                removeStream: mockRemoveStream,
                isStreaming: mockIsStreaming,
            })),
        }
    );

    return {
        useChatStore: __mockUseChatStore,
        __mockUseChatStore,
    };
});

jest.mock("@/agent", () => {
    const __mockProcessMessageStream = jest.fn();
    const __mockAgentCancel = jest.fn();
    const __mockAgentCtor = jest.fn().mockImplementation(() => ({
        processMessageStream: (...args: unknown[]) => __mockProcessMessageStream(...args),
        cancel: __mockAgentCancel,
    }));

    return {
        Agent: __mockAgentCtor,
        __mockProcessMessageStream,
        __mockAgentCancel,
        __mockAgentCtor,
    };
});

const {
    __mockProcessMessageStream: mockProcessMessageStream,
    __mockAgentCtor: MockAgent,
} = jest.requireMock("@/agent") as {
    __mockProcessMessageStream: jest.Mock;
    __mockAgentCtor: jest.Mock;
};

const mockInitializeSkills = jest.fn();
const mockMatchSkills = jest.fn();
const mockComposeConfig = jest.fn();
const mockResolveTools = jest.fn();

jest.mock("@/skills", () => ({
    initializeSkills: (...args: unknown[]) => mockInitializeSkills(...args),
    skillRegistry: {
        matchSkills: (...args: unknown[]) => mockMatchSkills(...args),
        composeConfig: (...args: unknown[]) => mockComposeConfig(...args),
        resolveTools: (...args: unknown[]) => mockResolveTools(...args),
    },
}));

jest.mock("@/lib/appState", () => ({
    isEscalationSuppressed: jest.fn(() => false),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        })),
    },
}));

import { ChatInput } from "@/components/chat/ChatInput";

describe("ChatInput", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockCurrentApiKey = null;
        messages.length = 0;
        nextMessageId = 0;

        mockIsStreaming.mockReturnValue(false);
        mockStartTask.mockResolvedValue(undefined);
        mockMatchSkills.mockReturnValue([]);
        mockComposeConfig.mockResolvedValue({
            systemPrompt: "scoped",
            toolNames: [],
            maxSteps: 8,
        });
        mockResolveTools.mockResolvedValue({});

        mockProcessMessageStream.mockImplementation(async function* () {
            yield { type: "done" };
        });
    });

    test("shows warning assistant message when API key is missing", () => {
        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Set API key in settings...");

        fireEvent.changeText(input, "hello");
        fireEvent(input, "submitEditing");

        expect(mockAddMessage).toHaveBeenCalledWith(
            "assistant",
            "Please set your Gemini API key in settings first."
        );
        expect(mockAddTask).not.toHaveBeenCalled();
        expect(MockAgent).not.toHaveBeenCalled();
    });

    test("routes to background task for background skills", async () => {
        mockCurrentApiKey = "key-1";
        mockMatchSkills.mockReturnValue([
            {
                skill: {
                    id: "whatsapp",
                    name: "WhatsApp",
                    description: "d",
                    promptFragment: "p",
                    needsBackground: true,
                    maxSteps: 20,
                },
                confidence: 0.99,
            },
        ]);

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Open whatsapp");
        fireEvent(input, "submitEditing");

        await waitFor(() => {
            expect(mockAddTask).toHaveBeenCalledWith("Open whatsapp");
            expect(mockStartTask).toHaveBeenCalledWith("task-1", "Open whatsapp");
        });

        expect(mockAddMessage).toHaveBeenCalledWith("user", "Open whatsapp");
        expect(MockAgent).not.toHaveBeenCalled();
    });

    test("runs foreground stream when no background skill is matched", async () => {
        mockCurrentApiKey = "key-2";
        mockMatchSkills.mockReturnValue([]);

        mockProcessMessageStream.mockImplementation(async function* () {
            yield { type: "thinking" };
            yield { type: "text", content: "Hello back" };
            yield { type: "done" };
        });

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Say hello");
        fireEvent(input, "submitEditing");

        await waitFor(() => {
            expect(MockAgent).toHaveBeenCalledWith({ apiKey: "key-2" });
        });

        const assistantId = mockAddMessage.mock.results[1]?.value as string;

        expect(mockAddStream).toHaveBeenCalledWith(assistantId);
        expect(mockUpdateMessage).toHaveBeenCalledWith(assistantId, { status: "thinking" });

        await waitFor(() => {
            expect(mockAppendToMessage).toHaveBeenCalledWith(assistantId, "Hello back");
            expect(mockUpdateMessage).toHaveBeenCalledWith(assistantId, { status: "complete" });
            expect(mockRemoveStream).toHaveBeenCalledWith(assistantId);
        });
    });
});