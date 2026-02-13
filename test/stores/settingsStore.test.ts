jest.mock("expo-secure-store", () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
}));

jest.mock("@/lib/logger", () => {
    const mockSettingsLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };

    return {
        logger: {
            create: jest.fn(() => mockSettingsLogger),
        },
        __mockSettingsLogger: mockSettingsLogger,
    };
});

import { useSettingsStore } from "@/stores/settingsStore";

const { getItemAsync: mockGetItemAsync, setItemAsync: mockSetItemAsync } = jest.requireMock(
    "expo-secure-store"
) as {
    getItemAsync: jest.Mock;
    setItemAsync: jest.Mock;
};

const { __mockSettingsLogger: mockSettingsLogger } = jest.requireMock("@/lib/logger") as {
    __mockSettingsLogger: {
        debug: jest.Mock;
        info: jest.Mock;
        warn: jest.Mock;
        error: jest.Mock;
    };
};

describe("useSettingsStore", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useSettingsStore.setState({
            geminiApiKey: null,
            isLoaded: false,
        });
    });

    test("starts with null key and not loaded", () => {
        expect(useSettingsStore.getState()).toMatchObject({
            geminiApiKey: null,
            isLoaded: false,
        });
    });

    test("loadSettings stores key and marks loaded when key exists", async () => {
        mockGetItemAsync.mockResolvedValueOnce("secret-key");

        await useSettingsStore.getState().loadSettings();

        expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
        expect(useSettingsStore.getState()).toMatchObject({
            geminiApiKey: "secret-key",
            isLoaded: true,
        });
        expect(mockSettingsLogger.debug).toHaveBeenCalledWith("Loading settings from SecureStore");
        expect(mockSettingsLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("API key: present")
        );
    });

    test("loadSettings handles missing key", async () => {
        mockGetItemAsync.mockResolvedValueOnce(null);

        await useSettingsStore.getState().loadSettings();

        expect(useSettingsStore.getState()).toMatchObject({
            geminiApiKey: null,
            isLoaded: true,
        });
        expect(mockSettingsLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("API key: not set")
        );
    });

    test("loadSettings swallows read errors and marks loaded", async () => {
        const error = new Error("secure store read failed");
        mockGetItemAsync.mockRejectedValueOnce(error);

        await expect(useSettingsStore.getState().loadSettings()).resolves.toBeUndefined();

        expect(useSettingsStore.getState()).toMatchObject({
            geminiApiKey: null,
            isLoaded: true,
        });
        expect(mockSettingsLogger.error).toHaveBeenCalledWith("Failed to load settings", error);
    });

    test("setGeminiApiKey saves key and updates state", async () => {
        mockSetItemAsync.mockResolvedValueOnce(undefined);

        await useSettingsStore.getState().setGeminiApiKey("new-key");

        expect(mockSetItemAsync).toHaveBeenCalledTimes(1);
        expect(mockSetItemAsync.mock.calls[0]?.[1]).toBe("new-key");
        expect(useSettingsStore.getState().geminiApiKey).toBe("new-key");
        expect(mockSettingsLogger.debug).toHaveBeenCalledWith("Saving Gemini API key");
        expect(mockSettingsLogger.info).toHaveBeenCalledWith("Gemini API key saved successfully");
    });

    test("setGeminiApiKey rethrows save errors and keeps previous state", async () => {
        useSettingsStore.setState({ geminiApiKey: "old-key", isLoaded: true });

        const error = new Error("secure store write failed");
        mockSetItemAsync.mockRejectedValueOnce(error);

        await expect(useSettingsStore.getState().setGeminiApiKey("new-key")).rejects.toBe(error);

        expect(useSettingsStore.getState().geminiApiKey).toBe("old-key");
        expect(mockSettingsLogger.error).toHaveBeenCalledWith(
            "Failed to save Gemini API key",
            error
        );
    });

    test("uses same storage key for load and save", async () => {
        mockGetItemAsync.mockResolvedValueOnce(null);
        mockSetItemAsync.mockResolvedValueOnce(undefined);

        await useSettingsStore.getState().loadSettings();
        await useSettingsStore.getState().setGeminiApiKey("k");

        const loadKey = mockGetItemAsync.mock.calls[0]?.[0];
        const saveKey = mockSetItemAsync.mock.calls[0]?.[0];

        expect(saveKey).toBe(loadKey);
    });
});
