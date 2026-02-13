import { useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import Markdown from "react-native-markdown-display";
import { Message } from "@/types/message";
import { ToolCallBadge } from "./ToolCallBadge";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ChevronDown, ChevronRight, User, Bot } from "lucide-react-native";

const markdownStyles = {
    body: { color: "#ecf1ff", fontSize: 15, lineHeight: 22 },
    code_inline: {
        backgroundColor: "#1d2336",
        color: "#a5b8ff",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        fontFamily: "monospace",
    },
    code_block: {
        backgroundColor: "#121623",
        color: "#dce4ff",
        padding: 12,
        borderRadius: 12,
        fontFamily: "monospace",
    },
    fence: {
        backgroundColor: "#121623",
        color: "#dce4ff",
        padding: 12,
        borderRadius: 12,
        fontFamily: "monospace",
    },
    link: { color: "#a9baff" },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    heading1: { color: "#f0f4ff", fontWeight: "bold", fontSize: 22, marginVertical: 8 },
    heading2: { color: "#f0f4ff", fontWeight: "bold", fontSize: 18, marginVertical: 6 },
    heading3: { color: "#f0f4ff", fontWeight: "600", fontSize: 16, marginVertical: 4 },
    blockquote: {
        backgroundColor: "#1c2233",
        borderLeftColor: "#90a6ff",
        borderLeftWidth: 3,
        paddingLeft: 12,
        paddingVertical: 4,
    },
};

export function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";
    const isStreaming = message.status === "streaming";
    const isError = message.status === "error";
    const isThinking = message.status === "thinking";
    const [reasoningExpanded, setReasoningExpanded] = useState(false);

    const handleLongPress = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await Clipboard.setStringAsync(message.content);
    };

    return (
        <Animated.View entering={FadeInDown.duration(200).springify()} className="mb-4 w-full">
            <View className="mb-2 flex-row items-center gap-2 px-1">
                {isUser ? (
                    <>
                        <View className="h-6 w-6 items-center justify-center rounded-full border border-[#4f5a86] bg-[#273055]">
                            <User size={13} color="#dce4ff" />
                        </View>
                        <Text className="text-sm font-semibold text-[#bfcfff]">You</Text>
                    </>
                ) : (
                    <>
                        <View className="h-6 w-6 items-center justify-center rounded-full border border-[#45635b] bg-[#18372f]">
                            <Bot size={13} color="#b8f7e1" />
                        </View>
                        <Text className="text-sm font-semibold text-[#b8f7e1]">Tangent</Text>
                    </>
                )}

                <Text className="ml-auto text-xs text-[#7c829b]">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
            </View>

            <Pressable
                onLongPress={handleLongPress}
                delayLongPress={300}
                className={[
                    "overflow-hidden rounded-[22px] border px-4 py-3",
                    isUser ? "border-[#4f5a85] bg-[#1f2742]" : "border-[#2a2f42] bg-[#111522]",
                    isError ? "border-[#7a3a4a] bg-[#3a1d2a]" : "",
                ].join(" ")}
            >
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <View className="mb-3">
                        {message.toolCalls.map(tc => (
                            <ToolCallBadge key={tc.id} toolCall={tc} />
                        ))}
                    </View>
                )}

                {message.reasoning && (
                    <Pressable
                        onPress={() => setReasoningExpanded(prev => !prev)}
                        className="mb-3 rounded-2xl border border-[#39405b] bg-[#1b2032] p-3"
                    >
                        <View className="flex-row items-center gap-2">
                            {reasoningExpanded ? (
                                <ChevronDown size={14} color="#afbaf0" />
                            ) : (
                                <ChevronRight size={14} color="#afbaf0" />
                            )}
                            <Text className="text-xs font-semibold text-[#c2ccff]">Thinking</Text>
                        </View>
                        {reasoningExpanded && (
                            <Text className="mt-2 pl-6 text-sm text-[#9aa3c2]">
                                {message.reasoning}
                            </Text>
                        )}
                    </Pressable>
                )}

                {isUser ? (
                    <Text className="text-base text-[#eff3ff]">{message.content}</Text>
                ) : message.content ? (
                    <Markdown style={markdownStyles}>{message.content}</Markdown>
                ) : null}

                {(isThinking || isStreaming) && !message.content && (
                    <View className="flex-row gap-1 py-1">
                        <Animated.View
                            className="h-2 w-2 rounded-full bg-[#d0d9ff]"
                            entering={FadeIn.duration(300).delay(0)}
                        />
                        <Animated.View
                            className="h-2 w-2 rounded-full bg-[#d0d9ff] opacity-70"
                            entering={FadeIn.duration(300).delay(150)}
                        />
                        <Animated.View
                            className="h-2 w-2 rounded-full bg-[#d0d9ff] opacity-40"
                            entering={FadeIn.duration(300).delay(300)}
                        />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}
