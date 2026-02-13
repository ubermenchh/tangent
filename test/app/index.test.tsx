import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import HomeScreen from "../../app/index";

const mockPush = jest.fn();
const mockClearMessages = jest.fn();

const mockChatState = {
    messages: [] as Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        timestamp: number;
    }>,
    clearMessages: mockClearMessages,
};

jest.mock("expo-router", () => ({
    useRouter: () => ({
        push: (...args: unknown[]) => mockPush(...args),
    }),
}));

jest.mock("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-keyboard-aware-scroll-view", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        KeyboardAwareScrollView: (props: { children?: React.ReactNode }) =>
            React.createElement(View, null, props.children),
    };
});

jest.mock("react-native-keyboard-controller", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        KeyboardAvoidingView: (props: { children?: React.ReactNode }) =>
            React.createElement(View, null, props.children),
    };
});

jest.mock("@/stores/chatStore", () => ({
    useChatStore: (selector: (state: typeof mockChatState) => unknown) => selector(mockChatState),
}));

jest.mock("@/components/chat/MessageList", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        MessageList: () => React.createElement(Text, null, "MessageListMock"),
    };
});

jest.mock("@/components/chat/ChatInput", () => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
        ChatInput: ({ centered }: { centered?: boolean }) =>
            React.createElement(Text, null, centered ? "ChatInputCenteredMock" : "ChatInputMock"),
    };
});

jest.mock("lucide-react-native", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Icon = () => React.createElement(View);
    return new Proxy({}, { get: () => Icon });
});

describe("app/index", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockChatState.messages = [];
    });

    test("renders empty state with centered chat input when no messages", () => {
        const { getByText, queryByText } = render(<HomeScreen />);

        expect(getByText("What can I help you with?")).toBeTruthy();
        expect(getByText("ChatInputCenteredMock")).toBeTruthy();

        expect(queryByText("MessageListMock")).toBeNull();
        expect(queryByText("ChatInputMock")).toBeNull();
    });

    test("renders message list and regular chat input when messages exist", () => {
        mockChatState.messages = [{ id: "1", role: "user", content: "hello", timestamp: 1 }];

        const { getByText, queryByText } = render(<HomeScreen />);

        expect(getByText("MessageListMock")).toBeTruthy();
        expect(getByText("ChatInputMock")).toBeTruthy();

        expect(queryByText("ChatInputCenteredMock")).toBeNull();
    });

    test("navigates to tasks and settings from header actions", () => {
        const { getByLabelText } = render(<HomeScreen />);

        fireEvent.press(getByLabelText("Background tasks"));
        fireEvent.press(getByLabelText("Settings"));

        expect(mockPush).toHaveBeenNthCalledWith(1, "/tasks");
        expect(mockPush).toHaveBeenNthCalledWith(2, "/settings");
    });

    test("shows new chat action only when messages exist and clears messages", () => {
        mockChatState.messages = [{ id: "1", role: "assistant", content: "hey", timestamp: 1 }];

        const { getByLabelText, queryByLabelText } = render(<HomeScreen />);

        const newChat = getByLabelText("New chat");
        fireEvent.press(newChat);

        expect(mockClearMessages).toHaveBeenCalledTimes(1);
        expect(queryByLabelText("New chat")).toBeTruthy();
    });

    test("hides new chat action when message list is empty", () => {
        mockChatState.messages = [];

        const { queryByLabelText } = render(<HomeScreen />);

        expect(queryByLabelText("New chat")).toBeNull();
    });
});
