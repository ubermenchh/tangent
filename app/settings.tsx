import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Linking,
    Platform,
    PermissionsAndroid,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { ArrowLeft, Check, Eye, EyeOff, MessageSquare, Users, Shield } from "lucide-react-native";
import { useSettingsStore } from "@/stores/settingsStore";
import * as Contacts from "expo-contacts";
import { cn } from "@/lib/utils";

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
            Linking.openSettings();
        } else {
            setSmsPermission("denied");
        }
    };

    const requestContactsPermission = async () => {
        const result = await Contacts.requestPermissionsAsync();
        setContactsPermission(result.granted ? "granted" : "denied");

        if (!result.granted && !result.canAskAgain) {
            Linking.openSettings();
        }
    };

    const handleSave = async () => {
        await setGeminiApiKey(apiKey.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/");
        }
    };

    const hasChanges = apiKey.trim() !== (geminiApiKey ?? "");

    const getStatusColor = (status: PermissionStatus) => {
        switch (status) {
            case "granted":
                return "text-green-500";
            case "denied":
                return "text-red-500";
            default:
                return "text-zinc-500";
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
        <View
            className="flex-1 bg-zinc-950"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            {/* Header */}
            <View className="flex-row px-4 py-3 items-center gap-3 border-b border-zinc-800">
                <TouchableOpacity className="p-2 rounded-full" onPress={handleBack}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-2xl font-bold">Settings</Text>
            </View>

            {/* Content */}
            <View className="flex-1 px-4 py-4 gap-6">
                {/* Gemini API Key Section */}
                <View className="gap-3">
                    <Text className="text-white text-lg font-semibold">Gemini API Key</Text>
                    <Text className="text-zinc-400 text-sm">
                        Get your API key from Google AI Studio (aistudio.google.com)
                    </Text>

                    <View className="flex-row gap-2">
                        <TextInput
                            className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl text-base border border-zinc-700"
                            value={apiKey}
                            onChangeText={setApiKey}
                            placeholder="Enter your Gemini API key..."
                            placeholderTextColor="#71717a"
                            secureTextEntry={!showKey}
                        />
                        <TouchableOpacity
                            className="w-12 items-center justify-center"
                            onPress={() => setShowKey(!showKey)}
                        >
                            {showKey ? (
                                <EyeOff size={20} color="#71717a" />
                            ) : (
                                <Eye size={20} color="#71717a" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        className={cn(
                            "py-3 rounded-xl items-center flex-row justify-center gap-2",
                            hasChanges ? "bg-blue-600" : "bg-zinc-800"
                        )}
                        onPress={handleSave}
                        disabled={!hasChanges}
                    >
                        {saved && <Check size={18} color="white" />}
                        <Text
                            className={cn(
                                "font-semibold",
                                hasChanges ? "text-white" : "text-zinc-500"
                            )}
                        >
                            {saved ? "Saved!" : "Save API Key"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Permissions Section */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                        <Shield size={20} color="white" />
                        <Text className="text-white text-lg font-semibold">Permissions</Text>
                    </View>
                    <Text className="text-zinc-400 text-sm">
                        Grant permissions to enable all features
                    </Text>

                    {/* SMS Permission */}
                    <View className="bg-zinc-900 p-4 rounded-xl flex-row justify-between items-center border border-zinc-800">
                        <View className="flex-row gap-3 items-center flex-1">
                            <MessageSquare size={24} color="white" />
                            <View className="flex-1">
                                <Text className="text-white text-base font-medium">Send SMS</Text>
                                <Text className={cn("text-sm", getStatusColor(smsPermission))}>
                                    {getStatusText(smsPermission)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className={cn(
                                "px-4 py-2 rounded-lg",
                                smsPermission === "granted" ? "bg-zinc-800" : "bg-blue-600"
                            )}
                            onPress={
                                smsPermission === "granted"
                                    ? () => Linking.openSettings()
                                    : requestSmsPermission
                            }
                        >
                            <Text
                                className={cn(
                                    "text-sm font-semibold",
                                    smsPermission === "granted" ? "text-zinc-400" : "text-white"
                                )}
                            >
                                {smsPermission === "granted" ? "Manage" : "Grant"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Contacts Permission */}
                    <View className="bg-zinc-900 p-4 rounded-xl flex-row justify-between items-center border border-zinc-800">
                        <View className="flex-row gap-3 items-center flex-1">
                            <Users size={24} color="white" />
                            <View className="flex-1">
                                <Text className="text-white text-base font-medium">Contacts</Text>
                                <Text className={cn("text-sm", getStatusColor(contactsPermission))}>
                                    {getStatusText(contactsPermission)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className={cn(
                                "px-4 py-2 rounded-lg",
                                contactsPermission === "granted" ? "bg-zinc-800" : "bg-blue-600"
                            )}
                            onPress={
                                contactsPermission === "granted"
                                    ? () => Linking.openSettings()
                                    : requestContactsPermission
                            }
                        >
                            <Text
                                className={cn(
                                    "text-sm font-semibold",
                                    contactsPermission === "granted"
                                        ? "text-zinc-400"
                                        : "text-white"
                                )}
                            >
                                {contactsPermission === "granted" ? "Manage" : "Grant"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info */}
                <View className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 gap-2">
                    <Text className="text-white text-base font-medium">About Tangent</Text>
                    <Text className="text-zinc-400 text-sm">
                        Tangent uses Gemini to understand your requests and execute actions on your
                        phone. Your API key is stored securely on your device.
                    </Text>
                </View>
            </View>
        </View>
    );
}
