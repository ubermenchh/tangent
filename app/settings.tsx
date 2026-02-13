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
import { SectionCard } from "@/components/ui/SectionCard";

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
                return "text-tokyo-comment";
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
            className="flex-1 bg-[#04050b]"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            <View pointerEvents="none" className="absolute inset-0">
                <View
                    className="absolute rounded-full bg-[#89a2ff]/15"
                    style={{ width: 220, height: 220, top: 40, right: -100 }}
                />
                <View
                    className="absolute rounded-full bg-[#8de0d4]/10"
                    style={{ width: 240, height: 240, bottom: 80, left: -120 }}
                />
            </View>

            <View className="min-h-[66px] flex-row items-center gap-3 border-b border-[#1a1d28] bg-[#060812]/90 px-4 py-3">
                <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full border border-[#2a2e3f] bg-[#111524]"
                    onPress={handleBack}
                    accessibilityLabel="Back"
                >
                    <ArrowLeft size={20} color="#e7ecff" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-2xl font-bold text-[#f1f4ff]">Settings</Text>
                    <Text className="text-xs text-[#9aa3c2]">
                        Privacy, permissions, and local intelligence
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-4"
                contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 32 }}
            >
                <SectionCard
                    title="Gemini API Key"
                    subtitle="Get your API key from Google AI Studio (aistudio.google.com)"
                    className="overflow-hidden rounded-[26px] border border-[#ffffff24] bg-[#0f1322]/90"
                    bodyClassName="pt-3"
                >
                    <View className="gap-3">
                        <View className="flex-row items-center gap-2">
                            <TextInput
                                className="flex-1 rounded-2xl border border-[#2b3147] bg-[#0b0e18] px-4 py-3 text-base text-[#ecf1ff]"
                                value={apiKey}
                                onChangeText={setApiKey}
                                placeholder="Enter your Gemini API key..."
                                placeholderTextColor="#7d85a1"
                                secureTextEntry={!showKey}
                            />
                            <TouchableOpacity
                                className="h-12 w-12 items-center justify-center rounded-2xl border border-[#2b3147] bg-[#0b0e18]"
                                onPress={() => setShowKey(!showKey)}
                            >
                                {showKey ? (
                                    <EyeOff size={20} color="#a0a8c8" />
                                ) : (
                                    <Eye size={20} color="#a0a8c8" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            className={cn(
                                "flex-row items-center justify-center gap-2 rounded-2xl border py-3.5",
                                hasChanges
                                    ? "border-[#8f9cff] bg-[#dfe4ff]"
                                    : "border-[#2d3348] bg-[#151a2a]"
                            )}
                            onPress={handleSave}
                            disabled={!hasChanges}
                        >
                            {saved && <Check size={18} color="#111426" />}
                            <Text
                                className={cn(
                                    "font-semibold",
                                    hasChanges ? "text-[#111426]" : "text-[#7f86a3]"
                                )}
                            >
                                {saved ? "Saved!" : "Save API Key"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SectionCard>

                <SectionCard
                    title="File Index"
                    subtitle="Index local files to enable natural language search"
                    right={<FolderSearch size={18} color="#d7deff" />}
                    className="overflow-hidden rounded-[26px] border border-[#ffffff24] bg-[#0f1322]/90"
                    bodyClassName="pt-3"
                >
                    <View className="gap-3">
                        <View className="rounded-2xl border border-[#2b3147] bg-[#0b0e18] p-4">
                            <View className="mb-3 flex-row items-center justify-between">
                                <Text className="text-sm text-[#a4aecf]">Files indexed</Text>
                                <Text className="text-sm font-medium text-[#ecf1ff]">
                                    {indexStats.count}
                                </Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm text-[#a4aecf]">Last updated</Text>
                                <Text className="text-sm font-medium text-[#ecf1ff]">
                                    {formatLastUpdated(indexStats.lastUpdated)}
                                </Text>
                            </View>
                        </View>

                        {isIndexing && indexProgress && (
                            <View className="rounded-2xl border border-[#4f5a85] bg-[#141a2d] p-4">
                                <View className="mb-2 flex-row items-center gap-3">
                                    <ActivityIndicator size="small" color="#b9c6ff" />
                                    <Text className="text-sm font-medium capitalize text-[#c9d3ff]">
                                        {indexProgress.phase}...
                                    </Text>
                                </View>
                                {indexProgress.phase === "embedding" && (
                                    <>
                                        <Text className="mb-1 text-xs text-[#b5bedc]">
                                            {indexProgress.current} / {indexProgress.total} files
                                        </Text>
                                        {indexProgress.file && (
                                            <Text
                                                className="text-xs text-[#8f97b2]"
                                                numberOfLines={1}
                                            >
                                                {indexProgress.file}
                                            </Text>
                                        )}
                                    </>
                                )}
                            </View>
                        )}

                        <View className="flex-row items-stretch gap-3">
                            <TouchableOpacity
                                className={cn(
                                    "flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3.5",
                                    isIndexing || !geminiApiKey
                                        ? "border-[#2d3348] bg-[#151a2a]"
                                        : "border-[#8f9cff] bg-[#dfe4ff]"
                                )}
                                onPress={handleStartIndexing}
                                disabled={isIndexing || !geminiApiKey}
                            >
                                {isIndexing ? (
                                    <ActivityIndicator size="small" color="#111426" />
                                ) : (
                                    <RefreshCw
                                        size={18}
                                        color={geminiApiKey ? "#111426" : "#7f86a3"}
                                    />
                                )}
                                <Text
                                    className={cn(
                                        "font-semibold",
                                        geminiApiKey ? "text-[#111426]" : "text-[#7f86a3]"
                                    )}
                                >
                                    {isIndexing ? "Indexing..." : "Start Indexing"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={cn(
                                    "items-center justify-center rounded-2xl border px-4 py-3",
                                    indexStats.count > 0
                                        ? "border-tokyo-red/40 bg-tokyo-red/20"
                                        : "border-[#2d3348] bg-[#151a2a]"
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

                        <Text className="text-xs leading-5 text-[#8f97b2]">
                            Scans Download, Documents, and DCIM folders for text files
                        </Text>
                    </View>
                </SectionCard>

                <SectionCard
                    title="Permissions"
                    subtitle="Grant permissions to enable all features"
                    right={<Shield size={18} color="#d7deff" />}
                    className="overflow-hidden rounded-[26px] border border-[#ffffff24] bg-[#0f1322]/90"
                    bodyClassName="pt-3"
                >
                    <View className="gap-3">
                        <View className="flex-row items-center justify-between rounded-2xl border border-[#2b3147] bg-[#0b0e18] p-4">
                            <View className="flex-1 flex-row items-center gap-3">
                                <MessageSquare size={22} color="#e7edff" />
                                <View className="flex-1">
                                    <Text className="text-base font-medium text-[#ecf1ff]">
                                        Send SMS
                                    </Text>
                                    <Text className={cn("text-sm", getStatusColor(smsPermission))}>
                                        {getStatusText(smsPermission)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className={cn(
                                    "min-w-[84px] rounded-full border px-4 py-2",
                                    smsPermission === "granted"
                                        ? "border-[#2d3348] bg-[#151a2a]"
                                        : "border-[#8f9cff] bg-[#dfe4ff]"
                                )}
                                onPress={
                                    smsPermission === "granted"
                                        ? () => Linking.openSettings()
                                        : requestSmsPermission
                                }
                            >
                                <Text
                                    className={cn(
                                        "text-center text-sm font-semibold",
                                        smsPermission === "granted"
                                            ? "text-[#a2abc8]"
                                            : "text-[#111426]"
                                    )}
                                >
                                    {smsPermission === "granted" ? "Manage" : "Grant"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center justify-between rounded-2xl border border-[#2b3147] bg-[#0b0e18] p-4">
                            <View className="flex-1 flex-row items-center gap-3">
                                <Users size={22} color="#e7edff" />
                                <View className="flex-1">
                                    <Text className="text-base font-medium text-[#ecf1ff]">
                                        Contacts
                                    </Text>
                                    <Text
                                        className={cn(
                                            "text-sm",
                                            getStatusColor(contactsPermission)
                                        )}
                                    >
                                        {getStatusText(contactsPermission)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className={cn(
                                    "min-w-[84px] rounded-full border px-4 py-2",
                                    contactsPermission === "granted"
                                        ? "border-[#2d3348] bg-[#151a2a]"
                                        : "border-[#8f9cff] bg-[#dfe4ff]"
                                )}
                                onPress={
                                    contactsPermission === "granted"
                                        ? () => Linking.openSettings()
                                        : requestContactsPermission
                                }
                            >
                                <Text
                                    className={cn(
                                        "text-center text-sm font-semibold",
                                        contactsPermission === "granted"
                                            ? "text-[#a2abc8]"
                                            : "text-[#111426]"
                                    )}
                                >
                                    {contactsPermission === "granted" ? "Manage" : "Grant"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SectionCard>

                {/* Info */}
                <SectionCard
                    title="About Tangent"
                    className="overflow-hidden rounded-[26px] border border-[#ffffff24] bg-[#0f1322]/90"
                    bodyClassName="pt-3"
                >
                    <Text className="text-sm leading-6 text-[#a9b3d2]">
                        Tangent uses Gemini to understand your requests and execute actions on your
                        phone. Your API key is stored securely on your device.
                    </Text>
                </SectionCard>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
