import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Settings, Plus, ListTodo } from "lucide-react-native";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStore } from "@/stores/chatStore";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const messages = useChatStore(state => state.messages);
    const clearMessages = useChatStore(state => state.clearMessages);

    const isEmpty = messages.length === 0;

    return (
        <View className="flex-1 bg-tokyo-bg" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="flex-row px-4 py-3 items-center justify-between border-b border-tokyo-bg-highlight">
                <View className="flex-row items-center gap-3">
                    <Image
                        source={require("../assets/tangent.png")}
                        style={{ width: 32, height: 32 }}
                    />
                    <Text className="text-tokyo-fg text-xl font-bold">Tangent</Text>
                </View>

                <View className="flex-row items-center gap-1">
                    {/* Tasks button */}
                    <TouchableOpacity
                        className="p-2 rounded-full active:bg-tokyo-bg-highlight"
                        onPress={() => router.push("/tasks")}
                        accessibilityLabel="Background tasks"
                    >
                        <ListTodo size={24} color="#c0caf5" />
                    </TouchableOpacity>

                    {messages.length > 0 && (
                        <TouchableOpacity
                            className="p-2 rounded-full active:bg-tokyo-bg-highlight"
                            onPress={clearMessages}
                            accessibilityLabel="New chat"
                        >
                            <Plus size={24} color="#7aa2f7" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        className="p-2 rounded-full active:bg-tokyo-bg-highlight"
                        onPress={() => router.push("/settings")}
                        accessibilityLabel="Settings"
                    >
                        <Settings size={24} color="#c0caf5" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Area */}
            {isEmpty ? (
                <KeyboardAwareScrollView
                    contentContainerStyle={{
                        flex: 1,
                        justifyContent: "center",
                        paddingHorizontal: 16,
                    }}
                    enableOnAndroid={true}
                    extraScrollHeight={20}
                    keyboardShouldPersistTaps="handled"
                >
                    <EmptyState />
                    <ChatInput centered />
                </KeyboardAwareScrollView>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <View style={{ flex: 1 }}>
                        <MessageList />
                    </View>
                    <View>
                        <ChatInput />
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

function EmptyState() {
    return (
        <View className="items-center mb-8">
            <Text className="text-tokyo-comment text-lg font-medium mb-2">
                What can I help you with?
            </Text>
            <Text className="text-tokyo-terminal text-sm text-center">
                Send messages, search files, check device info...
            </Text>
        </View>
    );
}
