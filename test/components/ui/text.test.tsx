import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("nativewind", () => ({
    cssInterop: jest.fn(),
}));

const getText = () => {
    const mod = require("@/components/ui/text") as {
        Text: React.ComponentType<Record<string, unknown>>;
    };
    return mod.Text;
};

describe("components/ui/Text", () => {
    test("registers cssInterop for RNText className mapping", () => {
        jest.isolateModules(() => {
            const cssInterop = jest.fn();

            jest.doMock("nativewind", () => ({
                cssInterop,
            }));

            const { Text: IsolatedRNText } = require("react-native");
            require("@/components/ui/text");

            expect(cssInterop).toHaveBeenCalledWith(IsolatedRNText, { className: "style" });
        });
    });

    test("renders children and applies default classes", () => {
        const Text = getText();
        const { getByTestId } = render(<Text testID="txt-default">Hello</Text>);
        const node = getByTestId("txt-default");

        expect(node.props.children).toBe("Hello");
        expect(node.props.className).toContain("text-base");
        expect(node.props.className).toContain("text-foreground");
        expect(node.props.className).toContain("web:select-text");
    });

    test("merges custom className with defaults", () => {
        const Text = getText();
        const { getByTestId } = render(
            <Text testID="txt-custom" className="font-bold text-red-500">
                Custom
            </Text>
        );
        const node = getByTestId("txt-custom");

        expect(node.props.className).toContain("text-base");
        expect(node.props.className).toContain("font-bold");
        expect(node.props.className).toContain("text-red-500");
    });

    test("forwards native text props", () => {
        const Text = getText();
        const { getByTestId } = render(
            <Text testID="txt-props" numberOfLines={2} selectable>
                Props
            </Text>
        );
        const node = getByTestId("txt-props");

        expect(node.props.numberOfLines).toBe(2);
        expect(node.props.selectable).toBe(true);
    });

    test("exposes stable displayName", () => {
        const Text = getText();
        expect((Text as { displayName?: string }).displayName).toBe("Text");
    });
});
