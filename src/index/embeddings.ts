import { embed, generateText, cosineSimilarity } from "ai";
import { createModel, createEmbeddingModel } from "@/lib/llm";

let apiKey: string | null = null;

export function initEmbeddings(key: string) {
    apiKey = key;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    if (!apiKey) throw new Error("Embeddings not initialized. Call initEmbeddings first.");

    const embeddingModel = createEmbeddingModel(apiKey);
    const { embedding } = await embed({
        model: embeddingModel,
        value: text,
    });
    return embedding;
}

export async function generateDescription(fileName: string, fileContent?: string): Promise<string> {
    if (!apiKey) throw new Error("Embeddings not initialized.");

    const model = createModel(apiKey);
    const prompt = fileContent
        ? `Describe this file in 2-3 sentences. What is it about? What category does it belong to? What would someone search to find this file?

Filename: ${fileName}
Content preview: ${fileContent.slice(0, 1000)}

Description:`
        : `Based only on the filename, describe what this file might contain in 1-2 sentences. What category? What search terms would find it?

Filename: ${fileName}

Description:`;

    const { text } = await generateText({
        model,
        prompt,
    });
    return text;
}

export { cosineSimilarity };
