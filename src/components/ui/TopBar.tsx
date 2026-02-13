import { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface TopBarProps {
    title: string;
    left?: ReactNode;
    right?: ReactNode;
    className?: string;
    titleClassName?: string;
}

export function TopBar({ title, left, right, className, titleClassName }: TopBarProps) {
    return (
        <View
            className={cn(
                "min-h-[56px] flex-row items-center border-b border-tokyo-bg-highlight px-4 py-2.5",
                className
            )}
        >
            <View style={{ minWidth: 44 }} className="items-start">
                {left}
            </View>

            <Text
                className={cn(
                    "flex-1 text-center text-xl font-semibold tracking-tight text-tokyo-fg",
                    titleClassName
                )}
                numberOfLines={1}
            >
                {title}
            </Text>

            <View style={{ minWidth: 44 }} className="items-end">
                {right}
            </View>
        </View>
    );
}
