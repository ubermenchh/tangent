import { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface SectionCardProps {
    title?: string;
    subtitle?: string;
    right?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}

export function SectionCard({
    title,
    subtitle,
    right,
    children,
    className,
    bodyClassName,
}: SectionCardProps) {
    return (
        <View
            className={cn(
                "rounded-none border border-tokyo-bg-highlight bg-[#202233]/90",
                className
            )}
        >
            {(title || subtitle || right) && (
                <View className="flex-row items-start justify-between border-b border-tokyo-bg-highlight/60 px-4 py-3">
                    <View className="flex-1 pr-3">
                        {title ? (
                            <Text className="text-base font-semibold text-tokyo-fg">{title}</Text>
                        ) : null}
                        {subtitle ? (
                            <Text className="mt-1 text-sm text-tokyo-fg-dark">{subtitle}</Text>
                        ) : null}
                    </View>
                    {right}
                </View>
            )}

            <View className={cn("px-4 pb-4 pt-4", bodyClassName)}>{children}</View>
        </View>
    );
}
