import { useEffect, useRef, useState } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    Keyboard,
    AppState,
    AppStateStatus,
    Text,
} from "react-native";
import { ArrowUp, Mic, Sparkles, Square } from "lucide-react-native";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import Animated, { FadeIn } from "react-native-reanimated";
import { backgroundTaskService } from "@/services/backgroundTaskService";
import { useTaskStore } from "@/stores/taskStore";
import { isEscalationSuppressed } from "@/lib/appState";
import { initializeSkills, skillRegistry } from "@/skills";

const log = logger.create("ChatInput");

interface ActiveAgent {
    agent: Agent;
    prompt: string;
    msgId: string;
}

interface ChatInputProps {
    centered?: boolean;
}

interface PromptRoute {
    background: boolean;
    maxSteps: number;
    skills: import("@/skills/types").Skill[];
}

function routePrompt(prompt: string): PromptRoute {
    initializeSkills();
    const matches = skillRegistry.matchSkills(prompt);

    if (matches.length === 0) {
        return { background: false, maxSteps: 5, skills: [] };
    }

    const topSkills = matches.slice(0, 3).map(m => m.skill);
    const background = topSkills.some(s => s.needsBackground);
    const maxSteps = Math.max(...topSkills.map(s => s.maxSteps ?? 5));

    return { background, maxSteps, skills: topSkills };
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

    const processInForeground = async (
        agent: Agent,
        msgId: string,
        prompt: string,
        maxSteps: number
    ) => {
        const startTime = Date.now();
        try {
            const history = useChatStore.getState().messages.slice(0, -1);
            log.debug(`Processing with ${history.length} messages in history`);

            for await (const chunk of agent.processMessageStream(prompt, history, { maxSteps })) {
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

    const handleSend = async () => {
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

        const route = routePrompt(trimmed);

        if (route.background) {
            // Skills flagged this for background execution (screen control, etc.)
            log.info(`Background routed by skills: ${route.skills.map(s => s.id).join(", ")}`);
            const taskId = useTaskStore.getState().addTask(trimmed);
            backgroundTaskService.startTask(taskId, trimmed).catch(error => {
                log.error("Failed to start background task", error);
                useTaskStore
                    .getState()
                    .failTask(taskId, error instanceof Error ? error.message : "Failed to start");
            });
        } else {
            // Foreground with streaming -- use skill-scoped Agent if skills matched
            let agent: Agent;
            if (route.skills.length > 0) {
                const composedConfig = await skillRegistry.composeConfig(route.skills);
                const tools = await skillRegistry.resolveTools(composedConfig.toolNames);
                agent = new Agent({
                    apiKey: geminiApiKey,
                    tools,
                    systemPrompt: composedConfig.systemPrompt,
                    maxSteps: composedConfig.maxSteps,
                });
                log.info(`Skill-scoped agent: ${route.skills.map(s => s.id).join(", ")}`);
            } else {
                agent = new Agent({ apiKey: geminiApiKey });
            }

            const msgId = addMessage("assistant", "", { status: "streaming" });
            addStream(msgId);

            activeAgents.current.set(msgId, { agent, prompt: trimmed, msgId });

            processInForeground(agent, msgId, trimmed, route.maxSteps).finally(() => {
                removeStream(msgId);
                activeAgents.current.delete(msgId);
            });
        }
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
            <Animated.View entering={FadeIn.duration(300)} className="w-full px-2 pb-2">
                <View className="mb-4 flex-row flex-wrap justify-center gap-2">
                    {["Send a message", "Search my files", "Battery status"].map(suggestion => (
                        <TouchableOpacity
                            key={suggestion}
                            className="rounded-full border border-[#ffffff24] bg-[#0e111bcc] px-4 py-2"
                            onPress={() => setText(suggestion)}
                        >
                            <Animated.Text className="text-sm text-[#d7dcf0]">
                                {suggestion}
                            </Animated.Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="overflow-hidden rounded-[28px] border border-[#ffffff22] bg-[#0a0d16]/90 p-3">
                    <View className="rounded-[22px] border border-[#2a2f42] bg-[#111522] pl-2 pr-3">
                        <TextInput
                            ref={inputRef}
                            className="px-3 py-3 text-base text-[#eef2ff]"
                            style={{ minHeight: 48, maxHeight: 120 }}
                            value={text}
                            onChangeText={setText}
                            placeholder={
                                geminiApiKey
                                    ? "Ask Tangent anything..."
                                    : "Set API key in settings..."
                            }
                            placeholderTextColor="#565f89"
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                            multiline
                            onContentSizeChange={handleContentSizeChange}
                        />
                    </View>

                    <View className="mt-3 flex-row items-center justify-between px-1">
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                className="h-11 w-11 items-center justify-center rounded-full border border-[#ffffff24] bg-[#1b2238]"
                                onPress={() => setText(prev => (prev ? prev : "Reflect on my day"))}
                                accessibilityLabel="Spark suggestion"
                            >
                                <Sparkles size={18} color="#f2f5ff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="h-11 w-11 items-center justify-center rounded-full border border-[#ffffff24] bg-[#0f1322]"
                                accessibilityLabel="Voice input"
                            >
                                <Mic size={17} color="#dbe2ff" />
                            </TouchableOpacity>
                        </View>

                        {hasActiveStreams ? (
                            <TouchableOpacity
                                className="h-12 w-12 items-center justify-center rounded-full border border-[#7a3a4a] bg-[#4a1e29]"
                                onPress={handleCancel}
                                accessibilityLabel="Stop generation"
                            >
                                <Square size={18} color="#f7768e" fill="#f7768e" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                className={cn(
                                    "h-12 w-12 items-center justify-center rounded-full border",
                                    hasText
                                        ? "border-[#aab5ff] bg-[#f2f4ff]"
                                        : "border-[#2d3348] bg-[#151a2a]"
                                )}
                                onPress={handleSend}
                                disabled={!hasText}
                                accessibilityLabel="Send message"
                            >
                                <ArrowUp size={20} color={hasText ? "#101322" : "#6c738f"} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>
        );
    }

    return (
        <View className="border-t border-[#1c1f2c] bg-[#070910] px-4 pb-4 pt-3">
            <View className="flex-row items-end gap-3">
                <View className="flex-1 rounded-[28px] border border-[#ffffff1f] bg-[#0e111ccc] px-3 py-2">
                    <View className="flex-row items-end">
                        <TextInput
                            ref={inputRef}
                            className="flex-1 px-2 py-2 text-base text-[#eef2ff]"
                            style={{ minHeight: 48, maxHeight: 120, height: inputHeight }}
                            value={text}
                            onChangeText={setText}
                            placeholder={
                                geminiApiKey ? "Ask Tangent..." : "Set API key in settings..."
                            }
                            placeholderTextColor="#7d839d"
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                            multiline
                            onContentSizeChange={handleContentSizeChange}
                        />
                        <TouchableOpacity
                            className="mb-1 h-9 w-9 items-center justify-center rounded-full border border-[#ffffff24] bg-[#151a2a]"
                            accessibilityLabel="Voice input"
                        >
                            <Mic size={16} color="#d4dcff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {hasActiveStreams ? (
                    <TouchableOpacity
                        className="h-12 w-12 items-center justify-center rounded-full border border-[#7a3a4a] bg-[#4a1e29]"
                        onPress={handleCancel}
                    >
                        <Square size={16} color="#f7768e" fill="#f7768e" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        className={cn(
                            "h-12 w-12 items-center justify-center rounded-full border",
                            hasText
                                ? "border-[#acb6ff] bg-[#f2f4ff]"
                                : "border-[#2d3348] bg-[#151a2a]"
                        )}
                        onPress={handleSend}
                        disabled={!hasText}
                    >
                        <ArrowUp size={20} color={hasText ? "#111426" : "#6c738f"} />
                    </TouchableOpacity>
                )}
            </View>

            <View className="mt-2 flex-row justify-center">
                <Text className="text-xs text-[#7a819d]">
                    {hasActiveStreams
                        ? "Generating response. Tap square to stop."
                        : "Tap mic for voice or arrow to send."}
                </Text>
            </View>
        </View>
    );
}
