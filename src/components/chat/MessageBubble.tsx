import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Message } from "@/types/message";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user";

    return (
        <View className={cn("w-full flex-row mb-3", isUser ? "justify-end" : "justify-start")}>
            <View
                className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl",
                    isUser ? "bg-blue-600 rounded-br-md" : "bg-zinc-800 rounded-bl-md"
                )}
            >
                <Text className={cn("text-base", isUser ? "text-white" : "text-white")}>
                    {message.content}
                </Text>

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
        </View>
    );
}
