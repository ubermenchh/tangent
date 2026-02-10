jest.mock("ai", () => ({
    embed: jest.fn(),
    embedMany: jest.fn(),
    cosineSimilarity: jest.fn(),
}));

jest.mock("@/lib/llm", () => ({
    createEmbeddingModel: jest.fn(),
}));

import { generateEmbedding, generateEmbeddings, findSimilar } from "@/index/embeddings";

const { embed: mockEmbed, embedMany: mockEmbedMany, cosineSimilarity: mockCosineSimilarity } =
    jest.requireMock("ai") as {
        embed: jest.Mock;
        embedMany: jest.Mock;
        cosineSimilarity: jest.Mock;
    };

const { createEmbeddingModel: mockCreateEmbeddingModel } = jest.requireMock("@/lib/llm") as {
    createEmbeddingModel: jest.Mock;
};

describe("embeddings", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateEmbeddingModel.mockReturnValue({ provider: "mock-embedding-model" });
    });

    test("generateEmbedding creates model and returns embedding", async () => {
        mockEmbed.mockResolvedValue({ embedding: [0.11, 0.22, 0.33] });

        const result = await generateEmbedding("api-key-1", "hello world");

        expect(result).toEqual([0.11, 0.22, 0.33]);
        expect(mockCreateEmbeddingModel).toHaveBeenCalledWith("api-key-1");

        const model = mockCreateEmbeddingModel.mock.results[0]?.value;
        expect(mockEmbed).toHaveBeenCalledWith({
            model,
            value: "hello world",
        });
    });

    test("generateEmbeddings creates model and returns multiple embeddings", async () => {
        mockEmbedMany.mockResolvedValue({
            embeddings: [
                [1, 0, 0],
                [0, 1, 0],
            ],
        });

        const input = ["alpha", "beta"];
        const result = await generateEmbeddings("api-key-2", input);

        expect(result).toEqual([
            [1, 0, 0],
            [0, 1, 0],
        ]);
        expect(mockCreateEmbeddingModel).toHaveBeenCalledWith("api-key-2");

        const model = mockCreateEmbeddingModel.mock.results[0]?.value;
        expect(mockEmbedMany).toHaveBeenCalledWith({
            model,
            values: input,
        });
    });

    test("findSimilar ranks items by cosine score descending and applies topK", () => {
        const items = [
            { id: "a", embedding: [1, 0] as number[] },
            { id: "b", embedding: [0, 1] as number[] },
            { id: "c", embedding: [1, 1] as number[] },
        ];

        mockCosineSimilarity.mockImplementation((_query: number[], itemEmbedding: number[]) => {
            if (itemEmbedding === items[0].embedding) return 0.2;
            if (itemEmbedding === items[1].embedding) return 0.9;
            if (itemEmbedding === items[2].embedding) return 0.5;
            return 0;
        });

        const result = findSimilar(items, [9, 9], 2);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ item: items[1], score: 0.9 });
        expect(result[1]).toMatchObject({ item: items[2], score: 0.5 });
        expect(mockCosineSimilarity).toHaveBeenCalledTimes(3);
    });

    test("findSimilar returns all sorted items when topK exceeds length", () => {
        const items = [
            { id: "x", embedding: [1] as number[] },
            { id: "y", embedding: [2] as number[] },
        ];

        mockCosineSimilarity
            .mockReturnValueOnce(0.1) // x
            .mockReturnValueOnce(0.8); // y

        const result = findSimilar(items, [99], 10);

        expect(result).toHaveLength(2);
        expect(result[0].item.id).toBe("y");
        expect(result[1].item.id).toBe("x");
    });

    test("findSimilar returns empty when topK <= 0", () => {
        const items = [
            { id: "x", embedding: [1] as number[] },
            { id: "y", embedding: [2] as number[] },
        ];

        mockCosineSimilarity.mockReturnValue(0.5);

        expect(findSimilar(items, [1], 0)).toEqual([]);
        expect(findSimilar(items, [1], -3)).toEqual([]);
    });

    test("findSimilar returns empty for empty item list", () => {
        const result = findSimilar<{ id: string; embedding: number[] }>([], [1, 2, 3], 5);
        expect(result).toEqual([]);
        expect(mockCosineSimilarity).not.toHaveBeenCalled();
    });
});