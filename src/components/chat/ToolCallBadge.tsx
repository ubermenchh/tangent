import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";
import { ToolCall } from "@/types/message";
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
    Users,
    MessageSquare,
    FolderSearch,
    Smartphone,
    Battery,
    Globe,
    Wrench,
    LucideIcon,
} from "lucide-react-native";

const TOOL_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
    web_search: { label: "Searching the web", Icon: Globe },
    search_contacts: { label: "Searching contacts", Icon: Users },
    send_sms: { label: "Sending SMS", Icon: MessageSquare },
    search_files: { label: "Searching files", Icon: FolderSearch },
    get_device_info: { label: "Getting device info", Icon: Smartphone },
    get_battery_status: { label: "Checking battery", Icon: Battery },
};

export function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
    const [expanded, setExpanded] = useState(false);
    const config = TOOL_CONFIG[toolCall.name] ?? { label: toolCall.name, Icon: Wrench };
    const { label, Icon } = config;

    const isRunning = toolCall.status === "running";
    const isSuccess = toolCall.status === "success";
    const isError = toolCall.status === "error";

    return (
        <Animated.View entering={FadeInDown.duration(200)} className="mb-2">
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
                className={`flex-row items-center gap-2 rounded-lg px-3 py-2 ${
                    isError
                        ? "bg-tokyo-red/20 border border-tokyo-red/30"
                        : "bg-tokyo-bg-highlight/70"
                }`}
            >
                {isRunning ? (
                    <Animated.View entering={FadeIn} className="animate-spin">
                        <Loader2 size={14} color="#7aa2f7" />
                    </Animated.View>
                ) : isSuccess ? (
                    <CheckCircle size={14} color="#9ece6a" />
                ) : isError ? (
                    <XCircle size={14} color="#f7768e" />
                ) : (
                    <Icon size={14} color="#7aa2f7" />
                )}

                <Text className="text-tokyo-fg-dark text-sm flex-1">{label}</Text>

                {toolCall.result ? (
                    expanded ? (
                        <ChevronUp size={14} color="#565f89" />
                    ) : (
                        <ChevronDown size={14} color="#565f89" />
                    )
                ) : null}
            </TouchableOpacity>

            {expanded && toolCall.result ? (
                <Animated.View
                    entering={FadeInDown.duration(150)}
                    className="mt-1 px-3 py-2 bg-tokyo-bg-dark rounded-lg"
                >
                    <Text className="text-tokyo-comment text-xs font-mono" numberOfLines={10}>
                        {typeof toolCall.result === "string"
                            ? toolCall.result
                            : JSON.stringify(toolCall.result, null, 2)}
                    </Text>
                </Animated.View>
            ) : null}
        </Animated.View>
    );
}
