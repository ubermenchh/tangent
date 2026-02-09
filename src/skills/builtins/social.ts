import { Skill } from "../types";

export const socialMediaSkill: Skill = {
    id: "social_media",
    name: "Social Media",
    description: "Control social media apps like Twitter/X, Instagram, WhatsApp, Telegram",

    promptFragment: `## Social Media Skill

You are controlling social media apps. Follow these app-specific patterns:

### Twitter / X
- Feed is on the home tab. Posts have author, text, and engagement counts.
- To post: tap compose button (usually "+" or pencil icon) -> type_text -> tap "Post"
- To like: tap the heart icon on a post
- To retweet: tap the retweet icon

### Instagram
- Feed is on the home tab. Stories are at the top, posts below.
- To post a story: tap your profile picture at the top left
- To send a DM: tap the messenger icon (top right)

### WhatsApp
- Chats list is the main screen. Tap a chat to open it.
- To send a message: tap the text field at the bottom, type_text, tap send arrow
- To search: tap the search icon at the top

When reading social feeds, summarize the key posts with author names and content.
Do not scroll more than 3 times unless the user explicitly asks for more.`,

    requiredGlobalTools: [
        "check_accessibility",
        "open_accessibility_settings",
        "get_screen",
        "tap",
        "tap_at",
        "type_text",
        "scroll",
        "press_back",
        "go_home",
        "wait",
        "open_app",
        "return_to_tangent",
        "send_whatsapp",
    ],

    maxSteps: 15,
    needsAccessibility: true,
    needsBackground: true,
    sensitiveActions: ["send_whatsapp"],
};
