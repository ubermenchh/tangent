import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

interface ScreenContainerProps {
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    edges?: Edge[];
    scroll?: boolean;
    padded?: boolean;
}

export function ScreenContainer({
    children,
    className,
    contentClassName,
    edges = ["top"],
    scroll = false,
    padded = false,
}: ScreenContainerProps) {
    const content = scroll ? (
        <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={padded ? { padding: 16 } : undefined}
        >
            <View className={cn(contentClassName)}>{children}</View>
        </ScrollView>
    ) : (
        <View className={cn("flex-1", padded ? "p-4" : "", contentClassName)}>{children}</View>
    );

    return (
        <SafeAreaView className={cn("flex-1 bg-tokyo-bg", className)} edges={edges}>
            {content}
        </SafeAreaView>
    );
}
