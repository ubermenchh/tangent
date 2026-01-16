import { useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Send } from "lucide-react-native";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { cn } from "@/lib/utils";

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
        <View className="flex-row px-4 py-3 gap-3 border-t border-zinc-800 bg-zinc-900 items-center">
            <TextInput
                className="flex-1 bg-zinc-800 text-white px-4 py-3 rounded-xl text-base border border-zinc-700 placeholder:text-zinc-500"
                value={text}
                onChangeText={setText}
                placeholder={geminiApiKey ? "Ask Tangent..." : "Set API key in settings...."}
                placeholderTextColor="#71717a"
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isLoading}
            />
            <TouchableOpacity
                className={cn(
                    "w-12 h-12 rounded-full items-center justify-center",
                    text.trim() ? "bg-blue-600" : "bg-zinc-800"
                )}
                onPress={handleSend}
                disabled={!text.trim() || isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color={text.trim() ? "white" : "#71717a"} />
                ) : (
                    <Send size={20} color={text.trim() ? "white" : "#71717a"} />
                )}
            </TouchableOpacity>
        </View>
    );
}
