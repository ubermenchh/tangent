import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { TaskList } from "@/components/tasks";
import { useTaskStore } from "@/stores/taskStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";

export default function TasksScreen() {
    const clearCompletedTasks = useTaskStore(s => s.clearCompletedTasks);
    const hasCompletedTasks = useTaskStore(s =>
        s.tasks.some(t => ["completed", "failed", "cancelled"].includes(t.status))
    );

    return (
        <SafeAreaView className="flex-1 bg-tokyo-bg" edges={["top"]}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-tokyo-bg-highlight">
                <View className="flex-row items-center gap-3">
                    <Pressable
                        onPress={() => router.back()}
                        className="p-2 rounded-lg bg-tokyo-storm"
                        hitSlop={8}
                    >
                        <ArrowLeft size={20} color="#c0caf5" />
                    </Pressable>
                    <Text className="text-tokyo-fg text-xl font-semibold">Background Tasks</Text>
                </View>

                {hasCompletedTasks && (
                    <Pressable
                        onPress={clearCompletedTasks}
                        className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-tokyo-red/20"
                    >
                        <Trash2 size={16} color="#f7768e" />
                        <Text className="text-tokyo-red text-sm">Clear</Text>
                    </Pressable>
                )}
            </View>

            {/* Task List */}
            <TaskList />
        </SafeAreaView>
    );
}
