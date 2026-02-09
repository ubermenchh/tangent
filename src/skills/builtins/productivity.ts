import { Skill } from "../types";

export const productivitySkill: Skill = {
    id: "productivity",
    name: "Productivity",
    description: "Manage reminders, notes, calendar events, and email",

    promptFragment: `## Productivity Skill

You help the user manage their time and tasks.

### Reminders
- Use schedule_reminder for time-based reminders
- Always confirm the delay with the user: "Reminder set for X minutes from now"
- Use get_scheduled_reminders to check existing reminders before creating duplicates

### Email (Gmail)
- Open Gmail via open_app("gmail")
- Compose: tap the compose/pencil FAB -> fill To, Subject, Body fields
- Reading: the inbox shows sender, subject, and preview
- NEVER send an email without explicit user confirmation

### Calendar
- Open Google Calendar via open_app
- To create event: tap "+" FAB -> fill in details
- To check schedule: read the current view (day/week/month)

### Notes
- Open Google Keep or similar via open_app
- To create: tap "+" or compose button
- To search: use the search bar at the top`,

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
        "schedule_reminder",
        "cancel_reminder",
        "get_scheduled_reminders",
        "search_contacts",
        "send_sms",
    ],

    maxSteps: 12,
    needsAccessibility: true,
    sensitiveActions: ["send_sms"],
};
