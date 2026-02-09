import { Skill } from "../types";

export const instagramSkill: Skill = {
    id: "instagram",
    name: "Instagram",
    description: "Browse feed, view stories, send DMs, and search on Instagram",

    promptFragment: `## Instagram Skill

You are controlling the Instagram app. Follow these navigation patterns.

### Viewing the feed
- The home screen shows the feed with posts from followed accounts.
- Stories are at the top as circular profile pictures. Tap one to view.
- Each post shows the author name, image/video, caption, likes, and comments.
- Scroll down to see more posts.

### Viewing stories
- Stories appear as circles at the top of the home feed.
- Tap a profile picture to start viewing their story.
- Tap on the right side of the screen to go to the next story frame.
- Tap on the left side to go back.

### Sending a DM
- Tap the messenger/paper-plane icon at the top right of the home screen.
- This opens the DM inbox. Tap a conversation to open it.
- To send a new message: tap the search/compose bar, find the user, type message, tap send.
- NEVER send a DM without explicit user confirmation.

### Searching
- Tap the magnifying glass (Search) icon in the bottom navigation.
- Tap the search bar at the top and type_text the query.
- Results show accounts, tags, and places.

### Viewing a profile
- Tap on a username anywhere to view their profile.
- Profile shows bio, follower/following counts, and their posts grid.

### Navigation
- Bottom bar has: Home, Search, Reels, Shopping, Profile.
- Tap the icon to switch sections.

### Key rules
- Instagram is image-heavy. The accessibility tree may not describe image content -- summarize what text is available.
- When reading the feed, report: author, caption text (if visible), likes count.
- Do NOT call return_to_tangent or go_home in background tasks.`,

    requiredGlobalTools: [
        "check_accessibility",
        "open_accessibility_settings",
        "get_screen",
        "tap",
        "tap_at",
        "type_text",
        "scroll",
        "press_back",
        "wait",
        "open_app",
    ],

    maxSteps: 18,
    needsAccessibility: true,
    needsBackground: true,
};