import { getYoutubeAppUrl, getYoutubeWatchUrl, searchYoutube } from "@/integrations/youtube";

describe("youtube integration", () => {
    const originalYoutubeApiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch = jest.fn();
        (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;
    });

    afterEach(() => {
        if (originalYoutubeApiKey === undefined) {
            delete process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
        } else {
            process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = originalYoutubeApiKey;
        }
    });

    test("searchYoutube throws when API key is not configured", async () => {
        delete process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

        await expect(searchYoutube("lofi")).rejects.toThrow("Youtube API key not configured");
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test("searchYoutube calls YouTube API with expected query params and maps results", async () => {
        process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = "yt-key-123";

        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                items: [
                    {
                        id: { videoId: "abc123" },
                        snippet: {
                            title: "Lofi Mix",
                            channelTitle: "Beats Channel",
                            thumbnails: { medium: { url: "https://img/abc.jpg" } },
                        },
                    },
                    {
                        id: { videoId: "def456" },
                        snippet: {
                            title: "Coding Music",
                            channelTitle: "Focus Channel",
                            thumbnails: { medium: { url: "https://img/def.jpg" } },
                        },
                    },
                ],
            }),
        });

        const results = await searchYoutube("lofi beats", 2);

        expect(mockFetch).toHaveBeenCalledTimes(1);

        const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
        const parsed = new URL(calledUrl);

        expect(`${parsed.origin}${parsed.pathname}`).toBe(
            "https://www.googleapis.com/youtube/v3/search"
        );
        expect(parsed.searchParams.get("part")).toBe("snippet");
        expect(parsed.searchParams.get("q")).toBe("lofi beats");
        expect(parsed.searchParams.get("type")).toBe("video");
        expect(parsed.searchParams.get("maxResults")).toBe("2");
        expect(parsed.searchParams.get("key")).toBe("yt-key-123");

        expect(results).toEqual([
            {
                videoId: "abc123",
                title: "Lofi Mix",
                channelTitle: "Beats Channel",
                thumbnail: "https://img/abc.jpg",
            },
            {
                videoId: "def456",
                title: "Coding Music",
                channelTitle: "Focus Channel",
                thumbnail: "https://img/def.jpg",
            },
        ]);
    });

    test("searchYoutube throws API error message from response payload", async () => {
        process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = "yt-key-123";

        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                error: {
                    message: "quota exceeded",
                },
            }),
        });

        await expect(searchYoutube("anything")).rejects.toThrow("quota exceeded");
    });

    test("getYoutubeWatchUrl returns correct watch URL", () => {
        expect(getYoutubeWatchUrl("abc123")).toBe("https://www.youtube.com/watch?v=abc123");
    });

    test("getYoutubeAppUrl returns correct app URL", () => {
        expect(getYoutubeAppUrl("abc123")).toBe("vnd.youtube://abc123");
    });
});
