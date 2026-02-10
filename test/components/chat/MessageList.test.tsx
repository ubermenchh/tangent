import React from "react";
import { render } from "@testing-library/react-native";
import { MessageList } from "@/components/chat/MessageList";

const mockState = {
    messages: [] as Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: number }>,
};

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

jest.mock("@/stores/chatStore", () => ({
    useChatStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

jest.mock("@/components/chat/MessageBubble", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        MessageBubble: ({ message }: { message: { content: string } }) =>
            React.createElement(Text, null, `bubble:${message.content}`),
    };
});

describe("MessageList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockState.messages = [];
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test("renders all message bubbles from store", () => {
        mockState.messages = [
            { id: "1", role: "user", content: "hello", timestamp: 1 },
            { id: "2", role: "assistant", content: "world", timestamp: 2 },
        ];

        const { getByText } = render(<MessageList />);

        expect(getByText("bubble:hello")).toBeTruthy();
        expect(getByText("bubble:world")).toBeTruthy();
    });

    test("schedules auto-scroll when a message appears", () => {
        const setTimeoutSpy = jest.spyOn(global, "setTimeout");
        const { rerender } = render(<MessageList />);

        mockState.messages = [{ id: "1", role: "assistant", content: "new message", timestamp: 1 }];
        rerender(<MessageList />);

        expect(setTimeoutSpy.mock.calls.some(call => call[1] === 100)).toBe(true);

        setTimeoutSpy.mockRestore();
    });
});