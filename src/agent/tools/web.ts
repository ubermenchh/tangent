import { z } from "zod";
import { toolRegistry } from "./registry";
import Exa from "exa-js";
import { logger } from "@/lib/logger";

const log = logger.create("WebTools");

const EXA_API_KEY = process.env.EXPO_PUBLIC_EXA_API_KEY ?? "";

if (!EXA_API_KEY) {
    log.warn("EXA_API_KEY not configured - web search will be unavailable");
}

const exa = new Exa(EXA_API_KEY);

toolRegistry.register("web_search", {
    description:
        "Search the web for current information, news, research, or any topic. Returns relevant results with summaries.",
    parameters: z.object({
        query: z.string().describe("Natural language search query"),
        type: z
            .enum(["auto", "neural", "keyword"])
            .optional()
            .describe("Search type: auto (default), neural (semantic), or keyword (exact match)"),
        numResults: z.number().optional().describe("Number of results (default 5)"),
        category: z
            .enum(["company", "research paper", "news", "pdf", "github", "tweet"])
            .optional(),
    }),
    execute: async ({ query, type = "auto", numResults = 5, category }) => {
        log.info(`Web search: "${query}" (type=${type}, limit=${numResults})`);

        if (!EXA_API_KEY) {
            log.error("Web search attempted without API key");
            return { error: "Exa API key not configured" };
        }

        try {
            const results = await exa.search(query, {
                type,
                numResults,
                category,
                contents: {
                    text: { maxCharacters: 1000 },
                    summary: true,
                },
            });

            log.info(`Web search returned ${results.results.length} results`);
            log.debug(
                "Search results:",
                results.results.map(r => r.title)
            );

            return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                results: results.results.map((r: any) => ({
                    title: r.title,
                    url: r.url,
                    summary: r.summary,
                    publishedDate: r.publishedDate,
                    text: r.text?.slice(0, 500),
                })),
            };
        } catch (error) {
            log.error("Web search failed", error);
            return { error: `Search failed: ${error}` };
        }
    },
});

toolRegistry.register("find_similar", {
    description: "Find web pages similar to a given URL",
    parameters: z.object({
        url: z.string().describe("URL to find similar pages to"),
        numResults: z.number().optional(),
    }),
    execute: async ({ url, numResults = 5 }) => {
        log.info(`Find similar: ${url} (limit=${numResults})`);

        if (!EXA_API_KEY) {
            log.error("Find similar attempted without API key");
            return { error: "Exa API key not configured" };
        }

        try {
            const results = await exa.findSimilar(url, {
                numResults,
                contents: {
                    text: { maxCharacters: 500 },
                    summary: true,
                },
            });

            log.info(`Find similar returned ${results.results.length} results`);

            return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                results: results.results.map((r: any) => ({
                    title: r.title,
                    url: r.url,
                    summary: r.summary,
                })),
            };
        } catch (error) {
            log.error("Find similar failed", error);
            return { error: `Find similar failed: ${error}` };
        }
    },
});

toolRegistry.register("get_page_content", {
    description: "Get the full text content of a web page",
    parameters: z.object({
        url: z.string().describe("URL to get content from"),
    }),
    execute: async ({ url }) => {
        log.info(`Get page content: ${url}`);

        if (!EXA_API_KEY) {
            log.error("Get page content attempted without API key");
            return { error: "Exa API key not configured" };
        }

        try {
            const results = await exa.getContents([url], {
                text: { maxCharacters: 5000 },
                summary: true,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const page = results.results[0] as any;
            log.info(`Got content for: ${page?.title ?? url} (${page?.text?.length ?? 0} chars)`);

            return {
                title: page?.title,
                url: page?.url,
                summary: page?.summary,
                content: page?.text,
            };
        } catch (error) {
            log.error("Get page content failed", error);
            return { error: `Failed to get content: ${error}` };
        }
    },
});
