import "../global.css";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSettingsStore } from "@/stores/settingsStore";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const { loadSettings, isLoaded: settingsLoaded } = useSettingsStore();

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    useEffect(() => {
        if (settingsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [settingsLoaded]);

    if (!settingsLoaded) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#111113" },
                }}
            />
        </SafeAreaProvider>
    );
}
