import { useState, useEffect } from "react";
import { YStack, XStack, Text, H1, Input, Button } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Eye, EyeOff, MessageSquare, Users, Shield } from "@tamagui/lucide-icons";
import { useSettingsStore } from "@/stores/settingsStore";
import { PermissionsAndroid, Platform, Linking } from "react-native";
import * as Contacts from "expo-contacts";

type PermissionStatus = "granted" | "denied" | "undetermined";

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { geminiApiKey, setGeminiApiKey } = useSettingsStore();

    const [apiKey, setApiKey] = useState(geminiApiKey ?? "");
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    const [smsPermission, setSmsPermission] = useState<PermissionStatus>("undetermined");
    const [contactsPermission, setContactsPermission] = useState<PermissionStatus>("undetermined");

    useEffect(() => {
        const checkPermissions = async () => {
            if (Platform.OS !== "android") return;

            // Check SMS
            const smsStatus = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.SEND_SMS
            );
            setSmsPermission(smsStatus ? "granted" : "denied");

            // Check Contacts
            const contactsStatus = await Contacts.getPermissionsAsync();
            setContactsPermission(contactsStatus.granted ? "granted" : "denied");
        };

        checkPermissions();
    }, []);

    const requestSmsPermission = async () => {
        if (Platform.OS !== "android") return;

        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
            title: "SMS Permission",
            message: "Tangent needs permission to send SMS messages directly.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
        });

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
            setSmsPermission("granted");
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            // User selected "Never ask again", open settings
            Linking.openSettings();
        } else {
            setSmsPermission("denied");
        }
    };

    const requestContactsPermission = async () => {
        const result = await Contacts.requestPermissionsAsync();
        setContactsPermission(result.granted ? "granted" : "denied");

        if (!result.granted && !result.canAskAgain) {
            // User selected "Never ask again", open settings
            Linking.openSettings();
        }
    };

    const handleSave = async () => {
        await setGeminiApiKey(apiKey.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const hasChanges = apiKey.trim() !== (geminiApiKey ?? "");

    const getStatusColor = (status: PermissionStatus) => {
        switch (status) {
            case "granted":
                return "$success";
            case "denied":
                return "$error";
            default:
                return "$placeholderColor";
        }
    };

    const getStatusText = (status: PermissionStatus) => {
        switch (status) {
            case "granted":
                return "Granted";
            case "denied":
                return "Denied";
            default:
                return "Not requested";
        }
    };

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

                {/* Permissions Section */}
                <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                        <Shield size={20} color="$color" />
                        <Text color="$color" fontSize="$5" fontWeight="600">
                            Permissions
                        </Text>
                    </XStack>
                    <Text color="$placeholderColor" fontSize="$3">
                        Grant permissions to enable all features
                    </Text>

                    {/* SMS Permission */}
                    <XStack
                        bg="$backgroundHover"
                        p="$4"
                        br="$4"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <XStack gap="$3" alignItems="center" flex={1}>
                            <MessageSquare size={24} color="$color" />
                            <YStack flex={1}>
                                <Text color="$color" fontSize="$4" fontWeight="500">
                                    Send SMS
                                </Text>
                                <Text color={getStatusColor(smsPermission)} fontSize="$2">
                                    {getStatusText(smsPermission)}
                                </Text>
                            </YStack>
                        </XStack>
                        <Button
                            size="$3"
                            bg={
                                smsPermission === "granted"
                                    ? "$backgroundHover"
                                    : "$accentBackground"
                            }
                            onPress={
                                smsPermission === "granted"
                                    ? () => Linking.openSettings()
                                    : requestSmsPermission
                            }
                            br="$3"
                        >
                            <Text
                                color={
                                    smsPermission === "granted"
                                        ? "$placeholderColor"
                                        : "$accentColor"
                                }
                                fontSize="$3"
                                fontWeight="600"
                            >
                                {smsPermission === "granted" ? "Manage" : "Grant"}
                            </Text>
                        </Button>
                    </XStack>

                    {/* Contacts Permission */}
                    <XStack
                        bg="$backgroundHover"
                        p="$4"
                        br="$4"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <XStack gap="$3" alignItems="center" flex={1}>
                            <Users size={24} color="$color" />
                            <YStack flex={1}>
                                <Text color="$color" fontSize="$4" fontWeight="500">
                                    Contacts
                                </Text>
                                <Text color={getStatusColor(contactsPermission)} fontSize="$2">
                                    {getStatusText(contactsPermission)}
                                </Text>
                            </YStack>
                        </XStack>
                        <Button
                            size="$3"
                            bg={
                                contactsPermission === "granted"
                                    ? "$backgroundHover"
                                    : "$accentBackground"
                            }
                            onPress={
                                contactsPermission === "granted"
                                    ? () => Linking.openSettings()
                                    : requestContactsPermission
                            }
                            br="$3"
                        >
                            <Text
                                color={
                                    contactsPermission === "granted"
                                        ? "$placeholderColor"
                                        : "$accentColor"
                                }
                                fontSize="$3"
                                fontWeight="600"
                            >
                                {contactsPermission === "granted" ? "Manage" : "Grant"}
                            </Text>
                        </Button>
                    </XStack>
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
