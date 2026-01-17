import { embed, embedMany, cosineSimilarity } from "ai";
import { createEmbeddingModel } from "@/lib/llm";

export async function generateEmbedding(apiKey: string, text: string): Promise<number[]> {
    const model = createEmbeddingModel(apiKey);
    const { embedding } = await embed({ model, value: text });
    return embedding;
}

export async function generateEmbeddings(apiKey: string, texts: string[]): Promise<number[][]> {
    const model = createEmbeddingModel(apiKey);
    const { embeddings } = await embedMany({ model, values: texts });
    return embeddings;
}

export function findSimilar<T extends { embedding: number[] }>(
    items: T[],
    queryEmbedding: number[],
    topK: number = 5
): Array<{ item: T; score: number }> {
    const k = Math.max(0, topK);
    return items
        .map(item => ({
            item,
            score: cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
}

export { cosineSimilarity };
