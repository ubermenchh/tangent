import { useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from "react-native";
import { Send, Square } from "lucide-react-native";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import Animated, { FadeIn } from "react-native-reanimated";
import { backgroundTaskService } from "@/services/backgroundTaskService";
import { useTaskStore } from "@/stores/taskStore";

const log = logger.create("ChatInput");

interface ChatInputProps {
    centered?: boolean;
}

export function ChatInput({ centered = false }: ChatInputProps) {
    const [text, setText] = useState("");
    const [inputHeight, setInputHeight] = useState(48);
    const { addMessage, updateMessage, appendToMessage, appendToReasoning, setLoading, isLoading } =
        useChatStore();
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

            // Use streaming (simulated) for progressive text display
            for await (const chunk of agentRef.current.processMessageStream(trimmed, history)) {
                switch (chunk.type) {
                    case "thinking":
                        // Show thinking indicator (optional: update message)
                        updateMessage(assistantMsgId, { status: "thinking" });
                        break;
                    case "reasoning":
                        appendToReasoning(assistantMsgId, chunk.content || "");
                        break;
                    case "text":
                        appendToMessage(assistantMsgId, chunk.content || "");
                        break;
                    case "tool-call":
                        updateMessage(assistantMsgId, {
                            status: "streaming",
                            toolCalls: [
                                ...(useChatStore
                                    .getState()
                                    .messages.find(m => m.id === assistantMsgId)?.toolCalls || []),
                                chunk.toolCall!,
                            ],
                        });
                        break;
                    case "tool-call-end": {
                        // Update tool call status and result
                        const currentToolCalls =
                            useChatStore.getState().messages.find(m => m.id === assistantMsgId)
                                ?.toolCalls || [];
                        const updatedToolCalls = currentToolCalls.map(tc =>
                            tc.name === chunk.toolCall?.name
                                ? {
                                      ...tc,
                                      status: "success" as const,
                                      result: chunk.toolCall?.result,
                                  }
                                : tc
                        );
                        updateMessage(assistantMsgId, { toolCalls: updatedToolCalls });
                        break;
                    }
                    case "done":
                        updateMessage(assistantMsgId, { status: "complete" });
                        break;
                    case "cancelled":
                        updateMessage(assistantMsgId, {
                            status: "complete",
                            content:
                                useChatStore.getState().messages.find(m => m.id === assistantMsgId)
                                    ?.content + "\n\n[Cancelled]",
                        });
                        break;
                    case "error":
                        updateMessage(assistantMsgId, {
                            content: `Error: ${chunk.content}`,
                            status: "error",
                        });
                        break;
                }
            }

            log.info(`Response completed in ${Date.now() - startTime}ms`);
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

    const handleSendBackground = async () => {
        const trimmed = text.trim();
        if (!trimmed || !geminiApiKey) return;

        Keyboard.dismiss();
        log.info(`Starting background task: "${trimmed.slice(0, 50)}..."`);

        // Add to task store
        const taskId = useTaskStore.getState().addTask(trimmed);

        // Clear input
        setText("");
        setInputHeight(48);

        // Start background execution
        try {
            await backgroundTaskService.startTask(taskId, trimmed);
            // Optionally show a toast/alert that task started
        } catch (error) {
            log.error("Failed to start background task", error);
            useTaskStore
                .getState()
                .failTask(taskId, error instanceof Error ? error.message : "Failed to start");
        }
    };

    const handleCancel = () => {
        log.info("Cancelling current request");
        agentRef.current?.cancel();

        const messages = useChatStore.getState().messages;
        const streamingMsg = messages.find(m => m.status === "streaming");
        if (streamingMsg) {
            updateMessage(streamingMsg.id, {
                status: "complete",
                content:
                    streamingMsg.content + (streamingMsg.content ? "\n\n" : "") + "\n\n[Cancelled]",
            });
        }
        setLoading(false);
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
                    "w-12 h-12 rounded-full items-center justify-center",
                    isLoading ? "bg-red-600" : text.trim() ? "bg-blue-600" : "bg-zinc-800"
                )}
                onPress={isLoading ? handleCancel : handleSend}
                onLongPress={handleSendBackground}
                delayLongPress={500}
                disabled={!isLoading && !text.trim()}
            >
                {isLoading ? (
                    <Square size={16} color="white" fill="white" /> // Stop icon
                ) : (
                    <Send size={20} color={text.trim() ? "white" : "#71717a"} />
                )}
            </TouchableOpacity>
        </View>
    );
}
