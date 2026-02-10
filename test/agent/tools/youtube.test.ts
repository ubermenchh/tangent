jest.mock("ai", () => ({
    tool: jest.fn((config: unknown) => config),
}));

jest.mock("expo-linking", () => ({
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
}));

jest.mock("@/integrations/youtube", () => ({
    searchYoutube: jest.fn(),
    getYoutubeAppUrl: jest.fn((videoId: string) => `app://${videoId}`),
    getYoutubeWatchUrl: jest.fn((videoId: string) => `https://watch/${videoId}`),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        create: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        })),
    },
}));

import "@/agent/tools/youtube";
import { toolRegistry } from "@/agent/tools/registry";

const { canOpenURL: mockCanOpenURL, openURL: mockOpenURL } = jest.requireMock("expo-linking") as {
    canOpenURL: jest.Mock;
    openURL: jest.Mock;
};

const {
    searchYoutube: mockSearchYoutube,
    getYoutubeAppUrl: mockGetYoutubeAppUrl,
    getYoutubeWatchUrl: mockGetYoutubeWatchUrl,
} = jest.requireMock("@/integrations/youtube") as {
    searchYoutube: jest.Mock;
    getYoutubeAppUrl: jest.Mock;
    getYoutubeWatchUrl: jest.Mock;
};

function getExecutor(
    tools: Record<string, { execute?: unknown }>,
    name: string
): (args: Record<string, unknown>) => Promise<unknown> {
    const execute = tools[name]?.execute;
    if (typeof execute !== "function") {
        throw new Error(`Tool "${name}" does not expose execute()`);
    }
    return execute as (args: Record<string, unknown>) => Promise<unknown>;
}

const sampleVideo = {
    videoId: "abc123",
    title: "Sample Video",
    channelTitle: "Sample Channel",
    thumbnail: "https://thumb",
};

describe("youtube tools", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("registers play_video and search_videos", async () => {
        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        expect(tools.play_video).toBeDefined();
        expect(tools.search_videos).toBeDefined();
    });

    test("play_video returns no-videos error when search is empty", async () => {
        mockSearchYoutube.mockResolvedValueOnce([]);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "play_video")({
            query: "nothing",
            autoPlay: true,
        });

        expect(result).toEqual({ success: false, error: "No videos found" });
        expect(mockOpenURL).not.toHaveBeenCalled();
    });

    test("play_video auto-plays in app when app URL is supported", async () => {
        mockSearchYoutube.mockResolvedValueOnce([sampleVideo]);
        mockCanOpenURL.mockResolvedValueOnce(true);
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "play_video")({
            query: "sample",
            autoPlay: true,
        });

        expect(mockSearchYoutube).toHaveBeenCalledWith("sample", 5);
        expect(mockGetYoutubeAppUrl).toHaveBeenCalledWith("abc123");
        expect(mockGetYoutubeWatchUrl).toHaveBeenCalledWith("abc123");
        expect(mockCanOpenURL).toHaveBeenCalledWith("app://abc123");
        expect(mockOpenURL).toHaveBeenCalledWith("app://abc123");
        expect(result).toEqual({
            success: true,
            message: "Now playing: Sample Video",
            video: sampleVideo,
        });
    });

    test("play_video falls back to web URL when app URL cannot be opened", async () => {
        mockSearchYoutube.mockResolvedValueOnce([sampleVideo]);
        mockCanOpenURL.mockResolvedValueOnce(false);
        mockOpenURL.mockResolvedValueOnce(undefined);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "play_video")({
            query: "sample",
            autoPlay: true,
        });

        expect(mockOpenURL).toHaveBeenCalledWith("https://watch/abc123");
        expect(result).toEqual({
            success: true,
            message: "Now playing: Sample Video",
            video: sampleVideo,
        });
    });

    test("play_video returns browser message when app attempt throws", async () => {
        mockSearchYoutube.mockResolvedValueOnce([sampleVideo]);
        mockCanOpenURL.mockRejectedValueOnce(new Error("linking failed"));
        mockOpenURL.mockResolvedValueOnce(undefined); // fallback open web

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "play_video")({
            query: "sample",
            autoPlay: true,
        });

        expect(mockOpenURL).toHaveBeenCalledWith("https://watch/abc123");
        expect(result).toEqual({
            success: true,
            message: "Opening in browser: Sample Video",
            video: sampleVideo,
        });
    });

    test("play_video with autoPlay=false returns mapped list only", async () => {
        mockSearchYoutube.mockResolvedValueOnce([
            sampleVideo,
            { ...sampleVideo, videoId: "def456", title: "Second", channelTitle: "Channel 2" },
        ]);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "play_video")({
            query: "sample",
            autoPlay: false,
        });

        expect(mockOpenURL).not.toHaveBeenCalled();
        expect(result).toEqual({
            success: true,
            results: [
                { title: "Sample Video", channel: "Sample Channel", videoId: "abc123" },
                { title: "Second", channel: "Channel 2", videoId: "def456" },
            ],
        });
    });

    test("play_video returns error when searchYoutube throws", async () => {
        mockSearchYoutube.mockRejectedValueOnce(new Error("youtube down"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "play_video")({
            query: "sample",
            autoPlay: true,
        });

        expect(result).toEqual({
            success: false,
            error: "youtube down",
        });
    });

    test("search_videos returns results on success", async () => {
        mockSearchYoutube.mockResolvedValueOnce([sampleVideo]);

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_videos")({
            query: "sample",
            maxResults: 3,
        });

        expect(mockSearchYoutube).toHaveBeenCalledWith("sample", 3);
        expect(result).toEqual({
            success: true,
            results: [sampleVideo],
        });
    });

    test("search_videos returns error on failure", async () => {
        mockSearchYoutube.mockRejectedValueOnce(new Error("search failed"));

        const tools = (await toolRegistry.getTools()) as Record<string, { execute?: unknown }>;
        const result = await getExecutor(tools, "search_videos")({
            query: "sample",
            maxResults: 3,
        });

        expect(result).toEqual({
            success: false,
            error: "search failed",
        });
    });
});