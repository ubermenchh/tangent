import { z } from "zod";
import { toolRegistry } from "./registry";
import { searchFiles, getIndexStats } from "@/index/manager";
import { useSettingsStore } from "@/stores/settingsStore";

toolRegistry.register("search_files", {
    description: "Search indexed local files and documents using natural language.",
    parameters: z.object({
        query: z
            .string()
            .describe("Search query (e.g., 'resume', 'vacation photos', 'meeting notes')"),
        limit: z.number().optional().describe("Max results (default 5)"),
    }),
    execute: async ({ query, limit = 5 }) => {
        const apiKey = useSettingsStore.getState().geminiApiKey;
        if (!apiKey) return { error: "API key no configured" };

        const stats = getIndexStats();
        if (stats.count === 0) {
            return { error: "No files indexed. Index files in Settings first." };
        }

        const results = await searchFiles(apiKey, query, limit);
        if (results.length === 0) {
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
        return {
            filesIndexed: stats.count,
            lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "Never",
        };
    },
});
