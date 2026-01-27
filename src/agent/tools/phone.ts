import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("PhoneTools");

let Linking: typeof import("expo-linking") | null = null;

async function getLinking() {
    if (!Linking) {
        Linking = await import("expo-linking");
    }
    return Linking;
}

toolRegistry.register("make_phone_call", {
    description: "Initiate a phone call to a number. Opens the phone dialer.",
    parameters: z.object({
        phoneNumber: z.string().describe("The phone number to call"),
    }),
    execute: async ({ phoneNumber }) => {
        log.info(`Initiating call to: ${phoneNumber}`);
        try {
            const LinkingModule = await getLinking();
            const url = `tel:${phoneNumber.replace(/\s/g, "")}`;
            const canOpen = await LinkingModule.canOpenURL(url);
            if (!canOpen) {
                return { success: false, error: "Cannot open phone dialer" };
            }
            await LinkingModule.openURL(url);
            return { success: true, message: `Opening dialer for ${phoneNumber}` };
        } catch (error) {
            log.error("Failed to initiate call", error);
            return { success: false, error: "Failed to open phone dialer" };
        }
    },
});

toolRegistry.register("open_app", {
    description: "Open an app using its URL scheme or package name",
    parameters: z.object({
        app: z
            .string()
            .describe("App name or URL scheme (e.g., 'spotify', 'youtube', 'maps', 'settings')"),
        query: z.string().optional().describe("Optional search query or location for maps"),
    }),
    execute: async ({ app, query }) => {
        log.info(`Opening app: ${app}${query ? ` with query: ${query}` : ""}`);

        const LinkingModule = await getLinking();

        const apps: Record<string, { scheme: string; package: string }> = {
            spotify: {
                scheme: query ? `spotify://search/${encodeURIComponent(query)}` : "spotify://",
                package: "com.spotify.music",
            },
            youtube: {
                scheme: query
                    ? `youtube://results?search_query=${encodeURIComponent(query)}`
                    : "youtube://",
                package: "com.google.android.youtube",
            },
            twitter: { scheme: "twitter://", package: "com.twitter.android" },
            x: { scheme: "twitter://", package: "com.twitter.android" },
            instagram: { scheme: "instagram://", package: "com.instagram.android" },
            whatsapp: { scheme: "whatsapp://", package: "com.whatsapp" },
            telegram: { scheme: "tg://", package: "org.telegram.messenger" },
            chrome: { scheme: "googlechrome://", package: "com.android.chrome" },
            gmail: { scheme: "googlegmail://", package: "com.google.android.gm" },
            maps: {
                scheme: query ? `geo:0,0?q=${encodeURIComponent(query)}` : "geo:",
                package: "com.google.android.apps.maps",
            },
            settings: { scheme: "package:com.android.settings", package: "com.android.settings" },
            camera: { scheme: "", package: "com.android.camera" },
            calendar: {
                scheme: "content://com.android.calendar",
                package: "com.google.android.calendar",
            },
            clock: { scheme: "", package: "com.google.android.deskclock" },
            calculator: { scheme: "", package: "com.google.android.calculator" },
            files: { scheme: "", package: "com.google.android.documentsui" },
            contacts: {
                scheme: "content://contacts/people",
                package: "com.google.android.contacts",
            },
            phone: { scheme: "tel:", package: "com.google.android.dialer" },
            messages: { scheme: "sms:", package: "com.google.android.apps.messaging" },
        };

        const appLower = app.toLowerCase();
        const appConfig = apps[appLower];

        try {
            if (appConfig?.scheme) {
                const canOpen = await LinkingModule.canOpenURL(appConfig.scheme);
                if (canOpen) {
                    await LinkingModule.openURL(appConfig.scheme);
                    log.info(`Opened ${app} via scheme`);
                    return { success: true, message: `Opened ${app}` };
                }
            }

            // Fallback to Android package launch
            const packageName = appConfig?.package || `com.${appLower}`;
            const marketUrl = `market://launch?id=${packageName}`;

            try {
                await LinkingModule.openURL(marketUrl);
                log.info(`Opened ${app} via market launch`);
                return { success: true, message: `Opened ${app}` };
            } catch {
                // Last resort: open in Play Store
                const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
                await LinkingModule.openURL(playStoreUrl);
                return { success: true, message: `Opening ${app} in Play Store` };
            }
        } catch (error) {
            log.error(`Failed to open ${app}`, error);
            return { success: false, error: `Could not open ${app}` };
        }
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
