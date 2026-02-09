import { Skill } from "../types";

export const facebookSkill: Skill = {
    id: "facebook",
    name: "Facebook",
    description: "Browse feed, check notifications, and search on Facebook",

    promptFragment: `## Facebook Skill

You are controlling the Facebook app. Follow these navigation patterns.

### Viewing the news feed
- The home screen shows the news feed with posts from friends and pages.
- Each post shows author name, timestamp, content text, and reaction/comment/share counts.
- Scroll down to see more posts.

### Checking notifications
- Tap the bell/notifications icon in the top navigation bar.
- Notifications show recent activity: likes, comments, friend requests, etc.

### Searching
- Tap the search icon at the top of the screen.
- Type the search query in the search field.
- Results show people, pages, groups, and posts.

### Viewing Messenger
- Tap the Messenger icon (chat bubble) at the top right.
- This opens recent conversations. Tap a conversation to read messages.
- NEVER send a message without explicit user confirmation.

### Posting
- Tap "What's on your mind?" at the top of the feed.
- Type the post content.
- Tap "Post" to publish.
- NEVER post without explicit user confirmation.

### Navigation
- Bottom tabs typically include: Home (News Feed), Watch, Marketplace, Notifications, Menu.

### Key rules
- Facebook has complex UIs with many nested elements. Focus on elements with meaningful text.
- Ignore generic layout entries (FrameLayout, LinearLayout, ViewGroup) unless tapping a row.
- When summarizing the feed, include: author, post content, and engagement stats.
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