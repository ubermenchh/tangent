import { useEffect, useRef } from "react";
import { FlatList, ListRenderItem } from "react-native";
import { useChatStore } from "@/stores/chatStore";
import { Message } from "@/types/message";
import { MessageBubble } from "./MessageBubble";
import Animated, { FadeIn } from "react-native-reanimated";

export function MessageList() {
    const messages = useChatStore(state => state.messages);
    const listRef = useRef<FlatList<Message>>(null);

    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = lastMessage?.content;

    useEffect(() => {
        if (listRef.current && messages.length > 0) {
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length, lastMessageContent]);

    const renderItem: ListRenderItem<Message> = ({ item }) => (
        <Animated.View entering={FadeIn.duration(200)}>
            <MessageBubble message={item} />
        </Animated.View>
    );

    return (
        <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews={false}
        />
    );
}
