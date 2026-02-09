import { Skill } from "../types";

export const navigationSkill: Skill = {
    id: "navigation",
    name: "Navigation",
    description: "Get directions, navigate, and manage transportation via Maps, Uber, Ola",

    promptFragment: `## Navigation Skill

You help the user get around.

### Google Maps
- Use navigate_to for direct turn-by-turn navigation
- Supported modes: driving, walking, bicycling, transit
- For place lookups without navigation, use web_search

### Uber / Ola
- Open via open_app -> get_screen to see the home screen
- Enter destination in the "Where to?" field
- Browse ride options and report prices
- NEVER confirm a ride without explicit user permission

Always clarify the travel mode if the user doesn't specify.
When showing directions, mention estimated time if visible on screen.`,

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
        "navigate_to",
        "open_url",
        "web_search",
    ],

    maxSteps: 12,
    needsAccessibility: true,
    needsBackground: true,
};
