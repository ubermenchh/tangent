import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";
import { searchYoutube, getYoutubeAppUrl, getYoutubeWatchUrl } from "@/integrations/youtube";

const log = logger.create("YoutubeTools");

let Linking: typeof import("expo-linking") | null = null;

async function getLinking() {
    if (!Linking) {
        Linking = await import("expo-linking");
    }
    return Linking;
}

toolRegistry.register("play_video", {
    description:
        "Search YouTube and play a video. Returns search results if multiple matches, or auto-plays if confident match.",
    parameters: z.object({
        query: z.string().describe("Search query for the video (song name, video title, etc.)"),
        autoPlay: z
            .boolean()
            .default(true)
            .describe("Whether to automatically play the first result"),
    }),
    execute: async ({ query, autoPlay }) => {
        log.info(`Searching YouTube for: ${query}`);

        try {
            const results = await searchYoutube(query, 5);

            if (results.length === 0) {
                return { success: false, error: "No videos found" };
            }

            if (autoPlay) {
                const LinkingModule = await getLinking();
                const video = results[0];
                const appUrl = getYoutubeAppUrl(video.videoId);
                const webUrl = getYoutubeWatchUrl(video.videoId);

                try {
                    const canOpen = await LinkingModule.canOpenURL(appUrl);
                    if (canOpen) {
                        await LinkingModule.openURL(appUrl);
                    } else {
                        await LinkingModule.openURL(webUrl);
                    }

                    log.info(`Playing: ${video.title}`);
                    return {
                        success: true,
                        message: `Now playing: ${video.title}`,
                        video: video,
                    };
                } catch {
                    // Fallback to web
                    await LinkingModule.openURL(webUrl);
                    return {
                        success: true,
                        message: `Opening in browser: ${video.title}`,
                        video: video,
                    };
                }
            }

            return {
                success: true,
                results: results.map(v => ({
                    title: v.title,
                    channel: v.channelTitle,
                    videoId: v.videoId,
                })),
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            log.error(`YouTube search failed: ${message}`);
            return { success: false, error: message };
        }
    },
});

toolRegistry.register("search_videos", {
    description: "Search YouTube for videos without playing. Returns a list of results.",
    parameters: z.object({
        query: z.string().describe("Search query"),
        maxResults: z.number().default(5).describe("Number of results to return"),
    }),
    execute: async ({ query, maxResults }) => {
        try {
            const results = await searchYoutube(query, maxResults);
            return { success: true, results };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, error: message };
        }
    },
});
