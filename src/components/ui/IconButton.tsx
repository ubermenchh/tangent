import { ReactNode } from "react";
import { Pressable } from "react-native";
import { cn } from "@/lib/utils";

type IconButtonTone = "neutral" | "accent" | "danger" | "ghost";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps {
    children: ReactNode;
    onPress: () => void;
    accessibilityLabel: string;
    tone?: IconButtonTone;
    size?: IconButtonSize;
    className?: string;
    disabled?: boolean;
    hitSlop?: number;
}

const toneClasses: Record<IconButtonTone, string> = {
    neutral: "border border-tokyo-bg-highlight bg-tokyo-storm active:bg-tokyo-bg-highlight/70",
    accent: "border border-tokyo-blue/40 bg-tokyo-blue/20 active:bg-tokyo-blue/30",
    danger: "border border-tokyo-red/40 bg-tokyo-red/15 active:bg-tokyo-red/25",
    ghost: "border border-transparent bg-transparent active:bg-tokyo-bg-highlight/50",
};

const sizeClasses: Record<IconButtonSize, string> = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
};

export function IconButton({
    children,
    onPress,
    accessibilityLabel,
    tone = "neutral",
    size = "md",
    className,
    disabled = false,
    hitSlop = 8,
}: IconButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            className={cn(
                "items-center justify-center rounded-none",
                toneClasses[tone],
                sizeClasses[size],
                disabled ? "opacity-50" : "",
                className
            )}
        >
            {children}
        </Pressable>
    );
}
