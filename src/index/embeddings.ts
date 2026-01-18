import { embed, embedMany, cosineSimilarity } from "ai";
import { createEmbeddingModel } from "@/lib/llm";
import { logger } from "@/lib/logger";

const log = logger.create("Embeddings");

export async function generateEmbedding(apiKey: string, text: string): Promise<number[]> {
    const startTime = Date.now();
    log.debug(`Generating embedding for text (${text.length} chars)`);

    const model = createEmbeddingModel(apiKey);
    const { embedding } = await embed({ model, value: text });

    log.debug(`Embedding generated in ${Date.now() - startTime}ms (dim=${embedding.length})`);
    return embedding;
}

export async function generateEmbeddings(apiKey: string, texts: string[]): Promise<number[][]> {
    const startTime = Date.now();
    log.debug(`Generating ${texts.length} embeddings`);

    const model = createEmbeddingModel(apiKey);
    const { embeddings } = await embedMany({ model, values: texts });

    log.info(`Generated ${embeddings.length} embeddings in ${Date.now() - startTime}ms`);
    return embeddings;
}

export function findSimilar<T extends { embedding: number[] }>(
    items: T[],
    queryEmbedding: number[],
    topK: number = 5
): Array<{ item: T; score: number }> {
    const startTime = Date.now();
    log.debug(`Finding similar items (n=${items.length}, topK=${topK})`);

    const k = Math.max(0, topK);
    const results = items
        .map(item => ({
            item,
            score: cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

    log.debug(
        `Similarity search completed in ${Date.now() - startTime}ms, scores: [${results.map(r => r.score.toFixed(3)).join(", ")}]`
    );
    return results;
}

export { cosineSimilarity };
