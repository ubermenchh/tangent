import { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type StatusTone = "info" | "success" | "warning" | "danger" | "muted";

interface StatusChipProps {
    label: string;
    icon?: ReactNode;
    tone?: StatusTone;
    className?: string;
}

const toneClasses: Record<StatusTone, string> = {
    info: "bg-tokyo-blue/20",
    success: "bg-tokyo-green/20",
    warning: "bg-tokyo-yellow/20",
    danger: "bg-tokyo-red/20",
    muted: "bg-tokyo-comment/20",
};

const textClasses: Record<StatusTone, string> = {
    info: "text-tokyo-blue",
    success: "text-tokyo-green",
    warning: "text-tokyo-yellow",
    danger: "text-tokyo-red",
    muted: "text-tokyo-comment",
};

export function StatusChip({ label, icon, tone = "muted", className }: StatusChipProps) {
    return (
        <View
            className={cn(
                "flex-row items-center gap-1.5 rounded-full px-2.5 py-1",
                toneClasses[tone],
                className
            )}
        >
            {icon}
            <Text className={cn("text-xs font-medium", textClasses[tone])}>{label}</Text>
        </View>
    );
}
