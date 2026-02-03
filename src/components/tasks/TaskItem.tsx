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
        color: "#565f89",
        bg: "bg-tokyo-comment/20",
        label: "Queued",
    },
    running: {
        icon: Loader,
        color: "#7aa2f7",
        bg: "bg-tokyo-blue/20",
        label: "Running",
    },
    awaiting_confirmation: {
        icon: AlertCircle,
        color: "#e0af68",
        bg: "bg-tokyo-yellow/20",
        label: "Awaiting Approval",
    },
    completed: {
        icon: CheckCircle,
        color: "#9ece6a",
        bg: "bg-tokyo-green/20",
        label: "Completed",
    },
    failed: {
        icon: XCircle,
        color: "#f7768e",
        bg: "bg-tokyo-red/20",
        label: "Failed",
    },
    cancelled: {
        icon: X,
        color: "#565f89",
        bg: "bg-tokyo-comment/20",
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
            className={cn("p-4 rounded-xl border mb-3", config.bg, "border-tokyo-bg-highlight")}
        >
            {/* Header: Status + Cancel */}
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                    <StatusIcon size={16} color={config.color} />
                    <Text style={{ color: config.color }} className="text-sm font-medium">
                        {config.label}
                    </Text>
                </View>

                {isActive && (
                    <Pressable
                        onPress={handleCancel}
                        className="p-2 rounded-lg bg-tokyo-red/20"
                        hitSlop={8}
                    >
                        <X size={14} color="#f7768e" />
                    </Pressable>
                )}
            </View>

            {/* Prompt */}
            <Text className="text-tokyo-fg text-base mb-2" numberOfLines={2}>
                {task.prompt}
            </Text>

            {/* Progress Bar (for running tasks) */}
            {task.status === "running" && (
                <View className="mb-2">
                    <View className="h-1 bg-tokyo-bg-highlight rounded-full overflow-hidden">
                        <View
                            className="h-full bg-tokyo-blue rounded-full"
                            style={{ width: `${task.progress}%` }}
                        />
                    </View>
                    {task.currentStep && (
                        <Text className="text-tokyo-comment text-xs mt-1">{task.currentStep}</Text>
                    )}
                </View>
            )}

            {/* Confirmation UI */}
            {needsConfirmation && task.pendingConfirmation && (
                <View className="mt-2 p-3 bg-tokyo-yellow/10 rounded-lg border border-tokyo-yellow/30">
                    <Text className="text-tokyo-yellow text-sm font-medium mb-2">
                        {task.pendingConfirmation.description}
                    </Text>
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={() => handleConfirm(true)}
                            className="flex-1 py-2 rounded-lg bg-tokyo-green items-center"
                        >
                            <Text className="text-tokyo-bg font-medium">Approve</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => handleConfirm(false)}
                            className="flex-1 py-2 rounded-lg bg-tokyo-red items-center"
                        >
                            <Text className="text-tokyo-bg font-medium">Deny</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Error Message */}
            {task.status === "failed" && task.error && (
                <View className="mt-2 p-2 bg-tokyo-red/10 rounded-lg">
                    <Text className="text-tokyo-red text-sm">{task.error}</Text>
                </View>
            )}

            {/* Result Message */}
            {task.status === "completed" && task.result && (
                <View className="mt-2 p-2 bg-tokyo-green/10 rounded-lg">
                    <Text className="text-tokyo-green text-sm">{task.result}</Text>
                </View>
            )}

            {/* Timestamp */}
            <Text className="text-tokyo-comment text-xs mt-2">
                {new Date(task.createdAt).toLocaleString()}
            </Text>
        </Animated.View>
    );
});
