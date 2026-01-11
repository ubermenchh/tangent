import { useState } from "react";
import { XStack, Input, Button } from "tamagui";
import { Send } from "@tamagui/lucide-icons";
import { useChatStore } from "@/stores/chatStore";

export function ChatInput() {
    const [text, setText] = useState("");
    const { addMessage, isLoading } = useChatStore();

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        addMessage("user", trimmed);
        setText("");

        setTimeout(() => {
            addMessage("assistant", `I received: "${trimmed}"\n\nAgent Core coming soon!`);
        }, 500);
    };

    return (
        <XStack
            px="$4"
            py="$3"
            gap="$3"
            borderTopWidth={1}
            borderColor="$borderColor"
            bg="$background"
        >
            <Input
                flex={1}
                value={text}
                onChangeText={setText}
                placeholder="Ask Tangent..."
                placeholderTextColor="$placeholderColor"
                bg="$backgroundHover"
                borderWidth={1}
                borderColor="$borderColor"
                color="$color"
                px="$4"
                py="$3"
                br="$4"
                fontSize="$4"
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isLoading}
            />
            <Button
                size="$4"
                circular
                bg={text.trim() ? "$accentBackground" : "$backgroundHover"}
                pressStyle={{ opacity: 0.8 }}
                onPress={handleSend}
                disabled={!text.trim() || isLoading}
            >
                <Send size={20} color={text.trim() ? "$accentColor" : "$placeholderColor"} />
            </Button>
        </XStack>
    );
}
