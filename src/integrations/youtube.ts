const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YoutubeSearchResult {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
}

interface YoutubeApiItem {
    id: { videoId: string };
    snippet: {
        title: string;
        channelTitle: string;
        thumbnails: {
            medium: { url: string };
        };
    };
}

export async function searchYoutube(query: string, maxResults = 5): Promise<YoutubeSearchResult[]> {
    const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

    if (!apiKey) {
        throw new Error("Youtube API key not configured");
    }

    const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        maxResults: String(maxResults),
        key: apiKey,
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.items.map((item: YoutubeApiItem) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
    }));
}

export function getYoutubeWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYoutubeAppUrl(videoId: string): string {
    return `vnd.youtube://${videoId}`;
}
