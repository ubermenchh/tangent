import * as React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cssInterop } from "nativewind";
import { cn } from "@/lib/utils";

cssInterop(RNText, { className: "style" });

interface TextProps extends RNTextProps {
    className?: string;
}

const Text = React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(
    ({ className, ...props }, ref) => {
        return (
            <RNText
                className={cn("text-base text-foreground web:select-text", className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Text.displayName = "Text";

export { Text };
