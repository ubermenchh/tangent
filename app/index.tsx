import { View, Text, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View
            className="flex-1 bg-zinc-950"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
            {/* Header */}
            <View className="flex-row px-4 py-3 items-center justify-between border-b border-zinc-800">
                <View className="flex-row items-center gap-3">
                    <Image
                        source={require("../assets/tangent.png")}
                        style={{ width: 32, height: 32 }}
                    />
                    <Text className="text-white text-xl font-bold">Tangent</Text>
                </View>

                <TouchableOpacity
                    className="p-2 rounded-full"
                    onPress={() => router.push("/settings")}
                >
                    <Settings size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <View className="flex-1">
                <MessageList />
            </View>

            {/* Input */}
            <ChatInput />
        </View>
    );
}
