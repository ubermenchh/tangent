import { Image, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Settings, Plus, ListTodo } from "lucide-react-native";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStore } from "@/stores/chatStore";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import type { Message } from "@/types/message";

type HomeMode = "idle" | "conversation";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const messages = useChatStore(state => state.messages);
    const clearMessages = useChatStore(state => state.clearMessages);

    const isEmpty = messages.length === 0;
    const mode: HomeMode = isEmpty ? "idle" : "conversation";

    return (
        <View className="flex-1 bg-[#05060a]" style={{ paddingTop: insets.top }}>
            <Header
                hasMessages={messages.length > 0}
                onTasksPress={() => router.push("/tasks")}
                onSettingsPress={() => router.push("/settings")}
                onNewChatPress={clearMessages}
            />

            {mode === "idle" ? <IdleSurface /> : <ConversationSurface messages={messages} />}
        </View>
    );
}

function Header({
    hasMessages,
    onTasksPress,
    onSettingsPress,
    onNewChatPress,
}: {
    hasMessages: boolean;
    onTasksPress: () => void;
    onSettingsPress: () => void;
    onNewChatPress: () => void;
}) {
    return (
        <View className="min-h-[56px] flex-row items-center justify-between border-b border-[#1a1c24] bg-[#06070d]/95 px-4 py-2.5">
            <View className="flex-row items-center gap-3">
                <Image
                    source={require("../assets/tangent.png")}
                    style={{ width: 32, height: 32 }}
                />
                <Text className="text-xl font-bold text-[#e6ebff]">Tangent</Text>
            </View>

            <View className="flex-row items-center gap-2">
                <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full border border-[#2a2d39] bg-[#121420] active:bg-[#1b1f2b]"
                    onPress={onTasksPress}
                    accessibilityLabel="Background tasks"
                >
                    <ListTodo size={19} color="#d9def0" />
                </TouchableOpacity>

                {hasMessages && (
                    <TouchableOpacity
                        className="h-10 w-10 items-center justify-center rounded-full border border-[#5c668a] bg-[#2a3354] active:bg-[#33416e]"
                        onPress={onNewChatPress}
                        accessibilityLabel="New chat"
                    >
                        <Plus size={19} color="#dce4ff" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full border border-[#2a2d39] bg-[#121420] active:bg-[#1b1f2b]"
                    onPress={onSettingsPress}
                    accessibilityLabel="Settings"
                >
                    <Settings size={19} color="#d9def0" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function IdleSurface() {
    return (
        <View className="flex-1">
            <AmbientBackdrop />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <KeyboardAwareScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 16,
                        paddingTop: 36,
                        paddingBottom: 20,
                    }}
                    enableOnAndroid={true}
                    extraScrollHeight={32}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    <View style={{ flex: 1, justifyContent: "space-between" }}>
                        <EmptyState />
                        <ChatInput centered />
                    </View>
                </KeyboardAwareScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function ConversationSurface({ messages }: { messages: Message[] }) {
    const title = getConversationTitle(messages);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View className="min-h-[54px] items-center justify-center border-b border-[#171a24] px-4 py-2">
                <Text
                    className="text-center text-2xl font-semibold leading-8 tracking-tight text-[#f5f7ff]"
                    numberOfLines={1}
                >
                    {title}
                </Text>
            </View>

            <View style={{ flex: 1 }} className="bg-[#070810]">
                <MessageList />
            </View>
            <View className="bg-[#05060a]">
                <ChatInput />
            </View>
        </KeyboardAvoidingView>
    );
}

function AmbientBackdrop() {
    return (
        <View pointerEvents="none" className="absolute inset-0">
            <View
                className="absolute rounded-full bg-[#89a2ff]/20"
                style={{ width: 250, height: 250, top: 80, left: -120 }}
            />
            <View
                className="absolute rounded-full bg-[#8de0d4]/20"
                style={{ width: 220, height: 220, top: 220, right: -90 }}
            />
            <View
                className="absolute rounded-full bg-[#f2c6a7]/15"
                style={{ width: 200, height: 200, bottom: 30, left: 70 }}
            />
        </View>
    );
}

function EmptyState() {
    return (
        <View className="mx-1 mb-8 overflow-hidden rounded-[34px] border border-[#ffffff20] bg-[#8696a3]/65 px-7 py-8">
            <Text className="mb-1 text-sm font-medium text-[#f3f6ff]">your conscious</Text>
            <Text className="mb-3 text-[40px] font-semibold leading-[44px] tracking-tight text-[#f8faff]">
                What can I help you with?
            </Text>
            <Text className="text-base leading-6 text-[#ebefff]">
                Reflect with voice, type a quick thought, or ask Tangent to handle something for
                you.
            </Text>
        </View>
    );
}

function getConversationTitle(messages: Message[]): string {
    const firstUserMessage = messages.find(m => m.role === "user" && m.content.trim().length > 0);
    if (!firstUserMessage) return "conversation";

    const normalized = firstUserMessage.content.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized.length <= 38) return normalized;
    return `${normalized.slice(0, 35)}...`;
}
