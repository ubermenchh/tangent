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

describe("phone tools (part 2)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatform.OS = "android";
    });

    test("navigate_to opens native google navigation URL", async () => {
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "navigate_to")({
            destination: "Times Square, New York",
            mode: "walking",
        });

        expect(mockOpenURL).toHaveBeenCalledWith(
            "google.navigation:q=Times%20Square%2C%20New%20York&mode=walking"
        );
        expect(result).toEqual({
            success: true,
            message: "Starting walking navigation to Times Square, New York",
        });
    });

    test("navigate_to falls back to web maps URL when native fails", async () => {
        mockOpenURL
            .mockRejectedValueOnce(new Error("native fail"))
            .mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "navigate_to")({
            destination: "MG Road Bengaluru",
            mode: "driving",
        });

        expect(mockOpenURL).toHaveBeenNthCalledWith(
            1,
            "google.navigation:q=MG%20Road%20Bengaluru&mode=driving"
        );
        expect(mockOpenURL).toHaveBeenNthCalledWith(
            2,
            "https://www.google.com/maps/dir/?api=1&destination=MG%20Road%20Bengaluru&travelmode=driving"
        );
        expect(result).toEqual({
            success: true,
            message: "Opening directions to MG Road Bengaluru",
        });
    });

    test("send_whatsapp formats phone/message and opens whatsapp URL", async () => {
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_whatsapp")({
            phoneNumber: "+1 (234) 567-8900",
            message: "hello there",
        });

        expect(mockOpenURL).toHaveBeenCalledWith(
            "whatsapp://send?phone=12345678900&text=hello%20there"
        );
        expect(result).toEqual({
            success: true,
            message: "Opened WhatsApp chat with +1 (234) 567-8900",
        });
    });

    test("send_whatsapp works without optional message", async () => {
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_whatsapp")({
            phoneNumber: "+91-9876543210",
        });

        expect(mockOpenURL).toHaveBeenCalledWith("whatsapp://send?phone=919876543210");
        expect(result).toEqual({
            success: true,
            message: "Opened WhatsApp chat with +91-9876543210",
        });
    });

    test("send_whatsapp returns failure when URL open throws", async () => {
        mockOpenURL.mockRejectedValueOnce(new Error("not installed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "send_whatsapp")({
            phoneNumber: "+1234567890",
            message: "hi",
        });

        expect(result).toEqual({
            success: false,
            error: "WhatsApp not installed or couldn't open",
        });
    });

    test("search_youtube opens app URL first", async () => {
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_youtube")({
            query: "lofi beats",
        });

        expect(mockOpenURL).toHaveBeenCalledWith(
            "youtube://results?search_query=lofi%20beats"
        );
        expect(result).toEqual({
            success: true,
            message: 'Searching YouTube for "lofi beats"',
        });
    });

    test("search_youtube falls back to browser when app URL fails", async () => {
        mockOpenURL
            .mockRejectedValueOnce(new Error("app unavailable"))
            .mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_youtube")({
            query: "mix",
        });

        expect(mockOpenURL).toHaveBeenNthCalledWith(
            1,
            "youtube://results?search_query=mix"
        );
        expect(mockOpenURL).toHaveBeenNthCalledWith(
            2,
            "https://www.youtube.com/results?search_query=mix"
        );
        expect(result).toEqual({
            success: true,
            message: 'Searching YouTube for "mix" in browser',
        });
    });

    test("return_to_tangent succeeds via native launch on android", async () => {
        mockTA.launchApp.mockResolvedValueOnce(true);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "return_to_tangent")({});

        expect(mockTA.launchApp).toHaveBeenCalledWith("com.ubermenchh.tangent");
        expect(result).toEqual({
            success: true,
            message: "Returned to Tangent",
        });
        expect(mockOpenURL).not.toHaveBeenCalledWith("tangent://");
    });

    test("return_to_tangent falls back to deep link when native launch fails", async () => {
        mockTA.launchApp.mockResolvedValueOnce(false);
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "return_to_tangent")({});

        expect(mockOpenURL).toHaveBeenCalledWith("tangent://");
        expect(result).toEqual({
            success: true,
            message: "Returned to Tangent",
        });
    });

    test("return_to_tangent returns failure when deep link fallback also fails", async () => {
        mockTA.launchApp.mockRejectedValueOnce(new Error("native fail"));
        mockOpenURL.mockRejectedValueOnce(new Error("deep link fail"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "return_to_tangent")({});

        expect(result).toEqual({
            success: false,
            message: "Could not return to Tangent",
        });
    });

    test("return_to_tangent uses deep link path directly on non-android", async () => {
        mockPlatform.OS = "ios";
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "return_to_tangent")({});

        expect(mockTA.launchApp).not.toHaveBeenCalled();
        expect(mockOpenURL).toHaveBeenCalledWith("tangent://");
        expect(result).toEqual({
            success: true,
            message: "Returned to Tangent",
        });
    });
});