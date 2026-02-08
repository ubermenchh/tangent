import { useEffect, useRef, useState } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    Keyboard,
    AppState,
    AppStateStatus,
} from "react-native";
import { Send, Square } from "lucide-react-native";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import Animated, { FadeIn } from "react-native-reanimated";
import { backgroundTaskService } from "@/services/backgroundTaskService";
import { useTaskStore } from "@/stores/taskStore";
import { isEscalationSuppressed } from "@/lib/appState";

const log = logger.create("ChatInput");

interface ActiveAgent {
    agent: Agent;
    prompt: string;
    msgId: string;
}

interface ChatInputProps {
    centered?: boolean;
}

export function ChatInput({ centered = false }: ChatInputProps) {
    const [text, setText] = useState("");
    const [inputHeight, setInputHeight] = useState(48);
    const {
        addMessage,
        updateMessage,
        appendToMessage,
        appendToReasoning,
        addStream,
        removeStream,
        isStreaming,
    } = useChatStore();
    const { geminiApiKey } = useSettingsStore();

    const activeAgents = useRef<Map<string, ActiveAgent>>(new Map());
    const inputRef = useRef<TextInput>(null);

    // Escalate to background when app goes to background
    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (
                nextState === "background" &&
                activeAgents.current.size > 0 &&
                !isEscalationSuppressed()
            ) {
                log.info(
                    `App backgrounded with ${activeAgents.current.size} active stream(s), escalating`
                );

                for (const [msgId, { agent, prompt }] of activeAgents.current) {
                    agent.cancel();
                    removeStream(msgId);

                    // Mark the in-progress chat message as interrupted
                    const msg = useChatStore.getState().messages.find(m => m.id === msgId);
                    updateMessage(msgId, {
                        status: "complete",
                        content:
                            (msg?.content || "") +
                            (msg?.content ? "\n\n" : "") +
                            "[Moved to background]",
                    });

                    // Create a background task to re-run the prompt
                    const taskId = useTaskStore.getState().addTask(prompt);
                    backgroundTaskService.startTask(taskId, prompt).catch(error => {
                        log.error("Failed to escalate to background", error);
                        useTaskStore
                            .getState()
                            .failTask(
                                taskId,
                                error instanceof Error ? error.message : "Escalation failed"
                            );
                    });
                }

                activeAgents.current.clear();
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);
        return () => sub.remove();
    }, [removeStream, updateMessage]);

    const processInForeground = async (agent: Agent, msgId: string, prompt: string) => {
        const startTime = Date.now();
        try {
            const history = useChatStore.getState().messages.slice(0, -1);
            log.debug(`Processing with ${history.length} messages in history`);

            for await (const chunk of agent.processMessageStream(prompt, history)) {
                switch (chunk.type) {
                    case "thinking":
                        updateMessage(msgId, { status: "thinking" });
                        break;
                    case "reasoning":
                        appendToReasoning(msgId, chunk.content || "");
                        break;
                    case "text":
                        appendToMessage(msgId, chunk.content || "");
                        break;
                    case "tool-call":
                        updateMessage(msgId, {
                            status: "streaming",
                            toolCalls: [
                                ...(useChatStore.getState().messages.find(m => m.id === msgId)
                                    ?.toolCalls || []),
                                chunk.toolCall!,
                            ],
                        });
                        break;
                    case "tool-call-end": {
                        const currentToolCalls =
                            useChatStore.getState().messages.find(m => m.id === msgId)?.toolCalls ||
                            [];
                        const updatedToolCalls = currentToolCalls.map(tc =>
                            tc.name === chunk.toolCall?.name
                                ? {
                                      ...tc,
                                      status: "success" as const,
                                      result: chunk.toolCall?.result,
                                  }
                                : tc
                        );
                        updateMessage(msgId, { toolCalls: updatedToolCalls });
                        break;
                    }
                    case "done":
                        updateMessage(msgId, { status: "complete" });
                        break;
                    case "cancelled": {
                        const msg = useChatStore.getState().messages.find(m => m.id === msgId);
                        if (msg) {
                            updateMessage(msgId, {
                                status: "complete",
                                content: msg.content + (msg.content ? "\n\n" : "") + "[Cancelled]",
                            });
                        }
                        break;
                    }
                    case "error":
                        updateMessage(msgId, {
                            content: `Error: ${chunk.content}`,
                            status: "error",
                        });
                        break;
                }
            }

            log.info(`Response completed in ${Date.now() - startTime}ms`);
        } catch (error) {
            log.error(`Agent error after ${Date.now() - startTime}ms`, error);
            updateMessage(msgId, {
                content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
                status: "error",
            });
        }
    };

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;

        if (!geminiApiKey) {
            log.warn("Send attempted without API key");
            addMessage("assistant", "Please set your Gemini API key in settings first.");
            return;
        }

        Keyboard.dismiss();
        log.info(`User message: "${trimmed.slice(0, 50)}..."`);
        addMessage("user", trimmed);
        setText("");
        setInputHeight(48);

        const agent = new Agent({ apiKey: geminiApiKey });
        const msgId = addMessage("assistant", "", { status: "streaming" });
        addStream(msgId);

        activeAgents.current.set(msgId, { agent, prompt: trimmed, msgId });

        // Fire and forget -- non-blocking
        processInForeground(agent, msgId, trimmed).finally(() => {
            removeStream(msgId);
            activeAgents.current.delete(msgId);
        });
    };

    const handleCancel = () => {
        log.info("Cancelling all active streams");
        for (const [msgId, { agent }] of activeAgents.current) {
            agent.cancel();
            removeStream(msgId);

            const msg = useChatStore.getState().messages.find(m => m.id === msgId);
            if (msg) {
                updateMessage(msgId, {
                    status: "complete",
                    content: msg.content + (msg.content ? "\n\n" : "") + "[Cancelled]",
                });
            }
        }
        activeAgents.current.clear();
    };

    const handleContentSizeChange = (event: {
        nativeEvent: { contentSize: { width: number; height: number } };
    }) => {
        const height = event.nativeEvent.contentSize.height;
        setInputHeight(Math.min(Math.max(48, height), 120));
    };

    const hasText = text.trim().length > 0;
    const hasActiveStreams = isStreaming();

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
                        multiline
                        onContentSizeChange={handleContentSizeChange}
                    />
                    <TouchableOpacity
                        className={cn(
                            "w-12 h-12 rounded-xl items-center justify-center mb-1",
                            hasText ? "bg-tokyo-blue" : "bg-tokyo-bg-highlight"
                        )}
                        onPress={handleSend}
                        disabled={!hasText}
                        accessibilityLabel="Send message"
                    >
                        <Send size={20} color={hasText ? "#1a1b26" : "#565f89"} />
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
                multiline
                onContentSizeChange={handleContentSizeChange}
            />
            {hasActiveStreams ? (
                <TouchableOpacity
                    className="w-12 h-12 rounded-full items-center justify-center bg-red-600"
                    onPress={handleCancel}
                >
                    <Square size={16} color="white" fill="white" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    className={cn(
                        "w-12 h-12 rounded-full items-center justify-center",
                        hasText ? "bg-blue-600" : "bg-zinc-800"
                    )}
                    onPress={handleSend}
                    disabled={!hasText}
                >
                    <Send size={20} color={hasText ? "white" : "#71717a"} />
                </TouchableOpacity>
            )}
        </View>
    );
}
