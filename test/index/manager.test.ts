const mockFileTexts = new Map<string, string>();

jest.mock("expo-file-system", () => {
    class MockFile {
        uri: string;

        constructor(uri: string) {
            this.uri = uri;
        }

        async text(): Promise<string> {
            return mockFileTexts.get(this.uri) ?? "";
        }

        async bytes(): Promise<Uint8Array> {
            return new Uint8Array([1, 2, 3]);
        }
    }

    return { File: MockFile };
});

jest.mock("expo-image-manipulator", () => ({
    ImageManipulator: {
        manipulate: () => ({
            resize: () => {},
            renderAsync: async () => ({
                saveAsync: async () => ({ uri: "file:///tmp/mock.jpg" }),
            }),
        }),
    },
    SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("ai", () => ({
    generateText: jest.fn(),
}));

jest.mock("@/lib/llm", () => ({
    createModel: jest.fn(() => ({ model: "mock-model" })),
}));

jest.mock("@/index/scanner", () => ({
    scanFolders: jest.fn(),
}));

jest.mock("@/index/embeddings", () => ({
    generateEmbedding: jest.fn(),
    generateEmbeddings: jest.fn(),
    findSimilar: jest.fn(),
}));

jest.mock("@/index/store", () => ({
    indexStore: {
        getAll: jest.fn(),
        upsert: jest.fn(),
        stats: jest.fn(),
        clear: jest.fn(),
    },
}));

import { buildIndex, searchFiles, getIndexStats, clearIndex } from "@/index/manager";

const { generateText: mockGenerateText } = jest.requireMock("ai") as {
    generateText: jest.Mock;
};

const { createModel: mockCreateModel } = jest.requireMock("@/lib/llm") as {
    createModel: jest.Mock;
};

const { scanFolders: mockScanFolders } = jest.requireMock("@/index/scanner") as {
    scanFolders: jest.Mock;
};

const {
    generateEmbedding: mockGenerateEmbedding,
    generateEmbeddings: mockGenerateEmbeddings,
    findSimilar: mockFindSimilar,
} = jest.requireMock("@/index/embeddings") as {
    generateEmbedding: jest.Mock;
    generateEmbeddings: jest.Mock;
    findSimilar: jest.Mock;
};

const { indexStore: mockIndexStore } = jest.requireMock("@/index/store") as {
    indexStore: {
        getAll: jest.Mock;
        upsert: jest.Mock;
        stats: jest.Mock;
        clear: jest.Mock;
    };
};

describe("index manager", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFileTexts.clear();
    });

    test("buildIndex completes early when no new files", async () => {
        const scanned = [
            {
                path: "file:///docs/a.txt",
                name: "a.txt",
                extension: "txt",
                size: 100,
                modifiedAt: 10,
            },
        ];

        mockScanFolders.mockResolvedValue(scanned);
        mockIndexStore.getAll.mockReturnValue([{ path: "file:///docs/a.txt" }]);

        const progress: Array<{ phase: string; current: number; total: number }> = [];
        await buildIndex("api-key", undefined, p => progress.push(p));

        expect(progress[0]).toEqual({ phase: "scanning", current: 0, total: 0 });
        expect(progress[progress.length - 1]).toEqual({
            phase: "complete",
            current: 0,
            total: 0,
        });

        expect(mockGenerateText).not.toHaveBeenCalled();
        expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
        expect(mockIndexStore.upsert).not.toHaveBeenCalled();
    });

    test("buildIndex indexes new text files and upserts each", async () => {
        const scanned = [
            {
                path: "file:///docs/a.txt",
                name: "a.txt",
                extension: "txt",
                size: 100,
                modifiedAt: 10,
            },
            {
                path: "file:///docs/b.json",
                name: "b.json",
                extension: "json",
                size: 120,
                modifiedAt: 20,
            },
        ];

        mockScanFolders.mockResolvedValue(scanned);
        mockIndexStore.getAll.mockReturnValue([]);

        mockFileTexts.set("file:///docs/a.txt", "alpha file content");
        mockFileTexts.set("file:///docs/b.json", '{"k":"v"}');

        mockGenerateText
            .mockResolvedValueOnce({ text: "desc a" })
            .mockResolvedValueOnce({ text: "desc b" });

        mockGenerateEmbeddings.mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]);

        const progress: Array<{ phase: string; current: number; total: number; file?: string }> = [];
        await buildIndex("api-key", undefined, p => progress.push(p));

        expect(mockCreateModel).toHaveBeenCalled();
        expect(mockGenerateText).toHaveBeenCalledTimes(2);
        expect(mockGenerateEmbeddings).toHaveBeenCalledTimes(1);
        expect(mockGenerateEmbeddings).toHaveBeenCalledWith(
            "api-key",
            expect.arrayContaining([expect.stringContaining("a.txt"), expect.stringContaining("b.json")])
        );

        expect(mockIndexStore.upsert).toHaveBeenCalledTimes(2);
        expect(mockIndexStore.upsert.mock.calls[0][0].path).toBe("file:///docs/a.txt");
        expect(mockIndexStore.upsert.mock.calls[1][0].path).toBe("file:///docs/b.json");

        expect(progress[0]).toEqual({ phase: "scanning", current: 0, total: 0 });
        expect(progress.some(p => p.phase === "embedding")).toBe(true);
        expect(progress[progress.length - 1]).toEqual({
            phase: "complete",
            current: 2,
            total: 2,
        });
    });

    test("searchFiles returns empty when index is empty", async () => {
        mockIndexStore.getAll.mockReturnValue([]);

        const results = await searchFiles("api-key", "invoice", 5);

        expect(results).toEqual([]);
        expect(mockGenerateEmbedding).not.toHaveBeenCalled();
        expect(mockFindSimilar).not.toHaveBeenCalled();
    });

    test("searchFiles embeds query and returns scored mapped results", async () => {
        const files = [
            {
                id: "f1",
                path: "file:///docs/a.txt",
                name: "a.txt",
                extension: "txt",
                size: 100,
                modifiedAt: 1,
                description: "alpha",
                embedding: [0.1, 0.2],
                indexedAt: 11,
            },
            {
                id: "f2",
                path: "file:///docs/b.txt",
                name: "b.txt",
                extension: "txt",
                size: 100,
                modifiedAt: 2,
                description: "beta",
                embedding: [0.3, 0.4],
                indexedAt: 22,
            },
        ];

        mockIndexStore.getAll.mockReturnValue(files);
        mockGenerateEmbedding.mockResolvedValue([9, 9]);
        mockFindSimilar.mockReturnValue([
            { item: files[1], score: 0.9 },
            { item: files[0], score: 0.4 },
        ]);

        const results = await searchFiles("api-key", "search beta", 2);

        expect(mockGenerateEmbedding).toHaveBeenCalledWith("api-key", "search beta");
        expect(mockFindSimilar).toHaveBeenCalledWith(files, [9, 9], 2);

        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({ name: "b.txt", score: 0.9 });
        expect(results[1]).toMatchObject({ name: "a.txt", score: 0.4 });
    });

    test("getIndexStats and clearIndex delegate to store", () => {
        mockIndexStore.stats.mockReturnValue({ count: 3, lastUpdated: 123 });

        expect(getIndexStats()).toEqual({ count: 3, lastUpdated: 123 });

        clearIndex();
        expect(mockIndexStore.clear).toHaveBeenCalledTimes(1);
    });
});