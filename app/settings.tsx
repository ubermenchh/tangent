import { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Linking,
    Platform,
    PermissionsAndroid,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Check,
    Eye,
    EyeOff,
    MessageSquare,
    Users,
    Shield,
    FolderSearch,
    RefreshCw,
    Trash2,
} from "lucide-react-native";
import { useSettingsStore } from "@/stores/settingsStore";
import * as Contacts from "expo-contacts";
import { cn } from "@/lib/utils";
import { buildIndex, getIndexStats, clearIndex, IndexProgress } from "@/index/manager";

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

    const [indexStats, setIndexStats] = useState({ count: 0, lastUpdated: null as number | null });
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);

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
        refreshIndexStats();
    }, []);

    const refreshIndexStats = () => {
        const stats = getIndexStats();
        setIndexStats(stats);
    };

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

    const handleStartIndexing = async () => {
        if (!geminiApiKey) {
            alert("Please set your Gemini API key first");
            return;
        }

        setIsIndexing(true);
        setIndexProgress(null);

        requestAnimationFrame(async () => {
            try {
                await buildIndex(geminiApiKey, undefined, progress => {
                    setIndexProgress(progress);
                });
                refreshIndexStats();
            } catch (error) {
                console.error("Indexing error:", error);
                alert(
                    `Indexing failed: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            } finally {
                setIsIndexing(false);
                setIndexProgress(null);
            }
        });
    };

    const handleClearIndex = () => {
        clearIndex();
        refreshIndexStats();
    };

    const hasChanges = apiKey.trim() !== (geminiApiKey ?? "");

    const getStatusColor = (status: PermissionStatus) => {
        switch (status) {
            case "granted":
                return "text-tokyo-green";
            case "denied":
                return "text-tokyo-red";
            default:
                return "text-tokyo-fg-comment";
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

    const formatLastUpdated = (timestamp: number | null) => {
        if (!timestamp) return "Never";
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-tokyo-bg"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            {/* Header */}
            <View className="flex-row px-4 py-3 items-center gap-3 border-b border-tokyo-bg-hightlight">
                <TouchableOpacity className="p-2 rounded-full" onPress={handleBack}>
                    <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-tokyo-fg text-2xl font-bold">Settings</Text>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ gap: 24 }}>
                {/* Gemini API Key Section */}
                <View className="gap-3">
                    <Text className="text-tokyo-fg text-lg font-semibold">Gemini API Key</Text>
                    <Text className="text-tokyo-fg-dark text-sm">
                        Get your API key from Google AI Studio (aistudio.google.com)
                    </Text>

                    <View className="flex-row gap-2">
                        <TextInput
                            className="flex-1 bg-tokyo-storm text-tokyo-fg px-4 py-3 rounded-xl text-base border border-tokyo-terminal"
                            value={apiKey}
                            onChangeText={setApiKey}
                            placeholder="Enter your Gemini API key..."
                            placeholderTextColor="#565f89"
                            secureTextEntry={!showKey}
                        />
                        <TouchableOpacity
                            className="w-12 items-center justify-center"
                            onPress={() => setShowKey(!showKey)}
                        >
                            {showKey ? (
                                <EyeOff size={20} color="#565f89" />
                            ) : (
                                <Eye size={20} color="#565f89" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        className={cn(
                            "py-3 rounded-xl items-center flex-row justify-center gap-2",
                            hasChanges ? "bg-tokyo-blue" : "bg-tokyo-bg-highlight"
                        )}
                        onPress={handleSave}
                        disabled={!hasChanges}
                    >
                        {saved && <Check size={18} color="white" />}
                        <Text
                            className={cn(
                                "font-semibold",
                                hasChanges ? "text-tokyo-fg" : "text-tokyo-fg-comment"
                            )}
                        >
                            {saved ? "Saved!" : "Save API Key"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* File Indexing Section */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                        <FolderSearch size={20} color="white" />
                        <Text className="text-tokyo-fg text-lg font-semibold">File Index</Text>
                    </View>
                    <Text className="text-tokyo-fg-dark text-sm">
                        Index local files to enable natural language search
                    </Text>

                    {/* Index Stats */}
                    <View className="bg-tokyo-storm p-4 rounded-xl border border-tokyo-bg-hightlight">
                        <View className="flex-row justify-between mb-3">
                            <Text className="text-tokyo-fg-dark text-sm">Files indexed</Text>
                            <Text className="text-tokyo-fg text-sm font-medium">
                                {indexStats.count}
                            </Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-tokyo-fg-dark text-sm">Last updated</Text>
                            <Text className="text-tokyo-fg text-sm font-medium">
                                {formatLastUpdated(indexStats.lastUpdated)}
                            </Text>
                        </View>
                    </View>

                    {/* Progress indicator */}
                    {isIndexing && indexProgress && (
                        <View className="bg-tokyo-storm p-4 rounded-xl border border-tokyo-blue">
                            <View className="flex-row items-center gap-3 mb-2">
                                <ActivityIndicator size="small" color="#7aa2f7" />
                                <Text className="text-tokyo-blue text-sm font-medium capitalize">
                                    {indexProgress.phase}...
                                </Text>
                            </View>
                            {indexProgress.phase === "embedding" && (
                                <>
                                    <Text className="text-tokyo-fg-dark text-xs mb-1">
                                        {indexProgress.current} / {indexProgress.total} files
                                    </Text>
                                    {indexProgress.file && (
                                        <Text
                                            className="text-tokyo-fg-comment text-xs"
                                            numberOfLines={1}
                                        >
                                            {indexProgress.file}
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {/* Action buttons */}
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className={cn(
                                "flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2",
                                isIndexing || !geminiApiKey
                                    ? "bg-tokyo-bg-highlight"
                                    : "bg-tokyo-blue"
                            )}
                            onPress={handleStartIndexing}
                            disabled={isIndexing || !geminiApiKey}
                        >
                            {isIndexing ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <RefreshCw size={18} color={geminiApiKey ? "white" : "#565f89"} />
                            )}
                            <Text
                                className={cn(
                                    "font-semibold",
                                    geminiApiKey ? "text-tokyo-fg" : "text-tokyo-fg-comment"
                                )}
                            >
                                {isIndexing ? "Indexing..." : "Start Indexing"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={cn(
                                "px-4 py-3 rounded-xl items-center justify-center",
                                indexStats.count > 0 ? "bg-tokyo-red/20" : "bg-tokyo-bg-highlight"
                            )}
                            onPress={handleClearIndex}
                            disabled={indexStats.count === 0 || isIndexing}
                        >
                            <Trash2
                                size={18}
                                color={indexStats.count > 0 ? "#f7768e" : "#565f89"}
                            />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-tokyo-comment text-xs">
                        Scans Download, Documents, and DCIM folders for text files
                    </Text>
                </View>

                {/* Permissions Section */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                        <Shield size={20} color="white" />
                        <Text className="text-tokyo-fg text-lg font-semibold">Permissions</Text>
                    </View>
                    <Text className="text-tokyo-fg-dark text-sm">
                        Grant permissions to enable all features
                    </Text>

                    {/* SMS Permission */}
                    <View className="bg-tokyo-storm p-4 rounded-xl flex-row justify-between items-center border border-tokyo-bg-hightlight">
                        <View className="flex-row gap-3 items-center flex-1">
                            <MessageSquare size={24} color="white" />
                            <View className="flex-1">
                                <Text className="text-tokyo-fg text-base font-medium">
                                    Send SMS
                                </Text>
                                <Text className={cn("text-sm", getStatusColor(smsPermission))}>
                                    {getStatusText(smsPermission)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className={cn(
                                "px-4 py-2 rounded-lg",
                                smsPermission === "granted"
                                    ? "bg-tokyo-bg-highlight"
                                    : "bg-tokyo-blue"
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
                                    smsPermission === "granted"
                                        ? "text-tokyo-fg-dark"
                                        : "text-tokyo-fg"
                                )}
                            >
                                {smsPermission === "granted" ? "Manage" : "Grant"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Contacts Permission */}
                    <View className="bg-tokyo-storm p-4 rounded-xl flex-row justify-between items-center border border-tokyo-bg-hightlight">
                        <View className="flex-row gap-3 items-center flex-1">
                            <Users size={24} color="white" />
                            <View className="flex-1">
                                <Text className="text-tokyo-fg text-base font-medium">
                                    Contacts
                                </Text>
                                <Text className={cn("text-sm", getStatusColor(contactsPermission))}>
                                    {getStatusText(contactsPermission)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            className={cn(
                                "px-4 py-2 rounded-lg",
                                contactsPermission === "granted"
                                    ? "bg-tokyo-bg-highlight"
                                    : "bg-tokyo-blue"
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
                                        ? "text-tokyo-fg-dark"
                                        : "text-tokyo-fg"
                                )}
                            >
                                {contactsPermission === "granted" ? "Manage" : "Grant"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info */}
                <View className="p-4 bg-tokyo-storm rounded-xl border border-tokyo-bg-hightlight gap-2">
                    <Text className="text-tokyo-fg text-base font-medium">About Tangent</Text>
                    <Text className="text-tokyo-fg-dark text-sm">
                        Tangent uses Gemini to understand your requests and execute actions on your
                        phone. Your API key is stored securely on your device.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
