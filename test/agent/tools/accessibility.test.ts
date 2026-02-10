jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("react-native", () => {
    const mockPlatform = { OS: "android" };

    const mockTangentAccessibility = {
        isEnabled: jest.fn(),
        openSettings: jest.fn(),
        getScreenContent: jest.fn(),
        tapElement: jest.fn(),
        tapAt: jest.fn(),
        typeText: jest.fn(),
        scroll: jest.fn(),
        pressBack: jest.fn(),
        pressHome: jest.fn(),
        openNotifications: jest.fn(),
    };

    return {
        Platform: mockPlatform,
        NativeModules: {
            TangentAccessibility: mockTangentAccessibility,
        },
        __mockPlatform: mockPlatform,
        __mockTangentAccessibility: mockTangentAccessibility,
    };
});

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

import "@/agent/tools/accessibility";
import { toolRegistry } from "@/agent/tools/registry";

const { __mockPlatform: mockPlatform, __mockTangentAccessibility: mockTA } = jest.requireMock(
    "react-native"
) as {
    __mockPlatform: { OS: string };
    __mockTangentAccessibility: {
        isEnabled: jest.Mock;
        openSettings: jest.Mock;
        getScreenContent: jest.Mock;
        tapElement: jest.Mock;
        tapAt: jest.Mock;
        typeText: jest.Mock;
        scroll: jest.Mock;
        pressBack: jest.Mock;
        pressHome: jest.Mock;
        openNotifications: jest.Mock;
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

describe("accessibility tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatform.OS = "android";
    });

    test("registers all accessibility tools", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        expect(tools.check_accessibility).toBeDefined();
        expect(tools.open_accessibility_settings).toBeDefined();
        expect(tools.get_screen).toBeDefined();
        expect(tools.tap).toBeDefined();
        expect(tools.tap_at).toBeDefined();
        expect(tools.type_text).toBeDefined();
        expect(tools.scroll).toBeDefined();
        expect(tools.press_back).toBeDefined();
        expect(tools.go_home).toBeDefined();
        expect(tools.open_notifications).toBeDefined();
        expect(tools.wait).toBeDefined();
    });

    test("check_accessibility handles non-android and enabled/disabled states", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const exec = getExecutor(tools, "check_accessibility");

        mockPlatform.OS = "ios";
        await expect(exec({})).resolves.toEqual({
            enabled: false,
            error: "Only available on Android",
        });

        mockPlatform.OS = "android";
        mockTA.isEnabled.mockResolvedValueOnce(true);
        await expect(exec({})).resolves.toEqual({
            enabled: true,
            message: "Accessibility service is enabled. You can now control the screen.",
        });

        mockTA.isEnabled.mockResolvedValueOnce(false);
        await expect(exec({})).resolves.toEqual({
            enabled: false,
            message:
                "Accessibility service is NOT enabled. Use open_accessibility_settings and ask the user to enable Tangent.",
        });
    });

    test("check_accessibility handles native errors", async () => {
        mockTA.isEnabled.mockRejectedValueOnce(new Error("boom"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "check_accessibility")({});

        expect(result).toEqual({
            enabled: false,
            error: "Failed to check: Error: boom",
        });
    });

    test("open_accessibility_settings success and failure", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const exec = getExecutor(tools, "open_accessibility_settings");

        mockTA.openSettings.mockResolvedValueOnce(undefined);
        await expect(exec({})).resolves.toEqual({
            success: true,
            message:
                "Opened accessibility settings. Ask the user to find 'Tangent' in the list and enable it.",
        });

        mockTA.openSettings.mockRejectedValueOnce(new Error("cannot open"));
        await expect(exec({})).resolves.toEqual({
            error: "Failed to open settings: Error: cannot open",
        });
    });

    test("get_screen filters/maps elements and limits to 50", async () => {
        const elements = Array.from({ length: 55 }).map((_, i) => ({
            id: `id-${i}`,
            class: `Class${i}`,
            text: i % 2 === 0 ? `Text ${i}` : "",
            description: i % 2 === 1 ? `Desc ${i}` : "",
            bounds: "[0,0][10,10]",
            centerX: 5,
            centerY: 5,
            clickable: i % 3 === 0,
            scrollable: i % 4 === 0,
            editable: i % 5 === 0,
            enabled: true,
        }));

        // Add one non-interactive empty element; should be filtered out.
        elements.push({
            id: "empty",
            class: "EmptyClass",
            text: "",
            description: "",
            bounds: "[0,0][1,1]",
            centerX: 0,
            centerY: 0,
            clickable: false,
            scrollable: false,
            editable: false,
            enabled: true,
        });

        mockTA.getScreenContent.mockResolvedValueOnce(
            JSON.stringify({
                packageName: "com.test.app",
                elements,
            })
        );

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = (await getExecutor(tools, "get_screen")({})) as {
            app: string;
            elementCount: number;
            elements: Array<{ text: string }>;
        };

        expect(result.app).toBe("com.test.app");
        expect(result.elementCount).toBe(55);
        expect(result.elements).toHaveLength(50);
        expect(result.elements[0]?.text).toBe("Text 0");
    });

    test("get_screen returns content error and parse failure", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const exec = getExecutor(tools, "get_screen");

        mockTA.getScreenContent.mockResolvedValueOnce(
            JSON.stringify({ packageName: "x", elements: [], error: "service unavailable" })
        );
        await expect(exec({})).resolves.toEqual({ error: "service unavailable" });

        mockTA.getScreenContent.mockResolvedValueOnce("not-json");
        const failed = (await exec({})) as { error: string };
        expect(failed.error).toContain("Failed:");
    });

    test("tap returns success/failure messages", async () => {
        mockTA.tapElement.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const exec = getExecutor(tools, "tap");

        await expect(exec({ target: "Send" })).resolves.toEqual({
            success: true,
            message: 'Tapped "Send"',
        });

        await expect(exec({ target: "Missing" })).resolves.toEqual({
            success: false,
            message: 'Could not find element "Missing"',
        });
    });

    test("tap_at, type_text, scroll map responses correctly", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        mockTA.tapAt.mockResolvedValueOnce(true);
        await expect(getExecutor(tools, "tap_at")({ x: 10, y: 20 })).resolves.toEqual({
            success: true,
            message: "Tapped at (10, 20)",
        });

        mockTA.typeText.mockResolvedValueOnce(false);
        await expect(getExecutor(tools, "type_text")({ text: "hello" })).resolves.toEqual({
            success: false,
            message: "No focused text field found. Tap a text field first.",
        });

        mockTA.scroll.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        await expect(getExecutor(tools, "scroll")({ direction: "up" })).resolves.toEqual({
            success: false,
            message: "No scrollable element found",
        });
        await expect(getExecutor(tools, "scroll")({ direction: "down" })).resolves.toEqual({
            success: true,
            message: "Scrolled down",
        });
    });

    test("press_back, go_home, open_notifications return success", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        mockTA.pressBack.mockResolvedValueOnce(true);
        await expect(getExecutor(tools, "press_back")({})).resolves.toEqual({
            success: true,
            message: "Pressed back",
        });

        mockTA.pressHome.mockResolvedValueOnce(true);
        await expect(getExecutor(tools, "go_home")({})).resolves.toEqual({
            success: true,
            message: "Went to home screen",
        });

        mockTA.openNotifications.mockResolvedValueOnce(true);
        await expect(getExecutor(tools, "open_notifications")({})).resolves.toEqual({
            success: true,
            message: "Opened notifications",
        });
    });

    test("wait resolves after given seconds", async () => {
        jest.useFakeTimers();

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const promise = getExecutor(tools, "wait")({ seconds: 2 });

        jest.advanceTimersByTime(2000);
        await expect(promise).resolves.toEqual({
            success: true,
            message: "Waited 2 second(s)",
        });

        jest.useRealTimers();
    });
});