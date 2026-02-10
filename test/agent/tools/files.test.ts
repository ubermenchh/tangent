jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
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

jest.mock("@/stores/settingsStore", () => ({
    useSettingsStore: {
        getState: jest.fn(),
    },
}));

jest.mock("@/index/manager", () => ({
    getIndexStats: jest.fn(),
    searchFiles: jest.fn(),
}));

import "@/agent/tools/files";
import { toolRegistry } from "@/agent/tools/registry";

const { useSettingsStore } = jest.requireMock("@/stores/settingsStore") as {
    useSettingsStore: { getState: jest.Mock };
};

const { getIndexStats: mockGetIndexStats, searchFiles: mockSearchFiles } = jest.requireMock(
    "@/index/manager"
) as {
    getIndexStats: jest.Mock;
    searchFiles: jest.Mock;
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

describe("files tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("registers search_files and get_index_status", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        expect(tools.search_files).toBeDefined();
        expect(tools.get_index_status).toBeDefined();
    });

    test("search_files returns API key error when key is missing", async () => {
        useSettingsStore.getState.mockReturnValue({ geminiApiKey: null });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_files")({
            query: "invoice",
            limit: 5,
        });

        expect(result).toEqual({ error: "API key not configured" });
        expect(mockGetIndexStats).not.toHaveBeenCalled();
        expect(mockSearchFiles).not.toHaveBeenCalled();
    });

    test("search_files returns empty-index error when no files are indexed", async () => {
        useSettingsStore.getState.mockReturnValue({ geminiApiKey: "key-1" });
        mockGetIndexStats.mockReturnValue({ count: 0, lastUpdated: null });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_files")({
            query: "resume",
            limit: 3,
        });

        expect(result).toEqual({
            error: "No files indexed. Index files in Settings first.",
        });
        expect(mockSearchFiles).not.toHaveBeenCalled();
    });

    test("search_files maps results and relevance percentage", async () => {
        useSettingsStore.getState.mockReturnValue({ geminiApiKey: "key-2" });
        mockGetIndexStats.mockReturnValue({ count: 2, lastUpdated: 1700000000000 });
        mockSearchFiles.mockResolvedValue([
            {
                name: "resume.pdf",
                path: "/docs/resume.pdf",
                description: "My latest resume",
                score: 0.934,
            },
            {
                name: "notes.txt",
                path: "/docs/notes.txt",
                description: "Interview notes",
                score: 0.12,
            },
        ]);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_files")({
            query: "resume",
            limit: 2,
        });

        expect(mockSearchFiles).toHaveBeenCalledWith("key-2", "resume", 2);
        expect(result).toEqual({
            found: 2,
            results: [
                {
                    name: "resume.pdf",
                    path: "/docs/resume.pdf",
                    description: "My latest resume",
                    relevance: "93%",
                },
                {
                    name: "notes.txt",
                    path: "/docs/notes.txt",
                    description: "Interview notes",
                    relevance: "12%",
                },
            ],
        });
    });

    test("search_files returns no-match response", async () => {
        useSettingsStore.getState.mockReturnValue({ geminiApiKey: "key-3" });
        mockGetIndexStats.mockReturnValue({ count: 10, lastUpdated: 1700000000000 });
        mockSearchFiles.mockResolvedValue([]);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_files")({
            query: "does-not-exist",
            limit: 4,
        });

        expect(result).toEqual({
            found: 0,
            message: 'No files matching "does-not-exist"',
        });
    });

    test("search_files returns formatted error when manager search throws", async () => {
        useSettingsStore.getState.mockReturnValue({ geminiApiKey: "key-4" });
        mockGetIndexStats.mockReturnValue({ count: 1, lastUpdated: 1700000000000 });
        mockSearchFiles.mockRejectedValueOnce(new Error("embedding failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_files")({
            query: "budget",
            limit: 5,
        });

        expect(result).toEqual({
            error: "Search failed: embedding failed",
        });
    });

    test("get_index_status returns Never when never indexed", async () => {
        mockGetIndexStats.mockReturnValue({ count: 0, lastUpdated: null });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "get_index_status")({});

        expect(result).toEqual({
            filesIndexed: 0,
            lastUpdated: "Never",
        });
    });

    test("get_index_status returns formatted timestamp when available", async () => {
        mockGetIndexStats.mockReturnValue({ count: 7, lastUpdated: 1700000000000 });

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = (await getExecutor(tools, "get_index_status")({})) as {
            filesIndexed: number;
            lastUpdated: string;
        };

        expect(result.filesIndexed).toBe(7);
        expect(typeof result.lastUpdated).toBe("string");
        expect(result.lastUpdated).not.toBe("Never");
    });
});