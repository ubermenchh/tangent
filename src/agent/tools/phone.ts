import { z } from "zod";
import { Platform, NativeModules } from "react-native";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";
import { suppressBackgroundEscalation } from "@/lib/appState";

const log = logger.create("PhoneTools");
const { TangentAccessibility } = NativeModules;

let Linking: typeof import("expo-linking") | null = null;

async function getLinking() {
    if (!Linking) {
        Linking = await import("expo-linking");
    }
    return Linking;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const APP_SCHEMES: Record<string, string> = {
    spotify: "spotify://",
    youtube: "youtube://",
    maps: "geo:",
    settings: "app-settings:",
    chrome: "googlechrome://",
    twitter: "twitter://",
    x: "twitter://",
    instagram: "instagram://",
    whatsapp: "whatsapp://",
};

const APP_PACKAGES: Record<string, string> = {
    instagram: "com.instagram.android",
    twitter: "com.twitter.android",
    x: "com.twitter.android",
    whatsapp: "com.whatsapp",
    spotify: "com.spotify.music",
    youtube: "com.google.android.youtube",
    chrome: "com.android.chrome",
    maps: "com.google.android.apps.maps",
    gmail: "com.google.android.gm",
    telegram: "org.telegram.messenger",
    snapchat: "com.snapchat.android",
    facebook: "com.facebook.katana",
    tiktok: "com.zhiliaoapp.musically",
};

toolRegistry.register("open_app", {
    description: "Open an app and wait for it to appear in foreground",
    parameters: z.object({
        app: z.string().describe("App name, package name, or URL scheme"),
    }),
    execute: async ({ app }) => {
        const LinkingModule = await getLinking();
        const appLower = app.toLowerCase();

        const scheme = APP_SCHEMES[appLower];
        const packageName = APP_PACKAGES[appLower] || app;

        log.info(`Opening app: ${app}`);

        let launched = false;

        // Strategy 1: Native launch by package name (most reliable on Android)
        if (Platform.OS === "android" && TangentAccessibility?.launchApp && packageName) {
            try {
                suppressBackgroundEscalation(30000);
                launched = await TangentAccessibility.launchApp(packageName);
                if (launched) {
                    log.info(`App ${app} launched via native intent`);
                    return { success: true, message: `Opened ${app}` };
                }
            } catch {
                log.warn(`Native launchApp failed for ${packageName}`);
            }
        }

        // Strategy 2: URL scheme deep link
        if (!launched && scheme) {
            try {
                await LinkingModule.openURL(scheme);
                launched = true;
            } catch {
                log.warn(`URL scheme failed for ${scheme}`);
            }
        }

        // Strategy 3: Play Store (last resort -- app likely not installed)
        if (!launched) {
            try {
                await LinkingModule.openURL(`market://details?id=${packageName}`);
            } catch {
                return { success: false, message: `Could not open ${app}` };
            }
            return {
                success: true,
                message: `Opened store page for ${app} (app may not be installed)`,
            };
        }

        // Verify foreground
        if (Platform.OS === "android" && TangentAccessibility) {
            for (let i = 0; i < 10; i++) {
                await sleep(500);
                try {
                    const json = await TangentAccessibility.getScreenContent();
                    const content = JSON.parse(json);
                    if (
                        content.packageName?.includes(packageName) ||
                        content.packageName?.toLowerCase().includes(appLower)
                    ) {
                        log.info(`App ${app} is now in foreground`);
                        return { success: true, message: `Opened ${app}` };
                    }
                } catch {
                    // Continue polling
                }
            }
        }

        return { success: true, message: `Opened ${app} (could not verify foreground)` };
    },
});

toolRegistry.register("open_url", {
    description: "Open a URL in the default browser",
    parameters: z.object({
        url: z.string().describe("The URL to open"),
    }),
    execute: async ({ url }) => {
        log.info(`Opening URL: ${url}`);
        try {
            const LinkingModule = await getLinking();
            let fullUrl = url;
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                fullUrl = `https://${url}`;
            }
            await LinkingModule.openURL(fullUrl);
            return { success: true, message: `Opened ${fullUrl}` };
        } catch (error) {
            log.error("Failed to open URL", error);
            return { success: false, error: "Failed to open URL" };
        }
    },
});

toolRegistry.register("navigate_to", {
    description: "Open Google Maps with turn-by-turn navigation to a destination.",
    parameters: z.object({
        destination: z.string().describe("Address or place name"),
        mode: z
            .enum(["driving", "walking", "bicycling", "transit"])
            .optional()
            .describe("Navigation mode (default: driving)"),
    }),
    execute: async ({ destination, mode = "driving" }) => {
        const LinkingModule = await getLinking();
        const url = `google.navigation:q=${encodeURIComponent(destination)}&mode=${mode}`;

        try {
            await LinkingModule.openURL(url);
            return { success: true, message: `Starting ${mode} navigation to ${destination}` };
        } catch {
            // Fallback to web
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
            await LinkingModule.openURL(webUrl);
            return { success: true, message: `Opening directions to ${destination}` };
        }
    },
});

toolRegistry.register("send_whatsapp", {
    description: "Open WhatsApp with a pre-filled message to a phone number.",
    parameters: z.object({
        phoneNumber: z.string().describe("Phone number with country code (e.g., +1234567890)"),
        message: z.string().optional().describe("Pre-filled message"),
    }),
    execute: async ({ phoneNumber, message }) => {
        const LinkingModule = await getLinking();
        const number = phoneNumber.replace(/[^0-9]/g, "");
        let url = `whatsapp://send?phone=${number}`;
        if (message) {
            url += `&text=${encodeURIComponent(message)}`;
        }

        try {
            await LinkingModule.openURL(url);
            return { success: true, message: `Opened WhatsApp chat with ${phoneNumber}` };
        } catch {
            return { success: false, error: "WhatsApp not installed or couldn't open" };
        }
    },
});

toolRegistry.register("search_youtube", {
    description: "Open YouTube app with a search query.",
    parameters: z.object({
        query: z.string().describe("Search query"),
    }),
    execute: async ({ query }) => {
        const LinkingModule = await getLinking();
        const url = `youtube://results?search_query=${encodeURIComponent(query)}`;

        try {
            await LinkingModule.openURL(url);
            return { success: true, message: `Searching YouTube for "${query}"` };
        } catch {
            await LinkingModule.openURL(
                `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
            );
            return { success: true, message: `Searching YouTube for "${query}" in browser` };
        }
    },
});

toolRegistry.register("return_to_tangent", {
    description:
        "Return to the Tangent app from any other app. Use this after finishing a task in another app to come back and report results.",
    parameters: z.object({}),
    execute: async () => {
        log.info("Returning to Tangent");

        if (Platform.OS === "android" && TangentAccessibility?.launchApp) {
            try {
                const launched = await TangentAccessibility.launchApp("com.ubermenchh.tangent");
                if (launched) {
                    return { success: true, message: "Returned to Tangent" };
                }
            } catch {
                log.warn("Failed to return to Tangent via native launch");
            }
        }

        // Fallback: use deep link
        try {
            const LinkingModule = await getLinking();
            await LinkingModule.openURL("tangent://");
            return { success: true, message: "Returned to Tangent" };
        } catch {
            return { success: false, message: "Could not return to Tangent" };
        }
    },
});
