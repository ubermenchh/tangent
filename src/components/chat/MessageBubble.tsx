import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import Markdown from "react-native-markdown-display";
import { Message } from "@/types/message";
import { ToolCallBadge } from "./ToolCallBadge";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ChevronDown, ChevronRight, User, Bot } from "lucide-react-native";

const markdownStyles = {
    body: { color: "#c0caf5", fontSize: 15, lineHeight: 22 },
    code_inline: {
        backgroundColor: "#292e42",
        color: "#7dcfff",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontFamily: "monospace",
    },
    code_block: {
        backgroundColor: "#16161e",
        color: "#c0caf5",
        padding: 12,
        borderRadius: 8,
        fontFamily: "monospace",
    },
    fence: {
        backgroundColor: "#16161e",
        color: "#c0caf5",
        padding: 12,
        borderRadius: 8,
        fontFamily: "monospace",
    },
    link: { color: "#7aa2f7" },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    heading1: { color: "#c0caf5", fontWeight: "bold", fontSize: 22, marginVertical: 8 },
    heading2: { color: "#c0caf5", fontWeight: "bold", fontSize: 18, marginVertical: 6 },
    heading3: { color: "#c0caf5", fontWeight: "600", fontSize: 16, marginVertical: 4 },
    blockquote: {
        backgroundColor: "#292e42",
        borderLeftColor: "#7aa2f7",
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
        <Animated.View entering={FadeInDown.duration(200).springify()} className="w-full mb-4">
            <View className="flex-row items-center gap-2 mb-2">
                {isUser ? (
                    <>
                        <View className="w-6 h-6 rounded-full bg-tokyo-blue/20 items-center justify-center">
                            <User size={14} color="#7aa2f7" />
                        </View>
                        <Text className="text-tokyo-blue text-sm font-semibold">You</Text>
                    </>
                ) : (
                    <>
                        <View className="w-6 h-6 rounded-full bg-tokyo-purple/20 items-center justify-center">
                            <Bot size={14} color="#bb9af7" />
                        </View>
                        <Text className="text-tokyo-purple text-sm font-semibold">Tangent</Text>
                    </>
                )}
                <Text className="text-tokyo-comment text-xs ml-auto">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
            </View>

            <Pressable
                onLongPress={handleLongPress}
                delayLongPress={300}
                className={`pl-8 ${isError ? "border-l-2 border-tokyo-red" : ""}`}
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
                        onPress={() => setReasoningExpanded(!reasoningExpanded)}
                        className="mb-3 p-3 bg-tokyo-purple/10 rounded-lg border border-tokyo-purple/20"
                    >
                        <View className="flex-row items-center gap-2">
                            {reasoningExpanded ? (
                                <ChevronDown size={14} color="#bb9af7" />
                            ) : (
                                <ChevronRight size={14} color="#bb9af7" />
                            )}
                            <Text className="text-tokyo-purple text-xs font-semibold">
                                Thinking
                            </Text>
                        </View>
                        {reasoningExpanded && (
                            <Text className="text-tokyo-comment text-sm mt-2 pl-6">
                                {message.reasoning}
                            </Text>
                        )}
                    </Pressable>
                )}

                {isUser ? (
                    <Text className="text-tokyo-fg text-base">{message.content}</Text>
                ) : message.content ? (
                    <Markdown style={markdownStyles}>{message.content}</Markdown>
                ) : null}

                {(isThinking || isStreaming) && !message.content && (
                    <View className="flex-row gap-1 py-1">
                        <Animated.View
                            className="w-2 h-2 rounded-full bg-tokyo-purple"
                            entering={FadeIn.duration(300).delay(0)}
                        />
                        <Animated.View
                            className="w-2 h-2 rounded-full bg-tokyo-purple opacity-70"
                            entering={FadeIn.duration(300).delay(150)}
                        />
                        <Animated.View
                            className="w-2 h-2 rounded-full bg-tokyo-purple opacity-40"
                            entering={FadeIn.duration(300).delay(300)}
                        />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}
