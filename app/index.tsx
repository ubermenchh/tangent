import { YStack, H1, XStack, Image } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

export default function HomeScreen() {
    const insets = useSafeAreaInsets();

    return (
        <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom} px="$4">
            <XStack px="$4" py="$3" borderBottomWidth={1} borderColor="$borderColor">
                <Image 
                    source={require("../assets/tangent.png")}
                    width={32}
                    height={32}
                />
                <H1 color="$color" fontSize="$7" fontWeight="700">
                    Tangent
                </H1>
            </XStack>

            <YStack>
                <MessageList />
            </YStack>

            <ChatInput />
        </YStack>
    );
}
