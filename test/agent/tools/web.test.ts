jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

const mockWebLog = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => mockWebLog),
    },
}));

const mockExaSearch = jest.fn();
const mockExaFindSimilar = jest.fn();
const mockExaGetContents = jest.fn();
const mockExaConstructor = jest.fn().mockImplementation(() => ({
    search: (...args: unknown[]) => mockExaSearch(...args),
    findSimilar: (...args: unknown[]) => mockExaFindSimilar(...args),
    getContents: (...args: unknown[]) => mockExaGetContents(...args),
}));

jest.mock("exa-js", () => ({
    __esModule: true,
    default: mockExaConstructor,
}));

type RegistryModule = typeof import("@/agent/tools/registry");

function loadWebTools(apiKey?: string): RegistryModule["toolRegistry"] {
    jest.resetModules();

    if (apiKey === undefined) {
        delete process.env.EXPO_PUBLIC_EXA_API_KEY;
    } else {
        process.env.EXPO_PUBLIC_EXA_API_KEY = apiKey;
    }

    let registryModule: RegistryModule | undefined;
    jest.isolateModules(() => {
        jest.requireActual("@/agent/tools/web");
        registryModule = jest.requireActual("@/agent/tools/registry") as RegistryModule;
    });

    if (!registryModule) {
        throw new Error("Failed to load web tools");
    }

    return registryModule.toolRegistry;
}

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

describe("web tools", () => {
    const originalExaApiKey = process.env.EXPO_PUBLIC_EXA_API_KEY;

    afterEach(() => {
        if (originalExaApiKey === undefined) {
            delete process.env.EXPO_PUBLIC_EXA_API_KEY;
        } else {
            process.env.EXPO_PUBLIC_EXA_API_KEY = originalExaApiKey;
        }
        jest.clearAllMocks();
    });

    test("registers web tools", async () => {
        const toolRegistry = loadWebTools("exa-key-1");
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        expect(tools.web_search).toBeDefined();
        expect(tools.find_similar).toBeDefined();
        expect(tools.get_page_content).toBeDefined();
        expect(mockExaConstructor).toHaveBeenCalledWith("exa-key-1");
    });

    test("web_search returns API key error when key is missing", async () => {
        const toolRegistry = loadWebTools();
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        const result = await getExecutor(
            tools,
            "web_search"
        )({
            query: "latest ai news",
        });

        expect(result).toEqual({ error: "Exa API key not configured" });
        expect(mockExaSearch).not.toHaveBeenCalled();
    });

    test("web_search maps successful results and trims text", async () => {
        mockExaSearch.mockResolvedValueOnce({
            results: [
                {
                    title: "AI article",
                    url: "https://example.com/ai",
                    summary: "summary text",
                    publishedDate: "2026-02-10",
                    text: "x".repeat(700),
                },
            ],
        });

        const toolRegistry = loadWebTools("exa-key-2");
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        const result = (await getExecutor(
            tools,
            "web_search"
        )({
            query: "ai article",
            type: "neural",
            numResults: 3,
            category: "news",
        })) as {
            results: Array<{
                title: string;
                url: string;
                summary: string;
                publishedDate: string;
                text: string;
            }>;
        };

        expect(mockExaSearch).toHaveBeenCalledWith("ai article", {
            type: "neural",
            numResults: 3,
            category: "news",
            contents: {
                text: { maxCharacters: 1000 },
                summary: true,
            },
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toMatchObject({
            title: "AI article",
            url: "https://example.com/ai",
            summary: "summary text",
            publishedDate: "2026-02-10",
        });
        expect(result.results[0].text).toHaveLength(500);
    });

    test("web_search returns formatted error when search throws", async () => {
        mockExaSearch.mockRejectedValueOnce(new Error("search down"));

        const toolRegistry = loadWebTools("exa-key-3");
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        const result = await getExecutor(
            tools,
            "web_search"
        )({
            query: "ai",
        });

        expect(result).toEqual({ error: "Search failed: Error: search down" });
    });

    test("find_similar returns API key error when key is missing", async () => {
        const toolRegistry = loadWebTools();
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        const result = await getExecutor(
            tools,
            "find_similar"
        )({
            url: "https://example.com",
        });

        expect(result).toEqual({ error: "Exa API key not configured" });
        expect(mockExaFindSimilar).not.toHaveBeenCalled();
    });

    test("find_similar maps successful results", async () => {
        mockExaFindSimilar.mockResolvedValueOnce({
            results: [
                { title: "One", url: "https://one.com", summary: "s1" },
                { title: "Two", url: "https://two.com", summary: "s2" },
            ],
        });

        const toolRegistry = loadWebTools("exa-key-4");
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        const result = await getExecutor(
            tools,
            "find_similar"
        )({
            url: "https://seed.com",
            numResults: 2,
        });

        expect(mockExaFindSimilar).toHaveBeenCalledWith("https://seed.com", {
            numResults: 2,
            contents: {
                text: { maxCharacters: 500 },
                summary: true,
            },
        });

        expect(result).toEqual({
            results: [
                { title: "One", url: "https://one.com", summary: "s1" },
                { title: "Two", url: "https://two.com", summary: "s2" },
            ],
        });
    });

    test("get_page_content returns API key error when key is missing", async () => {
        const toolRegistry = loadWebTools();
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;

        const result = await getExecutor(
            tools,
            "get_page_content"
        )({
            url: "https://example.com",
        });

        expect(result).toEqual({ error: "Exa API key not configured" });
        expect(mockExaGetContents).not.toHaveBeenCalled();
    });

    test("get_page_content returns mapped first page and handles failure", async () => {
        mockExaGetContents.mockResolvedValueOnce({
            results: [
                {
                    title: "Page",
                    url: "https://example.com/page",
                    summary: "Page summary",
                    text: "Full text",
                },
            ],
        });

        const toolRegistryA = loadWebTools("exa-key-5");
        const toolsA = (await toolRegistryA.getTools()) as Record<string, { execute?: unknown }>;
        const ok = await getExecutor(
            toolsA,
            "get_page_content"
        )({
            url: "https://example.com/page",
        });

        expect(mockExaGetContents).toHaveBeenCalledWith(["https://example.com/page"], {
            text: { maxCharacters: 5000 },
            summary: true,
        });
        expect(ok).toEqual({
            title: "Page",
            url: "https://example.com/page",
            summary: "Page summary",
            content: "Full text",
        });

        mockExaGetContents.mockRejectedValueOnce(new Error("content failed"));

        const toolRegistryB = loadWebTools("exa-key-6");
        const toolsB = (await toolRegistryB.getTools()) as Record<string, { execute?: unknown }>;
        const failed = await getExecutor(
            toolsB,
            "get_page_content"
        )({
            url: "https://example.com/fail",
        });

        expect(failed).toEqual({
            error: "Failed to get content: Error: content failed",
        });
    });
});
