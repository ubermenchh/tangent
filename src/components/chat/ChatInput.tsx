import { useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Send } from "lucide-react-native";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger.create("ChatInput");

export function ChatInput() {
    const [text, setText] = useState("");
    const { addMessage, updateMessage, setLoading, isLoading } = useChatStore();
    const { geminiApiKey } = useSettingsStore();

    const agentRef = useRef<Agent | null>(null);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) {
            log.debug("Send blocked: empty or loading");
            return;
        }

        if (!geminiApiKey) {
            log.warn("Send attempted without API key");
            addMessage("assistant", "Please set your Gemini API key in settings first.");
            return;
        }

        if (!agentRef.current) {
            log.info("Creating new Agent instance");
            agentRef.current = new Agent({ apiKey: geminiApiKey });
        }

        log.info(`User message: "${trimmed.slice(0, 50)}..."`);
        addMessage("user", trimmed);
        setText("");
        setLoading(true);

        const assistantMsgId = addMessage("assistant", "", { status: "streaming" });

        const startTime = Date.now();
        try {
            const history = useChatStore.getState().messages.slice(0, -1);
            log.debug(`Processing with ${history.length} messages in history`);

            const response = await agentRef.current.processMessage(trimmed, history);

            log.info(`Response received in ${Date.now() - startTime}ms`);
            log.debug(`Tool calls: ${response.toolCalls.length}`);

            updateMessage(assistantMsgId, {
                content: response.content,
                toolCalls: response.toolCalls,
                status: "complete",
            });
        } catch (error) {
            log.error(`Agent error after ${Date.now() - startTime}ms`, error);
            updateMessage(assistantMsgId, {
                content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
                status: "error",
            });
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
                placeholder={geminiApiKey ? "Ask Tangent..." : "Set API key in settings..."}
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
