import { useRef, useEffect } from "react";
import { ScrollView } from "react-native";
import { YStack, Text } from "tamagui";
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
            <YStack flex={1} justifyContent="center" alignItems="center" px="$4">
                <Text color="$placeholderColor" fontSize="$5" textAlign="center">
                    Start a conversation
                </Text>
                <Text
                    color="$placeholderColor"
                    fontSize="$3"
                    mt="$2"
                    textAlign="center"
                    opacity={0.7}
                >
                    Ask me to do something on your phone
                </Text>
            </YStack>
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
