jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("react-native", () => {
    const mockPlatform = { OS: "android" };

    const mockTA = {
        launchApp: jest.fn(),
        getScreenContent: jest.fn(),
    };

    return {
        Platform: mockPlatform,
        NativeModules: {
            TangentAccessibility: mockTA,
        },
        __mockPlatform: mockPlatform,
        __mockTA: mockTA,
    };
});

jest.mock("expo-linking", () => ({
    openURL: jest.fn(),
}));

jest.mock("@/lib/appState", () => ({
    suppressBackgroundEscalation: jest.fn(),
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

import "@/agent/tools/phone";
import { toolRegistry } from "@/agent/tools/registry";

const { openURL: mockOpenURL } = jest.requireMock("expo-linking") as {
    openURL: jest.Mock;
};

const { suppressBackgroundEscalation: mockSuppressBackgroundEscalation } = jest.requireMock(
    "@/lib/appState"
) as {
    suppressBackgroundEscalation: jest.Mock;
};

const { __mockPlatform: mockPlatform, __mockTA: mockTA } = jest.requireMock("react-native") as {
    __mockPlatform: { OS: string };
    __mockTA: {
        launchApp: jest.Mock;
        getScreenContent: jest.Mock;
    };
};

function getExecutor(
    tools: Record<string, { execute?: unknown }>,
    name: string
): (args: Record<string, unknown>) => Promise<unknown> {
    const execute = tools[name]?.execute;
    if (typeof execute !== "function") {
        throw new Error(`Tool "${name}" does not expose execute()`);
    }
    return execute as (args: Record<string, unknown>) => Promise<unknown>;
}

describe("phone tools (part 1)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatform.OS = "android";
    });

    test("registers open_app and open_url", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        expect(tools.open_app).toBeDefined();
        expect(tools.open_url).toBeDefined();
    });

    test("open_app succeeds via native launch and foreground verification", async () => {
        mockTA.launchApp.mockResolvedValueOnce(true);
        mockTA.getScreenContent.mockResolvedValueOnce(
            JSON.stringify({
                packageName: "com.instagram.android",
                elements: [],
            })
        );

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_app")({ app: "instagram" });

        expect(mockSuppressBackgroundEscalation).toHaveBeenCalledWith(30000);
        expect(mockTA.launchApp).toHaveBeenCalledWith("com.instagram.android");
        expect(result).toEqual({
            success: true,
            message: "Opened instagram",
        });
        expect(mockOpenURL).not.toHaveBeenCalledWith(expect.stringContaining("market://"));
    });

    test("open_app falls back to scheme when native launch returns false", async () => {
        mockTA.launchApp.mockResolvedValueOnce(false);
        mockOpenURL.mockResolvedValueOnce(undefined);
        
        // Exit verification loop on first poll
        mockTA.getScreenContent.mockResolvedValueOnce(
            JSON.stringify({
                packageName: "com.google.android.youtube",
                elements: [],
            })
        );
    
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_app")({ app: "youtube" });
    
        expect(mockTA.launchApp).toHaveBeenCalledWith("com.google.android.youtube");
        expect(mockOpenURL).toHaveBeenCalledWith("youtube://");
        expect(result).toEqual({
            success: true,
            message: "Opened youtube",
        });
    });

    test("open_app falls back to Play Store when native+scheme fail", async () => {
        mockTA.launchApp.mockResolvedValueOnce(false);
        mockOpenURL
            .mockRejectedValueOnce(new Error("scheme failed")) // scheme: spotify://
            .mockResolvedValueOnce(undefined); // store fallback

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_app")({ app: "spotify" });

        expect(mockOpenURL).toHaveBeenCalledWith("spotify://");
        expect(mockOpenURL).toHaveBeenCalledWith("market://details?id=com.spotify.music");
        expect(result).toEqual({
            success: true,
            message: "Opened store page for spotify (app may not be installed)",
        });
    });

    test("open_app returns failure when all strategies fail", async () => {
        mockTA.launchApp.mockResolvedValueOnce(false);
        mockOpenURL
            .mockRejectedValueOnce(new Error("scheme failed")) // twitter://
            .mockRejectedValueOnce(new Error("store failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_app")({ app: "twitter" });

        expect(result).toEqual({
            success: false,
            message: "Could not open twitter",
        });
    });

    test("open_app handles non-mapped app names by package input", async () => {
        mockTA.launchApp.mockResolvedValueOnce(false);
        mockOpenURL.mockResolvedValueOnce(undefined); // store open by raw app id/name

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_app")({
            app: "com.custom.app",
        });

        expect(mockTA.launchApp).toHaveBeenCalledWith("com.custom.app");
        expect(mockOpenURL).toHaveBeenCalledWith("market://details?id=com.custom.app");
        expect(result).toEqual({
            success: true,
            message: "Opened store page for com.custom.app (app may not be installed)",
        });
    });

    test("open_url normalizes url when protocol missing", async () => {
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_url")({
            url: "example.com",
        });

        expect(mockOpenURL).toHaveBeenCalledWith("https://example.com");
        expect(result).toEqual({
            success: true,
            message: "Opened https://example.com",
        });
    });

    test("open_url keeps existing protocol and handles failures", async () => {
        mockOpenURL
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error("cannot open"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const exec = getExecutor(tools, "open_url");

        await expect(exec({ url: "http://plain-http.com" })).resolves.toEqual({
            success: true,
            message: "Opened http://plain-http.com",
        });

        await expect(exec({ url: "https://broken.example" })).resolves.toEqual({
            success: false,
            error: "Failed to open URL",
        });
    });

    test("open_app skips native launch on non-android and uses scheme/store", async () => {
        mockPlatform.OS = "ios";
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "open_app")({ app: "whatsapp" });

        expect(mockTA.launchApp).not.toHaveBeenCalled();
        expect(mockOpenURL).toHaveBeenCalledWith("whatsapp://");
        expect(result).toEqual({
            success: true,
            message: "Opened whatsapp (could not verify foreground)",
        });
    });
});