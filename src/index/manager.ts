import { File } from "expo-file-system";
import { generateText } from "ai";
import { createModel } from "@/lib/llm";
import { IndexConfig, IndexedFile, DEFAULT_INDEX_CONFIG } from "./types";
import { scanFolders, ScannedFile } from "./scanner";
import { generateEmbedding, generateEmbeddings, findSimilar } from "./embeddings";
import { indexStore } from "./store";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { logger } from "@/lib/logger";

const log = logger.create("IndexManager");

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
    log.info("Starting index build", { folders: config.folders, fileTypes: config.fileTypes });
    const startTime = Date.now();

    onProgress?.({ phase: "scanning", current: 0, total: 0 });

    const scanned = await log.time("File scanning", () => scanFolders(config));
    log.info(`Scanned ${scanned.length} files from ${config.folders.join(", ")}`);

    const existing = new Set(indexStore.getAll().map(f => f.path));
    const newFiles = scanned.filter(f => !existing.has(f.path));
    log.info(`Found ${newFiles.length} new files to index (${existing.size} already indexed)`);

    if (newFiles.length === 0) {
        log.info("No new files to index");
        onProgress?.({ phase: "complete", current: 0, total: 0 });
        return;
    }

    const totalBatches = Math.ceil(newFiles.length / BATCH_SIZE);
    log.debug(`Processing ${totalBatches} batches (batch size: ${BATCH_SIZE})`);

    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = newFiles.slice(i, i + BATCH_SIZE);

        log.debug(
            `Processing batch ${batchNum}/${totalBatches}: ${batch.map(f => f.name).join(", ")}`
        );

        onProgress?.({
            phase: "embedding",
            current: i,
            total: newFiles.length,
            file: batch[0]?.name,
        });

        const indexed = await indexBatch(apiKey, batch);
        indexed.forEach(f => indexStore.upsert(f));

        log.debug(`Batch ${batchNum} complete, indexed ${indexed.length} files`);
    }

    const duration = Date.now() - startTime;
    log.info(`Index build complete: ${newFiles.length} files in ${(duration / 1000).toFixed(1)}s`);
    onProgress?.({ phase: "complete", current: newFiles.length, total: newFiles.length });
}

async function describeImage(apiKey: string, filePath: string, fileName: string): Promise<string> {
    const startTime = Date.now();
    try {
        log.debug(`Analyzing image: ${fileName}`);

        const context = ImageManipulator.manipulate(filePath);
        context.resize({ width: 800 });
        const imageRef = await context.renderAsync();
        const result = await imageRef.saveAsync({
            format: SaveFormat.JPEG,
            compress: 0.8,
        });

        const file = new File(result.uri);
        const imageBytes = await file.bytes();
        log.debug(`Image ${fileName}: resized to ${(imageBytes.length / 1024).toFixed(0)}KB`);

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
                            text: "Describe this image in 1-2 sentences for search indexing. Focus on: subjects, objects, scene, activities, colors, and any visible text.",
                        },
                    ],
                },
            ],
        });

        log.debug(
            `Image ${fileName} described in ${Date.now() - startTime}ms: "${text.slice(0, 80)}..."`
        );
        return text;
    } catch (error) {
        log.warn(`Failed to analyze image ${fileName} after ${Date.now() - startTime}ms`, error);
        return `Image file: ${fileName}`;
    }
}

async function indexBatch(apiKey: string, files: ScannedFile[]): Promise<IndexedFile[]> {
    const batchStart = Date.now();
    log.debug(`Reading contents for ${files.length} files`);

    const contents = await Promise.all(
        files.map(async f => {
            if (!TEXT_EXTENSIONS.includes(f.extension)) return "";
            try {
                const file = new File(f.path);
                const text = (await file.text()).slice(0, 4000);
                log.debug(`Read ${f.name}: ${text.length} chars`);
                return text;
            } catch (error) {
                log.warn(`Failed to read ${f.name}`, error);
                return "";
            }
        })
    );

    const model = createModel(apiKey);
    const descriptions: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const isImage = IMAGE_EXTENSIONS.includes(f.extension);

        log.debug(`Generating description for ${f.name} (${isImage ? "image" : "text"})`);

        if (isImage) {
            descriptions.push(await describeImage(apiKey, f.path, f.name));
        } else {
            const { text } = await generateText({
                model,
                prompt: `Describe this file in 1-2 sentences for search indexing.\nFilename: ${f.name}${contents[i] ? `\nContent: ${contents[i].slice(0, 1000)}` : ""}\nDescription:`,
            });
            log.debug(`Text description for ${f.name}: "${text.slice(0, 60)}..."`);
            descriptions.push(text);
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }

    log.debug(`Generating embeddings for ${files.length} files`);
    const textsToEmbed = files.map(
        (f, i) =>
            `${f.name}\n${descriptions[i]}${contents[i] ? `\n${contents[i].slice(0, 1500)}` : ""}`
    );
    const embeddings = await generateEmbeddings(apiKey, textsToEmbed);

    log.debug(`Batch indexed in ${Date.now() - batchStart}ms`);

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
    log.info(`Searching files: "${query}" (topK=${topK})`);
    const startTime = Date.now();

    const files = indexStore.getAll();
    if (files.length === 0) {
        log.warn("Search attempted on empty index");
        return [];
    }

    log.debug(`Generating embedding for query`);
    const queryEmbedding = await generateEmbedding(apiKey, query);

    const results = findSimilar(files, queryEmbedding, topK).map(r => ({
        ...r.item,
        score: r.score,
    }));

    log.info(`Search completed in ${Date.now() - startTime}ms, found ${results.length} results`);
    log.debug(
        "Top results:",
        results.slice(0, 3).map(r => ({ name: r.name, score: r.score.toFixed(3) }))
    );

    return results;
}

export const getIndexStats = () => {
    const stats = indexStore.stats();
    log.debug("Index stats requested", stats);
    return stats;
};

export const clearIndex = () => {
    log.info("Clearing index");
    indexStore.clear();
};
