import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import Markdown from "react-native-markdown-display";
import { Message } from "@/types/message";
import { ToolCallBadge } from "./ToolCallBadge";
import { cn } from "@/lib/utils";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react-native";

const markdownStyles = {
    body: { color: "#c0caf5", fontSize: 16, lineHeight: 24 },
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
    heading1: { color: "#c0caf5", fontWeight: "bold", fontSize: 24, marginVertical: 8 },
    heading2: { color: "#c0caf5", fontWeight: "bold", fontSize: 20, marginVertical: 6 },
    heading3: { color: "#c0caf5", fontWeight: "600", fontSize: 18, marginVertical: 4 },
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
        <Animated.View
            entering={FadeInDown.duration(200).springify()}
            className={cn("w-full flex-row mb-3", isUser ? "justify-end" : "justify-start")}
        >
            <Pressable
                onLongPress={handleLongPress}
                delayLongPress={300}
                className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl",
                    isUser
                        ? "bg-tokyo-blue rounded-br-md"
                        : isError
                          ? "bg-tokyo-red/20 border border-tokyo-red/50 rounded-bl-md"
                          : "bg-tokyo-storm rounded-bl-md"
                )}
            >
                {/* Tool calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <View className="mb-2">
                        {message.toolCalls.map(tc => (
                            <ToolCallBadge key={tc.id} toolCall={tc} />
                        ))}
                    </View>
                )}

                {/* Reasoning Content */}
                {message.reasoning && (
    <Pressable 
        onPress={() => setReasoningExpanded(!reasoningExpanded)}
        className="mb-2 p-2 bg-tokyo-purple/10 rounded-lg border border-tokyo-purple/30"
    >
        <View className="flex-row items-center justify-between">
            <Text className="text-tokyo-purple text-xs font-semibold">
                Thinking
            </Text>
            {reasoningExpanded ? (
                <ChevronDown size={14} color="#bb9af7" />
            ) : (
                <ChevronRight size={14} color="#bb9af7" />
            )}
        </View>
        {reasoningExpanded && (
            <Text className="text-tokyo-comment text-sm mt-1">
                {message.reasoning}
            </Text>
        )}
    </Pressable>
)}

                {/* Message content */}
                {isUser ? (
                    <Text className="text-tokyo-bg text-base leading-6">{message.content}</Text>
                ) : message.content ? (
                    <Markdown style={markdownStyles}>{message.content}</Markdown>
                ) : null}

                {/* Streaming indicator */}
                {(isThinking || isStreaming) && !message.content && (
                    <View className="flex-row gap-1 py-1">
                        <Animated.View
                            className="w-2 h-2 rounded-full bg-tokyo-blue"
                            entering={FadeIn.duration(300).delay(0)}
                        />
                        <Animated.View
                            className="w-2 h-2 rounded-full bg-tokyo-blue opacity-70"
                            entering={FadeIn.duration(300).delay(150)}
                        />
                        <Animated.View
                            className="w-2 h-2 rounded-full bg-tokyo-blue opacity-40"
                            entering={FadeIn.duration(300).delay(300)}
                        />
                    </View>
                )}

                {/* Timestamp */}
                <Text
                    className={cn(
                        "text-xs mt-2",
                        isUser ? "text-tokyo-bg/70 text-right" : "text-tokyo-comment text-left"
                    )}
                >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
            </Pressable>
        </Animated.View>
    );
}
