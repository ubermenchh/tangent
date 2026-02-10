import { Skill } from "../types";

export const whatsappSkill: Skill = {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Send messages, read chats, and search contacts on WhatsApp",

    promptFragment: `## WhatsApp Skill

You are controlling WhatsApp. Follow these exact navigation patterns.

### Opening a chat from the main screen
- The main screen shows a list of recent chats. Each chat row is a LinearLayout containing the contact name, timestamp, and last message preview.
- To open a specific chat: look for the contact name in the elements list, then tap the LinearLayout or FrameLayout ABOVE the contact name text (the clickable row container), NOT the name text itself (which is usually not clickable).
- If the contact is not visible in the recent chats, use search.

### Searching for a contact
- Tap "Search" (the clickable search button at the top, NOT "Ask Meta AI or Search" which is not clickable).
- After tapping Search, call get_screen to see the search input.
- Use type_text to type the contact name.
- Call get_screen to see search results.
- In results, tap the RelativeLayout or LinearLayout row next to the contact name to open the chat. Do NOT tap the contact name text or the picture -- tap the row container.

### Reading messages
- Once inside a chat, get_screen shows messages with sender name, text content, and timestamps.
- Messages from the contact show their name. Messages from you show "You".
- Summarize the last few visible messages with sender, content, and time.

### Sending a message
- Inside a chat, tap the "Message" field (editable text field at the bottom).
- Use type_text to type the message.
- The send button appears after typing. Look for a send arrow or button to tap.
- NEVER send a message without explicit user confirmation.

### Key rules
- WhatsApp has MANY elements (often 50-100+). Focus on elements with actual text content, ignore ViewGroup/FrameLayout/LinearLayout entries unless you need to tap a row.
- After finding the information the user asked for, summarize it immediately. Do not navigate further.
- Do NOT call return_to_tangent or go_home in background tasks -- just produce your summary as text.`,

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
        "send_whatsapp",
    ],

    maxSteps: 20,
    needsAccessibility: true,
    needsBackground: true,
    sensitiveActions: ["send_whatsapp"],
};
