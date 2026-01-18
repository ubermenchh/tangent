import { File } from "expo-file-system";
import { generateText } from "ai";
import { createModel } from "@/lib/llm";
import { IndexConfig, IndexedFile, DEFAULT_INDEX_CONFIG } from "./types";
import { scanFolders, ScannedFile } from "./scanner";
import { generateEmbedding, generateEmbeddings, findSimilar } from "./embeddings";
import { indexStore } from "./store";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const TEXT_EXTENSIONS = [
    "txt",
    "md",
    "json",
    "csv",
    // "pdf",
    // "xlsx",
    // "xls",
    // "doc",
    // "docx",
    // "ppt",
    // "pptx",
];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic"];
const BATCH_SIZE = 10;

export interface IndexProgress {
    phase: "scanning" | "embedding" | "complete";
    current: number;
    total: number;
    file?: string;
}

export async function buildIndex(
    apiKey: string,
    config: IndexConfig = DEFAULT_INDEX_CONFIG,
    onProgress?: (p: IndexProgress) => void
): Promise<void> {
    onProgress?.({ phase: "scanning", current: 0, total: 0 });
    const scanned = await scanFolders(config);
    console.log(`Scanned ${scanned.length} files from ${config.folders.join(", ")}`);

    const existing = new Set(indexStore.getAll().map(f => f.path));
    const newFiles = scanned.filter(f => !existing.has(f.path));

    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
        const batch = newFiles.slice(i, i + BATCH_SIZE);
        onProgress?.({
            phase: "embedding",
            current: i,
            total: newFiles.length,
            file: batch[0]?.name,
        });

        const indexed = await indexBatch(apiKey, batch);
        indexed.forEach(f => indexStore.upsert(f));
    }

    onProgress?.({ phase: "complete", current: newFiles.length, total: newFiles.length });
}

async function describeImage(apiKey: string, filePath: string, fileName: string): Promise<string> {
    try {
        console.log(`Analyzing image: ${fileName}`);

        const context = ImageManipulator.manipulate(filePath);
        context.resize({ width: 800 });
        const imageRef = await context.renderAsync();
        const result = await imageRef.saveAsync({
            format: SaveFormat.JPEG,
            compress: 0.8,
        });

        const file = new File(result.uri);
        const imageBytes = await file.bytes();

        const model = createModel(apiKey);
        const { text } = await generateText({
            model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "image", image: imageBytes },
                        {
                            type: "text",
                            text: "Descrive this image in 1-2 sentences for search indexing. Focus on: subjects, objects, scene, activities, colors, and any visible text.",
                        },
                    ],
                },
            ],
        });
        return text;
    } catch (error) {
        console.warn(`Failed to analyze image ${fileName}:`, error);
        return `Image file: ${fileName}`;
    }
}

async function indexBatch(apiKey: string, files: ScannedFile[]): Promise<IndexedFile[]> {
    const contents = await Promise.all(
        files.map(async f => {
            if (!TEXT_EXTENSIONS.includes(f.extension)) return "";
            try {
                const file = new File(f.path);
                return (await file.text()).slice(0, 4000);
            } catch {
                return "";
            }
        })
    );

    const model = createModel(apiKey);
    const descriptions: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const f = files[i];

        if (IMAGE_EXTENSIONS.includes(f.extension)) {
            descriptions.push(await describeImage(apiKey, f.path, f.name));
        } else {
            const { text } = await generateText({
                model,
                prompt: `Describe this file in 1-2 sentences for search indexing.\nFilename: ${f.name}${contents[i] ? `\nContent: ${contents[i].slice(0, 1000)}` : ""}\nDescription:`,
            });
            descriptions.push(text);
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }

    const textsToEmbed = files.map(
        (f, i) =>
            `${f.name}\n${descriptions[i]}${contents[i] ? `\n${contents[i].slice(0, 1500)}` : ""}`
    );
    const embeddings = await generateEmbeddings(apiKey, textsToEmbed);

    return files.map((f, i) => ({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path: f.path,
        name: f.name,
        extension: f.extension,
        size: f.size,
        modifiedAt: f.modifiedAt,
        description: descriptions[i],
        embedding: embeddings[i],
        indexedAt: Date.now(),
    }));
}

export async function searchFiles(apiKey: string, query: string, topK: number = 5) {
    const files = indexStore.getAll();
    if (files.length === 0) return [];

    const queryEmbedding = await generateEmbedding(apiKey, query);
    return findSimilar(files, queryEmbedding, topK).map(r => ({
        ...r.item,
        score: r.score,
    }));
}

export const getIndexStats = () => indexStore.stats();
export const clearIndex = () => indexStore.clear();
