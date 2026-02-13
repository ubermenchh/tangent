import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ToolCallBadge } from "@/components/chat/ToolCallBadge";
import type { ToolCall } from "@/types/message";

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

jest.mock("lucide-react-native", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Icon = () => React.createElement(View);
    return new Proxy({}, { get: () => Icon });
});

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
        id: "tc-1",
        name: "web_search",
        arguments: {},
        status: "running",
        ...overrides,
    };
}

describe("ToolCallBadge", () => {
    test("renders mapped tool label", () => {
        const { getByText } = render(<ToolCallBadge toolCall={makeToolCall()} />);
        expect(getByText("Web Search")).toBeTruthy();
    });

    test("falls back to raw tool name for unknown tools", () => {
        const { getByText } = render(
            <ToolCallBadge toolCall={makeToolCall({ name: "my_custom_tool", status: "success" })} />
        );
        expect(getByText("my_custom_tool")).toBeTruthy();
    });

    test("expands and collapses details when content exists", () => {
        const { getByText, queryByText } = render(
            <ToolCallBadge
                toolCall={makeToolCall({
                    status: "success",
                    arguments: { query: "tangent" },
                    result: { ok: true },
                })}
            />
        );

        fireEvent.press(getByText("Web Search"));
        expect(getByText("Input")).toBeTruthy();
        expect(getByText("Output")).toBeTruthy();
        expect(getByText(/query/i)).toBeTruthy();

        fireEvent.press(getByText("Web Search"));
        expect(queryByText("Input")).toBeNull();
        expect(queryByText("Output")).toBeNull();
    });

    test("does not expand when there is no input/output content", () => {
        const { getByText, queryByText } = render(
            <ToolCallBadge
                toolCall={makeToolCall({ status: "success", arguments: {}, result: undefined })}
            />
        );

        fireEvent.press(getByText("Web Search"));
        expect(queryByText("Input")).toBeNull();
        expect(queryByText("Output")).toBeNull();
    });
});
