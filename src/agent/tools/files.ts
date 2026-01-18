import { z } from "zod";
import { toolRegistry } from "./registry";
import { searchFiles, getIndexStats } from "@/index/manager";
import { useSettingsStore } from "@/stores/settingsStore";
import { logger } from "@/lib/logger";

const log = logger.create("FileTools");

toolRegistry.register("search_files", {
    description: "Search indexed local files and documents using natural language.",
    parameters: z.object({
        query: z
            .string()
            .describe("Search query (e.g., 'resume', 'vacation photos', 'meeting notes')"),
        limit: z.number().optional().describe("Max results (default 5)"),
    }),
    execute: async ({ query, limit = 5 }) => {
        log.info(`File search: "${query}" (limit=${limit})`);

        const apiKey = useSettingsStore.getState().geminiApiKey;
        if (!apiKey) {
            log.error("File search attempted without API key");
            return { error: "API key not configured" };
        }

        const stats = getIndexStats();
        log.debug(`Index stats: ${stats.count} files indexed`);

        if (stats.count === 0) {
            log.warn("File search on empty index");
            return { error: "No files indexed. Index files in Settings first." };
        }

        let results;
        try {
            results = await searchFiles(apiKey, query, limit);
            log.info(`File search returned ${results.length} results`);
            log.debug(
                "Search results:",
                results.map(r => ({ name: r.name, score: r.score.toFixed(3) }))
            );
        } catch (err) {
            log.error("File search failed", err);
            return { error: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
        }

        if (results.length === 0) {
            log.debug(`No results for query: "${query}"`);
            return { found: 0, message: `No files matching "${query}"` };
        }

        return {
            found: results.length,
            results: results.map(r => ({
                name: r.name,
                path: r.path,
                description: r.description,
                relevance: `${Math.round(r.score * 100)}%`,
            })),
        };
    },
});

toolRegistry.register("get_index_status", {
    description: "Check how many files are indexed for search.",
    parameters: z.object({}),
    execute: async () => {
        const stats = getIndexStats();
        log.debug(`Index status requested: ${stats.count} files`);
        return {
            filesIndexed: stats.count,
            lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "Never",
        };
    },
});
