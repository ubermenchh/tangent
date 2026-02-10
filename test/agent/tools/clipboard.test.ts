jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("expo-clipboard", () => ({
    getStringAsync: jest.fn(),
    setStringAsync: jest.fn(),
}));

jest.mock("@/lib/logger", () => {
    const mockLog = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };

    return {
        logger: {
            create: jest.fn(() => mockLog),
        },
        __mockLog: mockLog,
    };
});

import "@/agent/tools/clipboard";
import { toolRegistry } from "@/agent/tools/registry";

const { getStringAsync: mockGetStringAsync, setStringAsync: mockSetStringAsync } =
    jest.requireMock("expo-clipboard") as {
        getStringAsync: jest.Mock;
        setStringAsync: jest.Mock;
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

describe("clipboard tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("registers get_clipboard and set_clipboard", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        expect(tools.get_clipboard).toBeDefined();
        expect(tools.set_clipboard).toBeDefined();
    });

    test("get_clipboard returns clipboard content", async () => {
        mockGetStringAsync.mockResolvedValueOnce("hello world");

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_clipboard")({});

        expect(mockGetStringAsync).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            success: true,
            content: "hello world",
        });
    });

    test("get_clipboard returns (empty) when clipboard is empty", async () => {
        mockGetStringAsync.mockResolvedValueOnce("");

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_clipboard")({});

        expect(result).toEqual({
            success: true,
            content: "(empty)",
        });
    });

    test("get_clipboard handles read failures", async () => {
        mockGetStringAsync.mockRejectedValueOnce(new Error("read failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_clipboard")({});

        expect(result).toEqual({
            success: false,
            error: "Failed to read clipboard",
        });
    });

    test("set_clipboard copies text successfully", async () => {
        mockSetStringAsync.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "set_clipboard")({ text: "copied text" });

        expect(mockSetStringAsync).toHaveBeenCalledWith("copied text");
        expect(result).toEqual({
            success: true,
            message: "Copied to clipboard",
        });
    });

    test("set_clipboard handles copy failures", async () => {
        mockSetStringAsync.mockRejectedValueOnce(new Error("write failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "set_clipboard")({ text: "x" });

        expect(result).toEqual({
            success: false,
            error: "Failed to copy to clipboard",
        });
    });
});