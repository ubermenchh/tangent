import { YStack, Text, XStack } from "tamagui";
import { Message } from "@/types/message";

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === "user";

    return (
        <XStack w="100%" justifyContent={isUser ? "flex-end" : "flex-start"} mb="$3">
            <YStack
                maxWidth="85%"
                bg={isUser ? "$accentBackground" : "$backgroundHover"}
                px="$4"
                py="$3"
                br="$5"
                borderBottomRightRadius={isUser ? "$2" : "$5"}
                borderBottomLeftRadius={isUser ? "$5" : "$2"}
            >
                <Text color={isUser ? "$accentColor" : "$color"} fontSize="$4" lineHeight="$4">
                    {message.content}
                </Text>

                <Text
                    color={isUser ? "$accentColor" : "$placeholderColor"}
                    fontSize="$1"
                    opacity={0.7}
                    mt="$1"
                    textAlign={isUser ? "right" : "left"}
                >
                    {new Date(message.timestamp).toLocaleDateString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </Text>
            </YStack>
        </XStack>
    );
}
