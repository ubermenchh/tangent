import React from "react";
import { act, render } from "@testing-library/react-native";

jest.mock("../../global.css", () => ({}));

const mockSettingsState = {
    isLoaded: false,
    loadSettings: jest.fn(),
};

jest.mock("expo-splash-screen", () => ({
    __mockPreventAutoHideAsync: jest.fn(),
    __mockHideAsync: jest.fn(),
    preventAutoHideAsync: jest.fn(),
    hideAsync: jest.fn(),
}));

jest.mock("@expo-google-fonts/inter", () => ({
    __mockUseFonts: jest.fn(),
    useFonts: jest.fn(),
}));

jest.mock("@expo-google-fonts/jetbrains-mono", () => ({
    JetBrainsMono_400Regular: {},
    JetBrainsMono_500Medium: {},
    JetBrainsMono_600SemiBold: {},
    JetBrainsMono_700Bold: {},
}));

jest.mock("expo-router", () => {
    const React = require("react");
    const { View } = require("react-native");
    const __mockRouterPush = jest.fn();
    return {
        __mockRouterPush,
        router: {
            push: __mockRouterPush,
        },
        Stack: () => React.createElement(View, { testID: "stack-mock" }),
    };
});

jest.mock("expo-linking", () => ({
    __mockParse: jest.fn(),
    __mockGetInitialURL: jest.fn(),
    __mockAddEventListener: jest.fn(),
    parse: jest.fn(),
    getInitialURL: jest.fn(),
    addEventListener: jest.fn(),
}));

jest.mock("expo-status-bar", () => ({
    StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        SafeAreaProvider: (props: { children?: React.ReactNode }) =>
            React.createElement(View, null, props.children),
    };
});

jest.mock("react-native-keyboard-controller", () => {
    const React = require("react");
    const { View } = require("react-native");
    return {
        KeyboardProvider: (props: { children?: React.ReactNode }) =>
            React.createElement(View, null, props.children),
    };
});

jest.mock("@/stores/settingsStore", () => ({
    useSettingsStore: () => mockSettingsState,
}));

import RootLayout from "../../app/_layout";

const {
    __mockPreventAutoHideAsync: mockPreventAutoHideAsync,
    __mockHideAsync: mockHideAsync,
    preventAutoHideAsync,
    hideAsync,
} = jest.requireMock("expo-splash-screen") as {
    __mockPreventAutoHideAsync: jest.Mock;
    __mockHideAsync: jest.Mock;
    preventAutoHideAsync: jest.Mock;
    hideAsync: jest.Mock;
};

const { __mockUseFonts: mockUseFonts, useFonts } = jest.requireMock("@expo-google-fonts/inter") as {
    __mockUseFonts: jest.Mock;
    useFonts: jest.Mock;
};

const { __mockRouterPush: mockRouterPush } = jest.requireMock("expo-router") as {
    __mockRouterPush: jest.Mock;
};

const {
    __mockParse: mockParse,
    __mockGetInitialURL: mockGetInitialURL,
    __mockAddEventListener: mockLinkingAddEventListener,
    parse,
    getInitialURL,
    addEventListener,
} = jest.requireMock("expo-linking") as {
    __mockParse: jest.Mock;
    __mockGetInitialURL: jest.Mock;
    __mockAddEventListener: jest.Mock;
    parse: jest.Mock;
    getInitialURL: jest.Mock;
    addEventListener: jest.Mock;
};

