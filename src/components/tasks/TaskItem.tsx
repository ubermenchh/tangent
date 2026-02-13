import { memo, useCallback } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Task } from "@/types/task";
import { useTaskStore } from "@/stores/taskStore";
import { backgroundTaskService } from "@/services/backgroundTaskService";
import { cn } from "@/lib/utils";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Clock, CheckCircle, XCircle, AlertCircle, X, Loader } from "lucide-react-native";

const STATUS_CONFIG = {
    queued: {
        icon: Clock,
        color: "#b6bfdc",
        border: "border-[#3a4158]",
        bg: "bg-[#1b2032]",
        label: "Queued",
    },
    running: {
        icon: Loader,
        color: "#c7d3ff",
        border: "border-[#485483]",
        bg: "bg-[#1c2548]",
        label: "Running",
    },
    awaiting_confirmation: {
        icon: AlertCircle,
        color: "#ffd392",
        border: "border-[#7b5e35]",
        bg: "bg-[#3b2a17]",
        label: "Awaiting Approval",
    },
    completed: {
        icon: CheckCircle,
        color: "#b8f7e1",
        border: "border-[#356456]",
        bg: "bg-[#17362e]",
        label: "Completed",
    },
    failed: {
        icon: XCircle,
        color: "#ffb0be",
        border: "border-[#7a3a4a]",
        bg: "bg-[#4a1e29]",
        label: "Failed",
    },
    cancelled: {
        icon: X,
        color: "#a9b1cd",
        border: "border-[#3a4158]",
        bg: "bg-[#1b2032]",
        label: "Cancelled",
    },
};

interface TaskItemProps {
    task: Task;
}

export const TaskItem = memo(function TaskItem({ task }: TaskItemProps) {
    const { cancelTask, confirmAction } = useTaskStore();

    const config = STATUS_CONFIG[task.status];
    const StatusIcon = config.icon;

    const handleCancel = useCallback(() => {
        cancelTask(task.id);
        backgroundTaskService.stop();
    }, [task.id, cancelTask]);

    const handleConfirm = useCallback(
        (approved: boolean) => {
            confirmAction(task.id, approved);
        },
        [task.id, confirmAction]
    );

    const isActive = task.status === "running" || task.status === "queued";
    const needsConfirmation = task.status === "awaiting_confirmation";

    return (
        <Animated.View
            entering={FadeInDown.duration(200).springify()}
            className={cn(
                "mb-3 overflow-hidden rounded-[24px] border p-4",
                config.bg,
                config.border,
                "shadow-black/40"
            )}
        >
            <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                    <StatusIcon size={16} color={config.color} />
                    <Text style={{ color: config.color }} className="text-sm font-medium">
                        {config.label}
                    </Text>
                </View>

                {isActive && (
                    <Pressable
                        onPress={handleCancel}
                        className="rounded-full border border-[#7a3a4a] bg-[#4a1e29] p-2"
                        hitSlop={8}
                    >
                        <X size={14} color="#ff9aad" />
                    </Pressable>
                )}
            </View>

            <Text className="mb-2 text-base text-[#eff3ff]" numberOfLines={2}>
                {task.prompt}
            </Text>

            {task.status === "running" && (
                <View className="mb-2">
                    <View className="h-1.5 overflow-hidden rounded-full bg-[#2a3044]">
                        <View
                            className="h-full rounded-full bg-[#aab8ff]"
                            style={{ width: `${task.progress}%` }}
                        />
                    </View>
                    {task.currentStep && (
                        <Text className="mt-1 text-xs text-[#a0aaca]">{task.currentStep}</Text>
                    )}
                </View>
            )}

            {needsConfirmation && task.pendingConfirmation && (
                <View className="mt-2 rounded-2xl border border-[#7b5e35] bg-[#2e2213] p-3">
                    <Text className="mb-2 text-sm font-medium text-[#ffd392]">
                        {task.pendingConfirmation.description}
                    </Text>
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={() => handleConfirm(true)}
                            className="flex-1 items-center rounded-xl border border-[#84e0bf] bg-[#dff6ee] py-2"
                        >
                            <Text className="font-medium text-[#10291f]">Approve</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => handleConfirm(false)}
                            className="flex-1 items-center rounded-xl border border-[#7a3a4a] bg-[#4a1e29] py-2"
                        >
                            <Text className="font-medium text-[#ffd3dc]">Deny</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {task.status === "failed" && task.error && (
                <View className="mt-2 rounded-xl border border-[#7a3a4a] bg-[#3a1d2a] p-2">
                    <Text className="text-sm text-[#ffb0be]">{task.error}</Text>
                </View>
            )}

            {task.status === "completed" && task.result && (
                <View className="mt-2 rounded-xl border border-[#356456] bg-[#0f1c1a] p-3">
                    <Text className="text-sm text-[#dff6ee]">{task.result}</Text>
                </View>
            )}

            <Text className="mt-2 text-xs text-[#97a0bf]">
                {new Date(task.createdAt).toLocaleString()}
            </Text>
        </Animated.View>
    );
});
