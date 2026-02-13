import { z } from "zod";

const mockLog = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => mockLog),
    },
}));

jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

type RegistryModule = typeof import("@/agent/tools/registry");

function getExecutor(
    tools: Record<string, { execute?: unknown }>,
    name: string
): (args: unknown) => Promise<unknown> {
    const execute = tools[name]?.execute;
    if (typeof execute !== "function") {
        throw new Error(`Tool "${name}" does not expose execute()`);
    }
    return execute as (args: unknown) => Promise<unknown>;
}

function loadRegistry(): RegistryModule {
    jest.resetModules();

    let moduleRef: RegistryModule | undefined;
    jest.isolateModules(() => {
        moduleRef = jest.requireActual("@/agent/tools/registry") as RegistryModule;
    });

    if (!moduleRef) {
        throw new Error("Failed to load tool registry module");
    }

    return moduleRef;
}

describe("toolRegistry", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("register wraps execute and emits start/end events", async () => {
        const { toolRegistry } = loadRegistry();

        const listener = jest.fn();
        toolRegistry.onToolEvent(listener);

        toolRegistry.register("sum", {
            description: "adds two numbers",
            parameters: z.object({
                a: z.number(),
                b: z.number(),
            }),
            execute: async ({ a, b }) => a + b,
        });

        const tools = await toolRegistry.getTools();
        const result = await getExecutor(tools, "sum")({ a: 2, b: 3 });

        expect(result).toBe(5);
        expect(listener).toHaveBeenNthCalledWith(1, {
            type: "start",
            toolName: "sum",
            args: { a: 2, b: 3 },
        });
        expect(listener).toHaveBeenNthCalledWith(2, {
            type: "end",
            toolName: "sum",
            args: { a: 2, b: 3 },
            result: 5,
        });
    });

    test("unsubscribe returned by onToolEvent stops further notifications", async () => {
        const { toolRegistry } = loadRegistry();

        const listener = jest.fn();
        const unsubscribe = toolRegistry.onToolEvent(listener);

        toolRegistry.register("echo", {
            description: "echo input",
            parameters: z.object({ text: z.string() }),
            execute: async ({ text }) => text,
        });

        unsubscribe();

        const tools = await toolRegistry.getTools();
        await getExecutor(tools, "echo")({ text: "hello" });

        expect(listener).not.toHaveBeenCalled();
    });

    test("duplicate register overwrites previous tool and logs warning", async () => {
        const { toolRegistry } = loadRegistry();

        toolRegistry.register("mode", {
            description: "first",
            parameters: z.object({}),
            execute: async () => "first",
        });

        toolRegistry.register("mode", {
            description: "second",
            parameters: z.object({}),
            execute: async () => "second",
        });

        const tools = await toolRegistry.getTools();
        const result = await getExecutor(tools, "mode")({});

        expect(result).toBe("second");
        expect(mockLog.warn).toHaveBeenCalledWith(
            expect.stringContaining('Tool "mode" already registered')
        );
    });

    test("initialize runs loaders once and tolerates loader failures", async () => {
        const { toolRegistry } = loadRegistry();

        const failingLoader = jest.fn(async () => {
            throw new Error("loader failed");
        });

        const successfulLoader = jest.fn(async () => {
            toolRegistry.register("loaded_tool", {
                description: "loaded",
                parameters: z.object({}),
                execute: async () => "ok",
            });
        });

        toolRegistry.registerLoader(failingLoader);
        toolRegistry.registerLoader(successfulLoader);

        const toolsFirst = await toolRegistry.getTools();
        const toolsSecond = await toolRegistry.getTools();

        expect(failingLoader).toHaveBeenCalledTimes(1);
        expect(successfulLoader).toHaveBeenCalledTimes(1);
        expect(toolsFirst.loaded_tool).toBeDefined();
        expect(toolsSecond.loaded_tool).toBeDefined();
        expect(mockLog.warn).toHaveBeenCalledWith(
            expect.stringContaining("Tool loader 0 failed:"),
            expect.any(Error)
        );
    });

    test("has and getNames reflect current registry state", async () => {
        const { toolRegistry } = loadRegistry();

        toolRegistry.register("alpha", {
            description: "alpha",
            parameters: z.object({}),
            execute: async () => "a",
        });

        toolRegistry.register("beta", {
            description: "beta",
            parameters: z.object({}),
            execute: async () => "b",
        });

        expect(toolRegistry.has("alpha")).toBe(true);
        expect(toolRegistry.has("beta")).toBe(true);
        expect(toolRegistry.has("gamma")).toBe(false);
        expect(toolRegistry.getNames()).toEqual(["alpha", "beta"]);
    });

    test("execute errors are rethrown and only start event is emitted", async () => {
        const { toolRegistry } = loadRegistry();

        const listener = jest.fn();
        toolRegistry.onToolEvent(listener);

        toolRegistry.register("explode", {
            description: "always throws",
            parameters: z.object({}),
            execute: async () => {
                throw new Error("boom");
            },
        });

        const tools = await toolRegistry.getTools();
        await expect(getExecutor(tools, "explode")({})).rejects.toThrow("boom");

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({
            type: "start",
            toolName: "explode",
            args: {},
        });
        expect(mockLog.error).toHaveBeenCalledWith(
            expect.stringContaining("Tool explode failed"),
            expect.any(Error)
        );
    });
});
