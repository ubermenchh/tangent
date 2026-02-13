import React from "react";
import { fireEvent, render, waitFor, act } from "@testing-library/react-native";
import { TouchableOpacity, PermissionsAndroid, Linking } from "react-native";

import SettingsScreen from "../../app/settings";

type RenderNode = {
    parent: RenderNode | null;
    props: Record<string, unknown>;
};

function findPressableAncestor(node: RenderNode | null): RenderNode | null {
    let current = node;
    while (current && typeof current.props.onPress !== "function") {
        current = current.parent;
    }
    return current;
}

async function renderSettingsScreen() {
    const utils = render(<SettingsScreen />);
    await act(async () => {
        await Promise.resolve();
    });
    return utils;
}

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockSetGeminiApiKey = jest.fn();
const mockGetIndexStats = jest.fn();

let mockCanGoBack = true;
let mockGeminiApiKey: string | null = null;

jest.mock("expo-router", () => ({
    useRouter: () => ({
        canGoBack: () => mockCanGoBack,
        back: (...args: unknown[]) => mockBack(...args),
        replace: (...args: unknown[]) => mockReplace(...args),
    }),
}));

jest.mock("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-contacts", () => ({
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
}));

jest.mock("@/stores/settingsStore", () => ({
    useSettingsStore: () => ({
        geminiApiKey: mockGeminiApiKey,
        setGeminiApiKey: (...args: unknown[]) => mockSetGeminiApiKey(...args),
    }),
}));

jest.mock("@/index/manager", () => ({
    buildIndex: jest.fn(),
    getIndexStats: (...args: unknown[]) => mockGetIndexStats(...args),
    clearIndex: jest.fn(),
}));

const { buildIndex: mockBuildIndex, clearIndex: mockClearIndex } = jest.requireMock(
    "@/index/manager"
) as {
    buildIndex: jest.Mock;
    clearIndex: jest.Mock;
};

const mockContacts = jest.requireMock("expo-contacts") as {
    getPermissionsAsync: jest.Mock;
    requestPermissionsAsync: jest.Mock;
};

const mockAlert = jest.fn();
const globalWithAlert = global as typeof globalThis & { alert?: jest.Mock };

jest.mock("lucide-react-native", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Icon = () => React.createElement(View);
    return new Proxy({}, { get: () => Icon });
});

