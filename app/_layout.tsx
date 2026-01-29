import "../global.css";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSettingsStore } from "@/stores/settingsStore";
import * as SplashScreen from "expo-splash-screen";
import {
    useFonts,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

try {
    SplashScreen.preventAutoHideAsync();
} catch (e) {
    console.warn("SplashScreen.preventAutoHideAsync failed:", e);
}

export default function RootLayout() {
    const { loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
    const [fontLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        JetBrainsMono_400Regular,
    });

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    useEffect(() => {
        if (settingsLoaded) {
            SplashScreen.hideAsync().catch(console.warn);
        }
    }, [settingsLoaded]);

    if (!fontLoaded || !settingsLoaded) {
        return null;
    }

    if (!settingsLoaded) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <KeyboardProvider>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: "#1a1b26" },
                        animation: "fade",
                    }}
                />
            </KeyboardProvider>
        </SafeAreaProvider>
    );
}
