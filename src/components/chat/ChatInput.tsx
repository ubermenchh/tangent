import { useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from "react-native";
import { Send } from "lucide-react-native";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import Animated, { FadeIn } from "react-native-reanimated";

const log = logger.create("ChatInput");

interface ChatInputProps {
    centered?: boolean;
}

export function ChatInput({ centered = false }: ChatInputProps) {
    const [text, setText] = useState("");
    const [inputHeight, setInputHeight] = useState(48);
    const { addMessage, updateMessage, setLoading, isLoading } = useChatStore();
    const { geminiApiKey } = useSettingsStore();

    const agentRef = useRef<Agent | null>(null);
    const inputRef = useRef<TextInput>(null);

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

        Keyboard.dismiss();
        log.info(`User message: "${trimmed.slice(0, 50)}..."`);
        addMessage("user", trimmed);
        setText("");
        setInputHeight(48);
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

    const handleContentSizeChange = (event: {
        nativeEvent: { contentSize: { width: number; height: number } };
    }) => {
        const height = event.nativeEvent.contentSize.height;
        setInputHeight(Math.min(Math.max(48, height), 120));
    };

    const hasText = text.trim().length > 0;

    if (centered) {
        return (
            <Animated.View entering={FadeIn.duration(300)} className="w-full px-4">
                {/* Suggestion Chips */}
                <View className="flex-row flex-wrap justify-center gap-2 mb-4">
                    {["Send a message", "Search my files", "Battery status"].map(suggestion => (
                        <TouchableOpacity
                            key={suggestion}
                            className="px-4 py-2 rounded-full bg-tokyo-bg-highlight border border-tokyo-terminal"
                            onPress={() => setText(suggestion)}
                        >
                            <Animated.Text className="text-tokyo-fg-dark text-sm">
                                {suggestion}
                            </Animated.Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Centered Input */}
                <View className="flex-row gap-3 items-end bg-tokyo-storm rounded-2xl border border-tokyo-bg-highlight p-2">
                    <TextInput
                        ref={inputRef}
                        className="flex-1 text-tokyo-fg px-4 py-3 text-base"
                        style={{ minHeight: 48, maxHeight: 120 }}
                        value={text}
                        onChangeText={setText}
                        placeholder={
                            geminiApiKey ? "Ask Tangent anything..." : "Set API key in settings..."
                        }
                        placeholderTextColor="#565f89"
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                        editable={!isLoading}
                        multiline
                        onContentSizeChange={handleContentSizeChange}
                    />
                    <TouchableOpacity
                        className={cn(
                            "w-12 h-12 rounded-xl items-center justify-center mb-1",
                            hasText ? "bg-tokyo-blue" : "bg-tokyo-bg-highlight"
                        )}
                        onPress={handleSend}
                        disabled={!hasText || isLoading}
                        accessibilityLabel="Send message"
                    >
                        {isLoading ? (
                            <ActivityIndicator color={hasText ? "#1a1b26" : "#565f89"} />
                        ) : (
                            <Send size={20} color={hasText ? "#1a1b26" : "#565f89"} />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }

    return (
        <View className="flex-row px-4 py-3 gap-3 border-t border-tokyo-bg-highlight bg-tokyo-storm items-end">
            <TextInput
                ref={inputRef}
                className="flex-1 bg-tokyo-bg text-tokyo-fg px-4 py-3 rounded-xl text-base border border-tokyo-bg-highlight"
                style={{ minHeight: 48, maxHeight: 120, height: inputHeight }}
                value={text}
                onChangeText={setText}
                placeholder={geminiApiKey ? "Ask Tangent..." : "Set API key in settings..."}
                placeholderTextColor="#565f89"
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isLoading}
                multiline
                onContentSizeChange={handleContentSizeChange}
            />
            <TouchableOpacity
                className={cn(
                    "w-12 h-12 rounded-xl items-center justify-center",
                    hasText ? "bg-tokyo-blue" : "bg-tokyo-bg-highlight"
                )}
                onPress={handleSend}
                disabled={!hasText || isLoading}
                accessibilityLabel="Send message"
            >
                {isLoading ? (
                    <ActivityIndicator color={hasText ? "#1a1b26" : "#565f89"} />
                ) : (
                    <Send size={20} color={hasText ? "#1a1b26" : "#565f89"} />
                )}
            </TouchableOpacity>
        </View>
    );
}
