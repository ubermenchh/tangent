import { Text } from "@/components/ui/text";
import { ToolCall } from "@/types/message";
import { Loader2, CheckCircle, XCircle, Wrench } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const TOOL_ICONS: Record<string, string> = {
    web_search: "Search web",
    search_contacts: "Searching contacts",
    send_sms: "Sending SMS",
    search_files: "Searching files",
    get_device_info: "Getting device info",
    get_battery_status: "Checking battery",
};

export function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
    const label = TOOL_ICONS[toolCall.name] ?? toolCall.name;

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-row items-center gap-2 bg-zinc-700/50 rounded-lg px-3 py-2 my-1"
        >
            {toolCall.status === "running" ? (
                <Loader2 size={14} color="#a1a1aa" className="animate-spin" />
            ) : toolCall.status === "success" ? (
                <CheckCircle size={14} color="#22c55e" />
            ) : toolCall.status === "error" ? (
                <XCircle size={14} color="#ef4444" />
            ) : (
                <Wrench size={14} color="#a1a1aa" />
            )}
            <Text className="text-zinc-400 text-sm">{label}</Text>
        </Animated.View>
    );
}
