import { useState } from "react";
import { YStack, XStack, Text, H1, Input, Button } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Eye, EyeOff } from "@tamagui/lucide-icons";
import { useSettingsStore } from "@/stores/settingsStore";

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { geminiApiKey, setGeminiApiKey } = useSettingsStore();

    const [apiKey, setApiKey] = useState(geminiApiKey ?? "");
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        await setGeminiApiKey(apiKey.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const hasChanges = apiKey.trim() !== (geminiApiKey ?? "");

    return (
        <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
            {/* Header */}
            <XStack
                px="$4"
                py="$3"
                alignItems="center"
                gap="$3"
                borderBottomWidth={1}
                borderColor="$borderColor"
            >
                <Button size="$3" circular chromeless onPress={() => router.back()}>
                    <ArrowLeft size={24} color="$color" />
                </Button>
                <H1 color="$color" fontSize="$7" fontWeight="700">
                    Settings
                </H1>
            </XStack>

            {/* Content */}
            <YStack flex={1} px="$4" py="$4" gap="$6">
                {/* Gemini API Key Section */}
                <YStack gap="$3">
                    <Text color="$color" fontSize="$5" fontWeight="600">
                        Gemini API Key
                    </Text>
                    <Text color="$placeholderColor" fontSize="$3">
                        Get your API key from Google AI Studio (aistudio.google.com)
                    </Text>

                    <XStack gap="$2">
                        <Input
                            flex={1}
                            value={apiKey}
                            onChangeText={setApiKey}
                            placeholder="Enter your Gemini API key..."
                            placeholderTextColor="$placeholderColor"
                            secureTextEntry={!showKey}
                            bg="$backgroundHover"
                            borderWidth={1}
                            borderColor="$borderColor"
                            color="$color"
                            px="$4"
                            py="$3"
                            br="$4"
                            fontSize="$4"
                        />
                        <Button size="$4" circular chromeless onPress={() => setShowKey(!showKey)}>
                            {showKey ? (
                                <EyeOff size={20} color="$placeholderColor" />
                            ) : (
                                <Eye size={20} color="$placeholderColor" />
                            )}
                        </Button>
                    </XStack>

                    <Button
                        bg={hasChanges ? "$accentBackground" : "$backgroundHover"}
                        color={hasChanges ? "$accentColor" : "$placeholderColor"}
                        onPress={handleSave}
                        disabled={!hasChanges}
                        py="$3"
                        br="$4"
                    >
                        <XStack gap="$2" alignItems="center">
                            {saved && <Check size={18} />}
                            <Text fontWeight="600">{saved ? "Saved!" : "Save API Key"}</Text>
                        </XStack>
                    </Button>
                </YStack>

                {/* Info */}
                <YStack gap="$2" p="$4" bg="$backgroundHover" br="$4">
                    <Text color="$color" fontSize="$4" fontWeight="500">
                        About Tangent
                    </Text>
                    <Text color="$placeholderColor" fontSize="$3">
                        Tangent uses Gemini to understand your requests and execute actions on your
                        phone. Your API key is stored securely on your device.
                    </Text>
                </YStack>
            </YStack>
        </YStack>
    );
}
