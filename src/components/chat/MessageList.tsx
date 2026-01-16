import { useRef, useEffect } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useChatStore } from "@/stores/chatStore";
import { MessageBubble } from "./MessageBubble";

export function MessageList() {
    const messages = useChatStore(state => state.messages);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    if (messages.length === 0) {
        return (
            <View className="flex-1 justify-center items-center px-4">
                <Text className="text-zinc-500 text-lg text-center font-medium">
                    Start a conversation
                </Text>
                <Text className="text-zinc-500 text-sm mt-2 text-center opacity-70">
                    Ask me to do something on your phone
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
        >
            {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
            ))}
        </ScrollView>
    );
}
