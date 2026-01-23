import { z } from "zod";
import * as Linking from "expo-linking";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";
import { searchYoutube, getYoutubeAppUrl, getYoutubeWatchUrl } from "@/integrations/youtube";
import { authenticate, youtubeApiCall } from "@/integrations/youtubeAuth";

const log = logger.create("YoutubeTools");

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
                const video = results[0];
                const appUrl = getYoutubeAppUrl(video.videoId);
                const webUrl = getYoutubeWatchUrl(video.videoId);

                try {
                    const canOpen = await Linking.canOpenURL(appUrl);
                    if (canOpen) {
                        await Linking.openURL(appUrl);
                    } else {
                        await Linking.openURL(webUrl);
                    }

                    log.info(`Playing: ${video.title}`);
                    return {
                        success: true,
                        message: `Now playing: ${video.title}`,
                        video: video,
                    };
                } catch {
                    // Fallback to web
                    await Linking.openURL(webUrl);
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

toolRegistry.register("connect_youtube", {
  description: "Connect user's YouTube account for personalized features",
  parameters: z.object({}),
  execute: async () => {
    try {
      await authenticate();
      return { success: true, message: "YouTube account connected" };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  },
});

toolRegistry.register("get_my_playlists", {
  description: "Get user's YouTube playlists",
  parameters: z.object({}),
  execute: async () => {
    try {
      const data = await youtubeApiCall("/playlists?part=snippet&mine=true&maxResults=20");
      return { success: true, playlists: (data as { items: unknown[] }).items };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  },
});

toolRegistry.register("get_my_subscriptions", {
  description: "Get user's YouTube subscriptions",
  parameters: z.object({}),
  execute: async () => {
    try {
      const data = await youtubeApiCall("/subscriptions?part=snippet&mine=true&maxResults=20");
      return { success: true, subscriptions: (data as { items: unknown[] }).items };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, error: msg };
    }
  },
});