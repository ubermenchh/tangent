import { YStack, XStack, H1, Image, Button } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Settings } from "@tamagui/lucide-icons";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
            {/* Header */}
            <XStack
                px="$4"
                py="$3"
                alignItems="center"
                justifyContent="space-between"
                borderBottomWidth={1}
                borderColor="$borderColor"
            >
                <XStack alignItems="center" gap="$3">
                    <Image source={require("../assets/tangent.png")} width={32} height={32} />
                    <H1 color="$color" fontSize="$7" fontWeight="700">
                        Tangent
                    </H1>
                </XStack>

                <Button size="$3" circular chromeless onPress={() => router.push("/settings")}>
                    <Settings size={24} color="$color" />
                </Button>
            </XStack>

            {/* Messages */}
            <YStack flex={1}>
                <MessageList />
            </YStack>

            {/* Input */}
            <ChatInput />
        </YStack>
    );
}
