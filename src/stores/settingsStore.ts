import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { logger } from "@/lib/logger";

const log = logger.create("SettingsStore");

interface SettingsState {
    geminiApiKey: string | null;
    isLoaded: boolean;

    loadSettings: () => Promise<void>;
    setGeminiApiKey: (key: string) => Promise<void>;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const useSettingsStore = create<SettingsState>(set => ({
    geminiApiKey: null,
    isLoaded: false,

    loadSettings: async () => {
        log.debug("Loading settings from SecureStore");
        try {
        const geminiApiKey = await SecureStore.getItemAsync(GEMINI_KEY);
            log.info(`Settings loaded, API key: ${geminiApiKey ? "present" : "not set"}`);
        set({ geminiApiKey, isLoaded: true });
        } catch (error) {
            log.error("Failed to load settings", error);
            set({ isLoaded: true });
        }
    },

    setGeminiApiKey: async (key: string) => {
        log.debug("Saving Gemini API key");
        try {
        await SecureStore.setItemAsync(GEMINI_KEY, key);
            log.info("Gemini API key saved successfully");
        set({ geminiApiKey: key });
        } catch (error) {
            log.error("Failed to save Gemini API key", error);
            throw error;
        }
    },
}));
