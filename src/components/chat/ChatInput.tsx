import { useRef, useState } from "react";
import { XStack, Input, Button } from "tamagui";
import { Send } from "@tamagui/lucide-icons";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";

export function ChatInput() {
    const [text, setText] = useState("");
    const { messages, addMessage, setLoading, isLoading } = useChatStore();
    const { geminiApiKey } = useSettingsStore();

    const agentRef = useRef<Agent | null>(null);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        if (!geminiApiKey) {
            addMessage("assistant", "Please set your Gemini API key in settings first.");
            return;
        }

        if (!agentRef.current) {
            agentRef.current = new Agent({ apiKey: geminiApiKey });
        }

        addMessage("user", trimmed);
        setText("");
        setLoading(true);

        try {
            const history = messages;
            const response = await agentRef.current.processMessage(trimmed, history);

            addMessage("assistant", response.content);

            // TODO: Handle toolCalls display in the future
        } catch (error) {
            console.error("Agent error:", error);
            addMessage(
                "assistant",
                `Error: ${error instanceof Error ? error.message : "Something went wrong"}`
            );
        } finally {
            setLoading(false);
        }
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
                placeholder={geminiApiKey ? "Ask Tangent..." : "Set API key in settings...."}
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
