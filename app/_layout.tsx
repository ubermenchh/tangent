import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import { SafeAreaProvider } from "react-native-safe-area-context";

import config from "../tamagui.config";

import * as SplashScreen from "expo-splash-screen";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter: require("@tamagui/font-inter/otf/Inter-Regular.otf"),
        InterMedium: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
        InterSemiBold: require("@tamagui/font-inter/otf/Inter-SemiBold.otf"),
        InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <TamaguiProvider config={config}>
                <Theme name="dark">
                    <StatusBar style="light" />
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: "#111113" },
                        }}
                    />
                </Theme>
            </TamaguiProvider>
        </SafeAreaProvider>
    );
}
