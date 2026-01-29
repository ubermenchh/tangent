import { useRef, useEffect } from "react";
import { ScrollView } from "react-native";
import { useChatStore } from "@/stores/chatStore";
import { MessageBubble } from "./MessageBubble";
import Animated, { FadeIn } from "react-native-reanimated";

export function MessageList() {
    const messages = useChatStore(state => state.messages);
    const scrollViewRef = useRef<ScrollView>(null);

    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = lastMessage?.content;

    useEffect(() => {
        if (scrollViewRef.current && messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length, lastMessageContent]);

    return (
        <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
        >
            {messages.map((message, index) => (
                <Animated.View
                    key={message.id}
                    entering={FadeIn.duration(200).delay(index === messages.length - 1 ? 0 : 0)}
                >
                    <MessageBubble message={message} />
                </Animated.View>
            ))}
        </ScrollView>
    );
}
