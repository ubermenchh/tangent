import { toolRegistry } from "./registry";

async function safeLoad(
    name: string,
    loader: () => Promise<unknown>
): Promise<void> {
    try {
        await loader();
    } catch (error) {
        console.warn(`[Tools] Failed to load ${name}:`, error);
    }
}

toolRegistry.registerLoader(() => safeLoad("device", () => import("./device")));
toolRegistry.registerLoader(() => safeLoad("contacts", () => import("./contacts")));
toolRegistry.registerLoader(() => safeLoad("sms", () => import("./sms")));
toolRegistry.registerLoader(() => safeLoad("files", () => import("./files")));
toolRegistry.registerLoader(() => safeLoad("clipboard", () => import("./clipboard")));
toolRegistry.registerLoader(() => safeLoad("phone", () => import("./phone")));
toolRegistry.registerLoader(() => safeLoad("notifications", () => import("./notifications")));
toolRegistry.registerLoader(() => safeLoad("youtube", () => import("./youtube")));

export { toolRegistry } from "./registry";
