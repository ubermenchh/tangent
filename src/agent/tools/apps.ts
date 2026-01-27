import { z } from "zod";
import { Platform } from "react-native";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("AppsTools");

type LauncherKitModule = typeof import("react-native-launcher-kit");
let LauncherKit: LauncherKitModule | null = null;

async function getLauncherKit() {
    if (!LauncherKit) {
        LauncherKit = await import("react-native-launcher-kit");
    }
    return LauncherKit;
}

let cachedApps: Array<{ label: string; packageName: string }> | null = null;

toolRegistry.register("get_installed_apps", {
    description: "Get a list of all installed apps on the device.",
    parameters: z.object({
        search: z.string().optional().describe("Filter apps by name"),
    }),
    execute: async ({ search }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const { InstalledApps } = await getLauncherKit();

            if (!cachedApps) {
                const apps = await InstalledApps.getSortedApps({
                    includeVersion: false,
                    includeAccentColor: false,
                });
                cachedApps = apps.map(app => ({
                    label: app.label,
                    packageName: app.packageName,
                }));
            }

            let results = cachedApps;
            if (search) {
                const q = search.toLowerCase();
                results = cachedApps.filter(app => 
                    app.label.toLowerCase().includes(q)
                );
            }

            return { success: true, count: results.length, apps: results.slice(0, 20) };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("launch_app", {
    description: `Launch an app with optional intent parameters. Examples:
- Open app: { packageName: "com.spotify.music" }
- Open URL in Chrome: { packageName: "com.android.chrome", action: "VIEW", data: "https://example.com" }
- Navigate to location: { packageName: "com.google.android.apps.maps", action: "VIEW", data: "google.navigation:q=Times+Square,NYC" }
- Show location on map: { packageName: "com.google.android.apps.maps", action: "VIEW", data: "geo:40.7580,-73.9855?q=Times+Square" }
- Share text: { packageName: "com.whatsapp", action: "SEND", type: "text/plain", extras: { "android.intent.extra.TEXT": "Hello!" } }`,
    parameters: z.object({
        packageName: z.string().describe("Android package name (e.g., 'com.google.android.apps.maps')"),
        action: z.enum(["MAIN", "VIEW", "SEND"]).optional()
            .describe("Intent action: MAIN (default), VIEW (open content), SEND (share)"),
        data: z.string().optional()
            .describe("URI data (URL, geo coordinates, etc.)"),
        type: z.string().optional()
            .describe("MIME type (e.g., 'text/plain', 'image/*')"),
        extras: z.record(z.string(), z.string()).optional()
            .describe("Extra intent parameters as key-value pairs"),
    }),
    execute: async ({ packageName, action, data, type, extras }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const { RNLauncherKitHelper } = await getLauncherKit();

            const intentActions: Record<string, string> = {
                MAIN: "android.intent.action.MAIN",
                VIEW: "android.intent.action.VIEW",
                SEND: "android.intent.action.SEND",
            };

            if (action || data || type || extras) {
                const params: Record<string, unknown> = {};
                if (action) params.action = intentActions[action];
                if (data) params.data = data;
                if (type) params.type = type;
                if (extras) params.extras = extras;

                RNLauncherKitHelper.launchApplication(packageName, params);
                log.info(`Launched ${packageName} with params`, params);
            } else {
                RNLauncherKitHelper.launchApplication(packageName);
                log.info(`Launched ${packageName}`);
            }

            return { success: true, message: `Launched ${packageName}` };
        } catch (error) {
            return { error: `Failed to launch: ${error}` };
        }
    },
});

// Convenience tools for common actions
toolRegistry.register("open_in_maps", {
    description: "Open a location in Google Maps or start navigation.",
    parameters: z.object({
        query: z.string().describe("Location name or address (e.g., 'Times Square, NYC')"),
        navigate: z.boolean().optional().describe("Start turn-by-turn navigation instead of just showing location"),
        mode: z.enum(["driving", "walking", "bicycling", "transit"]).optional()
            .describe("Navigation mode (only used if navigate=true)"),
    }),
    execute: async ({ query, navigate, mode = "driving" }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const { RNLauncherKitHelper } = await getLauncherKit();
            const encodedQuery = encodeURIComponent(query);

            const data = navigate
                ? `google.navigation:q=${encodedQuery}&mode=${mode}`
                : `geo:0,0?q=${encodedQuery}`;

            RNLauncherKitHelper.launchApplication("com.google.android.apps.maps", {
                action: "android.intent.action.VIEW",
                data,
            });

            return {
                success: true,
                message: navigate
                    ? `Starting ${mode} navigation to ${query}`
                    : `Showing ${query} on map`,
            };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("open_in_browser", {
    description: "Open a URL in Chrome or the default browser.",
    parameters: z.object({
        url: z.string().describe("The URL to open"),
        useChrome: z.boolean().optional().describe("Force open in Chrome (default: true)"),
    }),
    execute: async ({ url, useChrome = true }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        try {
            const { RNLauncherKitHelper } = await getLauncherKit();
            
            let fullUrl = url;
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                fullUrl = `https://${url}`;
            }

            const packageName = useChrome ? "com.android.chrome" : "com.android.browser";

            RNLauncherKitHelper.launchApplication(packageName, {
                action: "android.intent.action.VIEW",
                data: fullUrl,
            });

            return { success: true, message: `Opening ${fullUrl}` };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});

toolRegistry.register("share_text", {
    description: "Share text content to an app like WhatsApp, Telegram, etc.",
    parameters: z.object({
        text: z.string().describe("The text to share"),
        app: z.enum(["whatsapp", "telegram", "twitter", "gmail", "any"]).optional()
            .describe("Target app (default: 'any' shows share picker)"),
    }),
    execute: async ({ text, app = "any" }) => {
        if (Platform.OS !== "android") {
            return { error: "Only available on Android" };
        }

        const appPackages: Record<string, string> = {
            whatsapp: "com.whatsapp",
            telegram: "org.telegram.messenger",
            twitter: "com.twitter.android",
            gmail: "com.google.android.gm",
        };

        try {
            const { RNLauncherKitHelper } = await getLauncherKit();

            const params = {
                action: "android.intent.action.SEND",
                type: "text/plain",
                extras: { "android.intent.extra.TEXT": text },
            };

            if (app !== "any" && appPackages[app]) {
                RNLauncherKitHelper.launchApplication(appPackages[app], params);
            } else {
                // This opens the system share sheet
                RNLauncherKitHelper.launchApplication("android", params);
            }

            return { success: true, message: `Sharing text${app !== "any" ? ` to ${app}` : ""}` };
        } catch (error) {
            return { error: `Failed: ${error}` };
        }
    },
});