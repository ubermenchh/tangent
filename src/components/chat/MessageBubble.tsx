import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Markdown from "react-native-markdown-display";
import { Message } from "@/types/message";
import { ToolCallBadge } from "./ToolCallBadge";
import { cn } from "@/lib/utils";
import Animated, { FadeIn } from "react-native-reanimated";

const markdownStyles = {
    body: { color: "#fff", fontSize: 16 },
    code_inline: {
        backgroundColor: "#27272a",
        color: "#22d3ee",
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    code_block: {
        backgroundColor: "#18181b",
        padding: 12,
        borderRadius: 8,
        fontFamily: "monospace",
    },
    link: { color: "#60a5fa" },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
};

export function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";
    const isStreaming = message.status === "streaming";

    return (
        <Animated.View
            entering={FadeIn.duration(150)}
            className={cn("w-full flex-row mb-3", isUser ? "justify-end" : "justify-start")}
        >
            <View
                className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl",
                    isUser ? "bg-blue-600 rounded-br-md" : "bg-zinc-800 rounded-bl-md"
                )}
            >
                {/* Tool calls */}
                {message.toolCalls?.map(tc => (
                    <ToolCallBadge key={tc.id} toolCall={tc} />
                ))}

                {/* Message content */}
                {isUser ? (
                    <Text className="text-white text-base">{message.content}</Text>
                ) : (
                    <Markdown style={markdownStyles}>{message.content}</Markdown>
                )}

                {/* Streaming cursor */}
                {isStreaming && <Text className="text-blue-400 animate-pulse">|</Text>}

                {/* Timestamp */}
                <Text
                    className={cn(
                        "text-xs mt-1 opacity-70",
                        isUser ? "text-blue-100 text-right" : "text-zinc-400 text-left"
                    )}
                >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
            </View>
        </Animated.View>
    );
}
