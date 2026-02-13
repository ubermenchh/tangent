import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { Message } from "@/types/message";

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

jest.mock("@/components/ui/text", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        Text: (props: Record<string, unknown> & { children?: unknown }) =>
            React.createElement(Text, props, props.children),
    };
});

jest.mock("react-native-markdown-display", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return ({ children }: { children: string }) => React.createElement(Text, null, children);
});

jest.mock("@/components/chat/ToolCallBadge", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        ToolCallBadge: ({ toolCall }: { toolCall: { name: string } }) =>
            React.createElement(Text, null, `tool:${toolCall.name}`),
    };
});

jest.mock("lucide-react-native", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Icon = () => React.createElement(View);
    return new Proxy({}, { get: () => Icon });
});

jest.mock("expo-clipboard", () => ({
    setStringAsync: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Medium: "medium",
    },
}));

function makeMessage(overrides: Partial<Message> = {}): Message {
    return {
        id: "m-1",
        role: "assistant",
        content: "Hello from assistant",
        timestamp: 1700000000000,
        ...overrides,
    };
}

describe("MessageBubble", () => {
    test("renders user message with user header", () => {
        const { getByText } = render(
            <MessageBubble
                message={makeMessage({
                    role: "user",
                    content: "Hi there",
                })}
            />
        );

        expect(getByText("You")).toBeTruthy();
        expect(getByText("Hi there")).toBeTruthy();
    });

    test("renders assistant reasoning and toggles expansion", () => {
        const { getByText, queryByText } = render(
            <MessageBubble
                message={makeMessage({
                    role: "assistant",
                    content: "Final answer",
                    reasoning: "Internal reasoning text",
                })}
            />
        );

        expect(getByText("Thinking")).toBeTruthy();
        expect(queryByText("Internal reasoning text")).toBeNull();

        fireEvent.press(getByText("Thinking"));
        expect(getByText("Internal reasoning text")).toBeTruthy();
    });

    test("renders tool call badges when tool calls exist", () => {
        const { getByText } = render(
            <MessageBubble
                message={makeMessage({
                    toolCalls: [
                        {
                            id: "tc-1",
                            name: "open_app",
                            arguments: { app: "Maps" },
                            status: "running",
                        },
                        {
                            id: "tc-2",
                            name: "tap",
                            arguments: { target: "Start" },
                            status: "success",
                            result: { ok: true },
                        },
                    ],
                })}
            />
        );

        expect(getByText("tool:open_app")).toBeTruthy();
        expect(getByText("tool:tap")).toBeTruthy();
    });

    test("copies message content on long press with haptic feedback", async () => {
        const { setStringAsync } = jest.requireMock("expo-clipboard") as {
            setStringAsync: jest.Mock;
        };
        const { impactAsync } = jest.requireMock("expo-haptics") as {
            impactAsync: jest.Mock;
        };

        const { UNSAFE_getByProps } = render(
            <MessageBubble
                message={makeMessage({
                    role: "user",
                    content: "Copy this text",
                })}
            />
        );

        const longPressTarget = UNSAFE_getByProps({ delayLongPress: 300 });
        fireEvent(longPressTarget, "onLongPress");

        expect(impactAsync).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(setStringAsync).toHaveBeenCalledWith("Copy this text");
        });
    });
});
