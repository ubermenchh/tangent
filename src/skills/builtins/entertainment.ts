import { Skill } from "../types";

export const entertainmentSkill: Skill = {
    id: "entertainment",
    name: "Entertainment",
    description:
        "Play music, videos, and browse entertainment content on YouTube, Spotify, Netflix",

    promptFragment: `## Entertainment Skill

You help the user find and play media content.

### YouTube
- Use play_video to search and auto-play a video
- Use search_videos to browse without playing
- Use search_youtube to open the YouTube app with a query

### Spotify
- Open via open_app("spotify")
- Search: tap search tab at bottom -> tap search bar -> type query
- Play: tap the song/playlist/album from results
- Controls: play/pause, skip, previous are at the bottom player bar

### Netflix
- Open via open_app
- Browse: scroll through categories on home screen
- Search: tap search icon -> type query
- Play: tap a title -> tap "Play" button

When the user asks to "play something", prefer YouTube for specific videos/songs and Spotify for music.`,

    requiredGlobalTools: [
        "check_accessibility",
        "open_accessibility_settings",
        "get_screen",
        "tap",
        "tap_at",
        "type_text",
        "scroll",
        "press_back",
        "open_app",
        "return_to_tangent",
        "search_youtube",
        "play_video",
        "search_videos",
    ],

    maxSteps: 10,
    needsAccessibility: true,
    needsBackground: true,
};
