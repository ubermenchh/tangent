import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

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
        const geminiApiKey = await SecureStore.getItemAsync(GEMINI_KEY);
        set({ geminiApiKey, isLoaded: true });
    },

    setGeminiApiKey: async (key: string) => {
        await SecureStore.setItemAsync(GEMINI_KEY, key);
        set({ geminiApiKey: key });
    },
}));
