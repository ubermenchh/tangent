import * as Clipboard from "expo-clipboard";
import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("ClipboardTools");

toolRegistry.register("get_clipboard", {
    description: "Get the current text content from teh clipboard",
    parameters: z.object({}),
    execute: async () => {
        log.info("Reading clipboard");
        try {
            const text = await Clipboard.getStringAsync();
            log.info(`Clipboard content: "${text.slice(0, 50)}..."`);
            return { success: true, content: text || "(empty)" };
        } catch (error) {
            log.error("Failed to read clipboard", error);
            return { success: false, error: "Failed to read clipboard" };
        }
    },
});

toolRegistry.register("set_clipboard", {
    description: "Copy text to the clipboard",
    parameters: z.object({
        text: z.string().describe("The text to copy to clipboard"),
    }),
    execute: async ({ text }) => {
        log.info(`Copying to clipboard: "${text.slice(0, 50)}..."`);
        try {
            await Clipboard.setStringAsync(text);
            log.info("Clipboard set successfully");
            return { success: true, message: "Copied to clipboard" };
        } catch (error) {
            log.error("Failed to set clipboard", error);
            return { success: false, error: "Failed to copy to clipboard" };
        }
    },
});
