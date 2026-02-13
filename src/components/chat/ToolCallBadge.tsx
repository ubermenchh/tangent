import { useState } from "react";
import { TouchableOpacity, View, ScrollView } from "react-native";
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
    Phone,
    Bell,
    Clipboard,
    Navigation,
    Play,
    Search,
    Accessibility,
    ArrowLeft,
    Home,
    LucideIcon,
} from "lucide-react-native";

const TOOL_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
    web_search: { label: "Web Search", Icon: Globe },
    find_similar: { label: "Find Similar", Icon: Search },
    get_page_content: { label: "Get Page Content", Icon: Globe },
    search_files: { label: "Search Files", Icon: FolderSearch },

    get_device_info: { label: "Device Info", Icon: Smartphone },
    get_battery_status: { label: "Battery Status", Icon: Battery },

    search_contacts: { label: "Search Contacts", Icon: Users },
    send_sms: { label: "Send SMS", Icon: MessageSquare },
    make_phone_call: { label: "Phone Call", Icon: Phone },

    open_app: { label: "Open App", Icon: Play },
    open_url: { label: "Open URL", Icon: Globe },
    navigate_to: { label: "Navigate", Icon: Navigation },

    schedule_reminder: { label: "Schedule Reminder", Icon: Bell },
    get_scheduled_reminders: { label: "Get Reminders", Icon: Bell },
    cancel_reminder: { label: "Cancel Reminder", Icon: Bell },

    get_clipboard: { label: "Get Clipboard", Icon: Clipboard },
    set_clipboard: { label: "Set Clipboard", Icon: Clipboard },

    check_accessibility: { label: "Check Accessibility", Icon: Accessibility },
    get_screen: { label: "Get Screen", Icon: Smartphone },
    tap: { label: "Tap Element", Icon: Smartphone },
    tap_at: { label: "Tap at Position", Icon: Smartphone },
    type_text: { label: "Type Text", Icon: Smartphone },
    scroll: { label: "Scroll", Icon: Smartphone },
    press_back: { label: "Press Back", Icon: ArrowLeft },
    go_home: { label: "Go Home", Icon: Home },

    search_videos: { label: "Search Videos", Icon: Play },
    play_video: { label: "Play Video", Icon: Play },
};

function formatValue(value: unknown, maxLength = 200): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") {
        return value.length > maxLength ? value.slice(0, maxLength) + "..." : value;
    }

    try {
        const str = JSON.stringify(value, null, 2);
        return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
    } catch {
        return String(value);
    }
}

export function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
    const [expanded, setExpanded] = useState(false);
    const config = TOOL_CONFIG[toolCall.name] ?? { label: toolCall.name, Icon: Wrench };
    const { label, Icon } = config;

    const isRunning = toolCall.status === "running";
    const isPending = toolCall.status === "pending";
    const isSuccess = toolCall.status === "success";
    const isError = toolCall.status === "error";

    const hasArgs = Object.keys(toolCall.arguments || {}).length > 0;
    const hasResult = toolCall.result !== undefined;
    const hasContent = hasArgs || hasResult;

    const containerClass = isError
        ? "border-[#7a3a4a] bg-[#3a1d2a]"
        : isRunning || isPending
          ? "border-[#45507a] bg-[#1d2646]"
          : isSuccess
            ? "border-[#356456] bg-[#17362e]"
            : "border-[#2b3044] bg-[#141826]";

    return (
        <Animated.View entering={FadeInDown.duration(200)} className="mb-2">
            <TouchableOpacity
                onPress={() => hasContent && setExpanded(prev => !prev)}
                activeOpacity={hasContent ? 0.7 : 1}
                className={`flex-row items-center gap-2 rounded-xl border px-3 py-2 ${containerClass}`}
            >
                {isRunning || isPending ? (
                    <Animated.View entering={FadeIn}>
                        <Loader2 size={14} color="#b7c6ff" />
                    </Animated.View>
                ) : isSuccess ? (
                    <CheckCircle size={14} color="#8ce2bc" />
                ) : isError ? (
                    <XCircle size={14} color="#ff9aad" />
                ) : (
                    <Icon size={14} color="#b7c6ff" />
                )}

                <Text className="flex-1 text-sm text-[#dde5ff]">{label}</Text>

                {hasContent ? (
                    expanded ? (
                        <ChevronUp size={14} color="#8891b1" />
                    ) : (
                        <ChevronDown size={14} color="#8891b1" />
                    )
                ) : null}
            </TouchableOpacity>

            {expanded && hasContent ? (
                <Animated.View
                    entering={FadeInDown.duration(150)}
                    className="mt-1 overflow-hidden rounded-xl border border-[#2a3044] bg-[#0d111d]"
                >
                    {hasArgs && (
                        <View className="border-b border-[#252b3f]">
                            <View className="bg-[#1a2033] px-3 py-1.5">
                                <Text className="text-xs font-semibold text-[#c2ccff]">Input</Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="px-3 py-2"
                            >
                                <Text
                                    className="text-xs font-mono text-[#cfdaff]"
                                    style={{ maxWidth: 500 }}
                                >
                                    {formatValue(toolCall.arguments, 500)}
                                </Text>
                            </ScrollView>
                        </View>
                    )}

                    {hasResult && (
                        <View>
                            <View className="bg-[#1a2033] px-3 py-1.5">
                                <Text className="text-xs font-semibold text-[#8ce2bc]">Output</Text>
                            </View>
                            <ScrollView
                                style={{ maxHeight: 200 }}
                                showsVerticalScrollIndicator
                                className="px-3 py-2"
                            >
                                <Text className="text-xs font-mono text-[#cfdaff]" selectable>
                                    {formatValue(toolCall.result, 1000)}
                                </Text>
                            </ScrollView>
                        </View>
                    )}
                </Animated.View>
            ) : null}
        </Animated.View>
    );
}
