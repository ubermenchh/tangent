import { Skill } from "../types";

export const twitterSkill: Skill = {
    id: "twitter",
    name: "Twitter / X",
    description: "Browse timeline, read tweets, post, like, and retweet on Twitter/X",

    promptFragment: `## Twitter / X Skill

You are controlling the Twitter (X) app. Follow these navigation patterns.

### Reading the timeline
- The home screen shows the "For you" feed by default. Tabs at the top include "For you", "Following", and custom lists.
- Each tweet element contains the full tweet text with author (@handle), content, timestamp, and engagement stats (replies, reposts, likes, views).
- To read more tweets, scroll("down") then get_screen.
- Summarize tweets with: author name, handle, content summary, and key engagement numbers.
- Do not scroll more than 3 times unless the user explicitly asks for more.

### Posting a tweet
- Tap "New post" (the compose FAB, usually at the bottom right).
- Use type_text to write the tweet content.
- Tap "Post" to publish.
- NEVER post without explicit user confirmation.

### Interacting with tweets
- To like: the heart icon is part of the tweet element. Use tap_at with coordinates if tap by text fails.
- To retweet: tap the retweet icon on the tweet.
- To reply: tap the reply icon, then type_text, then tap "Reply".

### Searching
- Tap "Search and Explore" in the bottom navigation bar.
- Type in the search field that appears.

### Navigation
- Bottom bar has: Home, Search and Explore, Grok, Notifications, Chat.
- Tap the tab name to switch sections.

### Key rules
- Tweet elements often contain all metadata in one long text block. Parse it to extract author, content, and stats.
- Ignore elements with text "ViewGroup" or duplicate tab labels.
- After gathering the requested information, summarize immediately. Do not navigate away.
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
