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
    // Web & Search
    web_search: { label: "Web Search", Icon: Globe },
    find_similar: { label: "Find Similar", Icon: Search },
    get_page_content: { label: "Get Page Content", Icon: Globe },
    search_files: { label: "Search Files", Icon: FolderSearch },

    // Device
    get_device_info: { label: "Device Info", Icon: Smartphone },
    get_battery_status: { label: "Battery Status", Icon: Battery },

    // Communication
    search_contacts: { label: "Search Contacts", Icon: Users },
    send_sms: { label: "Send SMS", Icon: MessageSquare },
    make_phone_call: { label: "Phone Call", Icon: Phone },

    // Apps & Navigation
    open_app: { label: "Open App", Icon: Play },
    open_url: { label: "Open URL", Icon: Globe },
    navigate_to: { label: "Navigate", Icon: Navigation },

    // Notifications & Reminders
    schedule_reminder: { label: "Schedule Reminder", Icon: Bell },
    get_scheduled_reminders: { label: "Get Reminders", Icon: Bell },
    cancel_reminder: { label: "Cancel Reminder", Icon: Bell },

    // Clipboard
    get_clipboard: { label: "Get Clipboard", Icon: Clipboard },
    set_clipboard: { label: "Set Clipboard", Icon: Clipboard },

    // Accessibility
    check_accessibility: { label: "Check Accessibility", Icon: Accessibility },
    get_screen: { label: "Get Screen", Icon: Smartphone },
    tap: { label: "Tap Element", Icon: Smartphone },
    tap_at: { label: "Tap at Position", Icon: Smartphone },
    type_text: { label: "Type Text", Icon: Smartphone },
    scroll: { label: "Scroll", Icon: Smartphone },
    press_back: { label: "Press Back", Icon: ArrowLeft },
    go_home: { label: "Go Home", Icon: Home },

    // YouTube
    search_videos: { label: "Search Videos", Icon: Play },
    play_video: { label: "Play Video", Icon: Play },
};

function formatValue(value: unknown, maxLength = 200): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") {
        return value.length > maxLength ? value.slice(0, maxLength) + "..." : value;
    }
    const str = JSON.stringify(value, null, 2);
    return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
}

export function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
    const [expanded, setExpanded] = useState(false);
    const config = TOOL_CONFIG[toolCall.name] ?? { label: toolCall.name, Icon: Wrench };
    const { label, Icon } = config;

    const isRunning = toolCall.status === "running";
    const isSuccess = toolCall.status === "success";
    const isError = toolCall.status === "error";

    const hasContent = Object.keys(toolCall.arguments || {}).length > 0 || toolCall.result;

    return (
        <Animated.View entering={FadeInDown.duration(200)} className="mb-2">
            <TouchableOpacity
                onPress={() => hasContent && setExpanded(!expanded)}
                activeOpacity={hasContent ? 0.7 : 1}
                className={`flex-row items-center gap-2 rounded-lg px-3 py-2 ${
                    isError
                        ? "bg-tokyo-red/20 border border-tokyo-red/30"
                        : isRunning
                          ? "bg-tokyo-blue/20 border border-tokyo-blue/30"
                          : "bg-tokyo-bg-highlight/70"
                }`}
            >
                {isRunning ? (
                    <Animated.View entering={FadeIn}>
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

                {hasContent ? (
                    expanded ? (
                        <ChevronUp size={14} color="#565f89" />
                    ) : (
                        <ChevronDown size={14} color="#565f89" />
                    )
                ) : null}
            </TouchableOpacity>

            {expanded && hasContent ? (
                <Animated.View
                    entering={FadeInDown.duration(150)}
                    className="mt-1 bg-tokyo-bg rounded-lg border border-tokyo-bg-highlight overflow-hidden"
                >
                    {/* Input Section */}
                    {Object.keys(toolCall.arguments || {}).length > 0 && (
                        <View className="border-b border-tokyo-bg-highlight">
                            <View className="px-3 py-1.5 bg-tokyo-bg-highlight/50">
                                <Text className="text-tokyo-purple text-xs font-semibold">
                                    Input
                                </Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="px-3 py-2"
                            >
                                <Text
                                    className="text-tokyo-fg-dark text-xs font-mono"
                                    style={{ maxWidth: 500 }}
                                >
                                    {formatValue(toolCall.arguments, 500)}
                                </Text>
                            </ScrollView>
                        </View>
                    )}

                    {/* Output Section */}
                    {toolCall.result !== undefined && (
                        <View>
                            <View className="px-3 py-1.5 bg-tokyo-bg-highlight/50">
                                <Text className="text-tokyo-green text-xs font-semibold">
                                    Output
                                </Text>
                            </View>
                            <ScrollView
                                style={{ maxHeight: 200 }}
                                showsVerticalScrollIndicator
                                className="px-3 py-2"
                            >
                                <Text className="text-tokyo-fg-dark text-xs font-mono" selectable>
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