describe("app/_layout", () => {
    beforeEach(() => {
        mockPreventAutoHideAsync.mockClear();
        mockHideAsync.mockClear();
        preventAutoHideAsync.mockImplementation((...args: unknown[]) =>
            mockPreventAutoHideAsync(...args)
        );
        hideAsync.mockImplementation((...args: unknown[]) => mockHideAsync(...args));

        mockUseFonts.mockClear();
        useFonts.mockImplementation((...args: unknown[]) => mockUseFonts(...args));

        mockRouterPush.mockClear();

        mockParse.mockClear();
        mockGetInitialURL.mockClear();
        mockLinkingAddEventListener.mockClear();
        parse.mockImplementation((...args: unknown[]) => mockParse(...args));
        getInitialURL.mockImplementation((...args: unknown[]) => mockGetInitialURL(...args));
        addEventListener.mockImplementation((...args: unknown[]) =>
            mockLinkingAddEventListener(...args)
        );

        mockSettingsState.loadSettings.mockClear();

        mockSettingsState.isLoaded = false;

        mockUseFonts.mockReturnValue([false]);
        mockHideAsync.mockResolvedValue(undefined);
        mockPreventAutoHideAsync.mockResolvedValue(undefined);

        mockGetInitialURL.mockResolvedValue(null);

        mockParse.mockImplementation((url: string) => ({ path: url.replace("tangent://", "") }));

        mockLinkingAddEventListener.mockImplementation(() => ({
            remove: jest.fn(),
        }));
    });

    test("returns null when fonts or settings are not loaded", () => {
        mockUseFonts.mockReturnValue([false]);
        mockSettingsState.isLoaded = false;

        const { queryByTestId } = render(<RootLayout />);
        expect(queryByTestId("stack-mock")).toBeNull();
    });

    test("loads settings on mount", () => {
        mockUseFonts.mockReturnValue([true]);
        mockSettingsState.isLoaded = true;

        render(<RootLayout />);

        expect(mockSettingsState.loadSettings).toHaveBeenCalledTimes(1);
    });

    test("hides splash when settings become loaded", async () => {
        mockUseFonts.mockReturnValue([true]);
        mockSettingsState.isLoaded = true;

        render(<RootLayout />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });

    test("renders stack when ready", () => {
        mockUseFonts.mockReturnValue([true]);
        mockSettingsState.isLoaded = true;

        const { getByTestId } = render(<RootLayout />);
        expect(getByTestId("stack-mock")).toBeTruthy();
    });

    test("handles initial deep link to task highlight", async () => {
        mockUseFonts.mockReturnValue([true]);
        mockSettingsState.isLoaded = true;

        mockGetInitialURL.mockResolvedValueOnce("tangent://task/task_123");
        mockParse.mockReturnValueOnce({ path: "task/task_123" });

        render(<RootLayout />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockRouterPush).toHaveBeenCalledWith("/tasks?highlight=task_123");
    });

    test("handles URL event deep links and unsubscribes on unmount", async () => {
        let urlHandler: ((event: { url: string }) => void) | undefined;
        const remove = jest.fn();

        mockLinkingAddEventListener.mockImplementationOnce(
            (_type: string, cb: (event: { url: string }) => void) => {
                urlHandler = cb;
                return { remove };
            }
        );

        mockUseFonts.mockReturnValue([true]);
        mockSettingsState.isLoaded = true;
        mockGetInitialURL.mockResolvedValueOnce(null);

        const { unmount } = render(<RootLayout />);

        expect(urlHandler).toBeDefined();

        mockParse.mockReturnValueOnce({ path: "task/task_999" });
        urlHandler?.({ url: "tangent://task/task_999" });

        expect(mockRouterPush).toHaveBeenCalledWith("/tasks?highlight=task_999");

        unmount();
        expect(remove).toHaveBeenCalledTimes(1);
    });

    test("ignores non-task deep links", async () => {
        let urlHandler: ((event: { url: string }) => void) | undefined;

        mockLinkingAddEventListener.mockImplementationOnce(
            (_type: string, cb: (event: { url: string }) => void) => {
                urlHandler = cb;
                return { remove: jest.fn() };
            }
        );

        mockUseFonts.mockReturnValue([true]);
        mockSettingsState.isLoaded = true;

        render(<RootLayout />);

        mockParse.mockReturnValueOnce({ path: "settings" });
        urlHandler?.({ url: "tangent://settings" });

        expect(mockRouterPush).not.toHaveBeenCalled();
    });
});