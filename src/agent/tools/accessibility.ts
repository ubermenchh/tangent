import { z } from "zod";
import { Platform, NativeModules } from "react-native";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("AccessibilityTools");

const { TangentAccessibility } = NativeModules;

interface ScreenElement {
    id: string;
    class: string;
    text: string;
    description: string;
    bounds: string;
    centerX: number;
    centerY: number;
    clickable: boolean;
    scrollable: boolean;
    editable: boolean;
    enabled: boolean;
}

interface ScreenContent {
    packageName: string;
    elements: ScreenElement[];
    error?: string;
}

toolRegistry.register("check_accessibility", {
    description: "Check if the accessibility service is enabled. Must be enabled before using screen control tools.",
    parameters: z.object({}),
    execute: async () => {
        if (Platform.OS !== "android") {
            return { enabled: false, error: "Only available on Android" };
        }

        try {
            const enabled = await TangentAccessibility.isEnabled();
            return {
                enabled,
                message: enabled
                    ? "Accessibility service is enabled. You can now control the screen."
                    : "Accessibility service is NOT enabled. Use open_accessibility_settings and ask the user to enable Tangent.",
            };
        } catch (error) {
            return { enabled: false, error: `Failed to check: ${error}` };
        }
    },
});

toolRegistry.register("open_accessibility_settings", {
    description: "Open Android accessibility settings so the user can enable Tangent's accessibility service.",
    parameters: z.object({}),
    execute: async () => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            await TangentAccessibility.openSettings();
            return {
                success: true,
                message: "Opened accessibility settings. Ask the user to find 'Tangent' in the list and enable it.",
            };
        } catch (error) {
            return { error: `Failed to open settings: ${error}` };
        }
    },
});

toolRegistry.register("get_screen", {
    description: `Get the current screen content including all visible UI elements.
Returns a list of elements with their text, descriptions, and whether they're clickable/editable.
Use this to understand what's on screen before taking actions.`,
    parameters: z.object({}),
    execute: async () => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const json = await TangentAccessibility.getScreenContent();
            const content: ScreenContent = JSON.parse(json);

            if (content.error) {
                return { error: content.error };
            }

            const elements = content.elements
                .filter(el => el.text || el.description || el.clickable || el.editable)
                .map((el, index) => ({
                    index,
                    text: el.text || el.description || el.class,
                    clickable: el.clickable,
                    editable: el.editable,
                    scrollable: el.scrollable,
                }));

            log.info(`Screen has ${elements.length} interactive elements in ${content.packageName}`);

            return {
                app: content.packageName,
                elementCount: elements.length,
                elements: elements.slice(0, 50),
            };
        } catch (error) {
            log.error("Failed to get screen content", error);
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("tap", {
    description: `Tap on a UI element by its text or description.
Use get_screen first to see what elements are available.`,
    parameters: z.object({
        target: z.string().describe("Text or description of the element to tap"),
    }),
    execute: async ({ target }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const success = await TangentAccessibility.tapElement(target);
            log.info(`Tap on "${target}": ${success ? "success" : "failed"}`);
            return {
                success,
                message: success ? `Tapped "${target}"` : `Could not find element "${target}"`,
            };
        } catch (error) {
            return { error: `Failed to tap: ${error}` };
        }
    },
});

toolRegistry.register("tap_at", {
    description: "Tap at specific screen coordinates. Use when tap by text doesn't work.",
    parameters: z.object({
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
    }),
    execute: async ({ x, y }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const success = await TangentAccessibility.tapAt(x, y);
            return { success, message: success ? `Tapped at (${x}, ${y})` : "Tap failed" };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("type_text", {
    description: `Type text into the currently focused text field.
First tap on a text field to focus it, then use this to type.`,
    parameters: z.object({
        text: z.string().describe("Text to type"),
    }),
    execute: async ({ text }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const success = await TangentAccessibility.typeText(text);
            log.info(`Type "${text.slice(0, 20)}...": ${success ? "success" : "failed"}`);
            return {
                success,
                message: success ? `Typed "${text}"` : "No focused text field found. Tap a text field first.",
            };
        } catch (error) {
            return { error: `Failed to type: ${error}` };
        }
    },
});

toolRegistry.register("scroll", {
    description: "Scroll the current screen up or down.",
    parameters: z.object({
        direction: z.enum(["up", "down"]).describe("Scroll direction"),
    }),
    execute: async ({ direction }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const scrollDir = direction === "down" ? "down" : "up";
            const success = await TangentAccessibility.scroll(scrollDir);
            return {
                success,
                message: success ? `Scrolled ${direction}` : "No scrollable element found",
            };
        } catch (error) {
            return { error: `Failed to scroll: ${error}` };
        }
    },
});

toolRegistry.register("press_back", {
    description: "Press the Android back button.",
    parameters: z.object({}),
    execute: async () => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const success = await TangentAccessibility.pressBack();
            return { success, message: "Pressed back" };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("go_home", {
    description: "Press the Android home button to go to the home screen.",
    parameters: z.object({}),
    execute: async () => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const success = await TangentAccessibility.pressHome();
            return { success, message: "Went to home screen" };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("open_notifications", {
    description: "Open the notification shade.",
    parameters: z.object({}),
    execute: async () => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const success = await TangentAccessibility.openNotifications();
            return { success, message: "Opened notifications" };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});
