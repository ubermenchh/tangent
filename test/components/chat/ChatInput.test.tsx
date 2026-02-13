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

const mockAddMessage = jest.fn(
    (role: string, content: string, options: Record<string, unknown> = {}) => {
        nextMessageId += 1;
        const id = `m_${nextMessageId}`;
        messages.push({ id, role, content, timestamp: Date.now(), ...options });
        return id;
    }
);

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
    __mockAgentCancel: mockAgentCancel,
    __mockAgentCtor: MockAgent,
} = jest.requireMock("@/agent") as {
    __mockProcessMessageStream: jest.Mock;
    __mockAgentCancel: jest.Mock;
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

const appState = require("react-native").AppState as {
    addEventListener: jest.Mock;
};

beforeEach(() => {
    appState.addEventListener.mockImplementation(() => ({ remove: jest.fn() }));
});

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

    test("uses skill-scoped foreground agent when matched skills do not require background", async () => {
        mockCurrentApiKey = "key-scoped";

        const matchedSkill = {
            id: "productivity",
            name: "Productivity",
            description: "d",
            promptFragment: "p",
            needsBackground: false,
            maxSteps: 12,
        };

        mockMatchSkills.mockReturnValue([{ skill: matchedSkill, confidence: 0.9 }]);

        mockComposeConfig.mockResolvedValueOnce({
            systemPrompt: "scoped-system",
            toolNames: ["get_device_info"],
            maxSteps: 12,
        });

        mockResolveTools.mockResolvedValueOnce({
            get_device_info: {},
        });

        mockProcessMessageStream.mockImplementation(async function* () {
            yield { type: "done" };
        });

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Check phone info");
        fireEvent(input, "submitEditing");

        await waitFor(() => {
            expect(mockComposeConfig).toHaveBeenCalledWith([matchedSkill]);
            expect(mockResolveTools).toHaveBeenCalledWith(["get_device_info"]);
            expect(MockAgent).toHaveBeenCalledWith({
                apiKey: "key-scoped",
                tools: { get_device_info: {} },
                systemPrompt: "scoped-system",
                maxSteps: 12,
            });
        });
    });

    test("marks task failed when background task startup fails", async () => {
        mockCurrentApiKey = "key-bg-fail";

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

        mockStartTask.mockRejectedValueOnce(new Error("background launch failed"));

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Open whatsapp");
        fireEvent(input, "submitEditing");

        await waitFor(() => {
            expect(mockFailTask).toHaveBeenCalledWith("task-1", "background launch failed");
        });
    });

    test("centered mode suggestion chip pre-fills input", () => {
        mockCurrentApiKey = "key-centered";

        const { getByText, getByDisplayValue } = render(<ChatInput centered />);

        fireEvent.press(getByText("Battery status"));

        expect(getByDisplayValue("Battery status")).toBeTruthy();
    });

    test("clamps input height between 48 and 120", () => {
        mockCurrentApiKey = "key-height";

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent(input, "contentSizeChange", {
            nativeEvent: { contentSize: { width: 100, height: 300 } },
        });

        const styleAfterLarge = Array.isArray(input.props.style)
            ? Object.assign({}, ...input.props.style)
            : input.props.style;
        expect(styleAfterLarge.height).toBe(120);

        fireEvent(input, "contentSizeChange", {
            nativeEvent: { contentSize: { width: 100, height: 10 } },
        });

        const styleAfterSmall = Array.isArray(input.props.style)
            ? Object.assign({}, ...input.props.style)
            : input.props.style;
        expect(styleAfterSmall.height).toBe(48);
    });

    test("escalates active foreground stream when app backgrounds", async () => {
        mockCurrentApiKey = "key-bg";

        const appState = require("react-native").AppState as {
            addEventListener: (type: string, cb: (state: string) => void) => { remove: () => void };
        };

        type AddEventListener = (
            type: string,
            cb: (state: string) => void
        ) => { remove: () => void };

        const addEventListenerMock =
            appState.addEventListener as jest.MockedFunction<AddEventListener>;
        let appStateHandler: ((state: string) => void) | undefined;

        addEventListenerMock.mockImplementationOnce((_type, cb) => {
            appStateHandler = cb;
            return { remove: jest.fn() };
        });

        let releaseGate: (() => void) | undefined;
        const gate = new Promise<void>(resolve => {
            releaseGate = resolve;
        });

        mockProcessMessageStream.mockImplementation(async function* () {
            yield { type: "thinking" };
            await gate;
            yield { type: "done" };
        });

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Long running task");
        fireEvent(input, "submitEditing");

        const assistantId = mockAddMessage.mock.results[1]?.value as string;

        await waitFor(() => {
            expect(mockAddStream).toHaveBeenCalledWith(assistantId);
        });

        expect(appStateHandler).toBeDefined();
        appStateHandler?.("background");

        await waitFor(() => {
            expect(mockAgentCancel).toHaveBeenCalledTimes(1);
            expect(mockAddTask).toHaveBeenCalledWith("Long running task");
            expect(mockStartTask).toHaveBeenCalledWith("task-1", "Long running task");
        });

        expect(mockUpdateMessage).toHaveBeenCalledWith(assistantId, {
            status: "complete",
            content: "[Moved to background]",
        });

        releaseGate?.();
    });

    test("handles reasoning/tool-call/tool-call-end/cancelled stream chunks", async () => {
        mockCurrentApiKey = "key-stream";

        mockProcessMessageStream.mockImplementation(async function* () {
            yield { type: "thinking" };
            yield { type: "reasoning", content: "reason step" };
            yield {
                type: "tool-call",
                toolCall: {
                    id: "tc-1",
                    name: "tap",
                    arguments: { target: "Send" },
                    status: "running",
                },
            };
            yield {
                type: "tool-call-end",
                toolCall: {
                    id: "tc-1",
                    name: "tap",
                    arguments: { target: "Send" },
                    status: "success",
                    result: { ok: true },
                },
            };
            yield { type: "cancelled" };
        });

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Run stream");
        fireEvent(input, "submitEditing");

        const assistantId = mockAddMessage.mock.results[1]?.value as string;

        await waitFor(() => {
            expect(mockAppendToReasoning).toHaveBeenCalledWith(assistantId, "reason step");
        });

        expect(mockUpdateMessage).toHaveBeenCalledWith(
            assistantId,
            expect.objectContaining({ status: "streaming" })
        );

        expect(mockUpdateMessage).toHaveBeenCalledWith(assistantId, { toolCalls: [] });

        await waitFor(() => {
            expect(mockUpdateMessage).toHaveBeenCalledWith(assistantId, {
                status: "complete",
                content: "[Cancelled]",
            });
        });
    });

    test("marks assistant message as error when stream throws", async () => {
        mockCurrentApiKey = "key-stream-error";

        mockProcessMessageStream.mockImplementation(async function* () {
            yield { type: "thinking" };
            throw new Error("stream crash");
        });

        const { getByPlaceholderText } = render(<ChatInput />);
        const input = getByPlaceholderText("Ask Tangent...");

        fireEvent.changeText(input, "Cause stream error");
        fireEvent(input, "submitEditing");

        const assistantId = mockAddMessage.mock.results[1]?.value as string;

        await waitFor(() => {
            expect(mockUpdateMessage).toHaveBeenCalledWith(assistantId, {
                content: "Error: stream crash",
                status: "error",
            });
        });
    });
});