describe("app/settings (batch 1)", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockCanGoBack = true;
        mockGeminiApiKey = null;
        mockSetGeminiApiKey.mockResolvedValue(undefined);
        mockGetIndexStats.mockReturnValue({ count: 0, lastUpdated: null });

        mockBuildIndex.mockResolvedValue(undefined);
        mockClearIndex.mockImplementation(() => undefined);

        mockContacts.getPermissionsAsync.mockResolvedValue({ granted: true });
        mockContacts.requestPermissionsAsync.mockResolvedValue({
            granted: true,
            canAskAgain: true,
        });

        jest.spyOn(Linking, "openSettings").mockResolvedValue();
        globalWithAlert.alert = mockAlert;
        mockAlert.mockReset();

        jest.spyOn(PermissionsAndroid, "check").mockResolvedValue(false);
        jest.spyOn(PermissionsAndroid, "request").mockResolvedValue(
            PermissionsAndroid.RESULTS.DENIED
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("renders settings header and api key input", async () => {
        const { getByText, getByPlaceholderText } = await renderSettingsScreen();

        expect(getByText("Settings")).toBeTruthy();
        expect(getByText("Gemini API Key")).toBeTruthy();
        expect(getByPlaceholderText("Enter your Gemini API key...")).toBeTruthy();
    });

    test("disables save button when there are no changes", async () => {
        mockGeminiApiKey = "same-key";

        const { getByText } = await renderSettingsScreen();
        const saveText = getByText("Save API Key");
        const saveButton = findPressableAncestor(saveText as unknown as RenderNode);

        expect(saveButton?.props.disabled).toBe(true);
    });

    test("enables save button and saves trimmed api key", async () => {
        jest.useFakeTimers();
        mockGeminiApiKey = "";

        const { getByPlaceholderText, getByText } = await renderSettingsScreen();
        const input = getByPlaceholderText("Enter your Gemini API key...");

        fireEvent.changeText(input, "  new-key  ");
        fireEvent.press(getByText("Save API Key"));

        await waitFor(() => {
            expect(mockSetGeminiApiKey).toHaveBeenCalledWith("new-key");
        });

        act(() => {
            jest.runOnlyPendingTimers();
        });
    });

    test("shows Saved! feedback and resets after timeout", async () => {
        jest.useFakeTimers();

        const { getByPlaceholderText, getByText, queryByText } = await renderSettingsScreen();
        const input = getByPlaceholderText("Enter your Gemini API key...");

        fireEvent.changeText(input, "abc123");
        fireEvent.press(getByText("Save API Key"));

        await waitFor(() => {
            expect(getByText("Saved!")).toBeTruthy();
        });

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(queryByText("Saved!")).toBeNull();
        expect(getByText("Save API Key")).toBeTruthy();
    });

    test("back button calls router.back when canGoBack is true", async () => {
        mockCanGoBack = true;

        const { UNSAFE_getAllByType } = await renderSettingsScreen();
        const touchables = UNSAFE_getAllByType(TouchableOpacity);

        fireEvent.press(touchables[0]);

        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(mockReplace).not.toHaveBeenCalled();
    });

    test('back button calls router.replace("/") when canGoBack is false', async () => {
        mockCanGoBack = false;

        const { UNSAFE_getAllByType } = await renderSettingsScreen();
        const touchables = UNSAFE_getAllByType(TouchableOpacity);

        fireEvent.press(touchables[0]);

        expect(mockBack).not.toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith("/");
    });

    test("renders index stats with formatted last updated value", async () => {
        const dateSpy = jest
            .spyOn(Date.prototype, "toLocaleDateString")
            .mockReturnValue("Mock Date");

        mockGetIndexStats.mockReturnValue({ count: 12, lastUpdated: 1700000000000 });

        const { getByText } = await renderSettingsScreen();

        expect(getByText("12")).toBeTruthy();
        expect(getByText("Mock Date")).toBeTruthy();

        dateSpy.mockRestore();
    });

    test("starts indexing when api key exists and refreshes stats", async () => {
        mockGeminiApiKey = "key-1";

        const originalRaf = (
            global as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }
        ).requestAnimationFrame;

        (
            global as unknown as { requestAnimationFrame: (cb: (t: number) => void) => number }
        ).requestAnimationFrame = cb => {
            cb(0);
            return 0;
        };

        const { getByText } = await renderSettingsScreen();

        fireEvent.press(getByText("Start Indexing"));

        await waitFor(() => {
            expect(mockBuildIndex).toHaveBeenCalledWith("key-1", undefined, expect.any(Function));
        });

        // initial refresh + post-index refresh
        expect(mockGetIndexStats.mock.calls.length).toBeGreaterThanOrEqual(2);

        (
            global as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }
        ).requestAnimationFrame = originalRaf;
    });

    test("shows alert when indexing fails", async () => {
        mockGeminiApiKey = "key-2";
        mockBuildIndex.mockRejectedValueOnce(new Error("boom"));

        const originalRaf = (
            global as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }
        ).requestAnimationFrame;

        (
            global as unknown as { requestAnimationFrame: (cb: (t: number) => void) => number }
        ).requestAnimationFrame = cb => {
            cb(0);
            return 0;
        };

        const { getByText } = await renderSettingsScreen();
        fireEvent.press(getByText("Start Indexing"));

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith("Indexing failed: boom");
        });

        (
            global as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }
        ).requestAnimationFrame = originalRaf;
    });

    test("clear index button calls clearIndex and refreshes stats", async () => {
        mockGetIndexStats.mockReturnValue({ count: 4, lastUpdated: null });

        const { UNSAFE_getAllByType } = await renderSettingsScreen();
        const touchables = UNSAFE_getAllByType(TouchableOpacity);

        const clearButton = touchables.find(
            t =>
                typeof t.props.className === "string" &&
                t.props.className.includes("bg-tokyo-red/20")
        );

        expect(clearButton).toBeTruthy();
        fireEvent.press(clearButton!);

        expect(mockClearIndex).toHaveBeenCalledTimes(1);
        expect(mockGetIndexStats.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    test("sms grant path opens settings on never_ask_again", async () => {
        (
            PermissionsAndroid.request as jest.MockedFunction<typeof PermissionsAndroid.request>
        ).mockResolvedValueOnce(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

        const { getByText } = await renderSettingsScreen();

        fireEvent.press(getByText("Grant"));

        await waitFor(() => {
            expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
            expect(Linking.openSettings).toHaveBeenCalledTimes(1);
        });
    });

    test("contacts grant path opens settings when denied and cannot ask again", async () => {
        // Make SMS already granted so only Contacts shows Grant
        (
            PermissionsAndroid.check as jest.MockedFunction<typeof PermissionsAndroid.check>
        ).mockResolvedValueOnce(true);

        mockContacts.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
        mockContacts.requestPermissionsAsync.mockResolvedValueOnce({
            granted: false,
            canAskAgain: false,
        });

        const { getByText } = await renderSettingsScreen();
        fireEvent.press(getByText("Grant"));

        await waitFor(() => {
            expect(mockContacts.requestPermissionsAsync).toHaveBeenCalledTimes(1);
            expect(Linking.openSettings).toHaveBeenCalledTimes(1);
        });
    });
});
