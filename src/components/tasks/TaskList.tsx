import { useCallback } from "react";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTaskStore } from "@/stores/taskStore";
import { TaskItem } from "./TaskItem";
import { Task } from "@/types/task";
import { ListTodo } from "lucide-react-native";

export function TaskList() {
    // Only subscribe to tasks array
    const tasks = useTaskStore(state => state.tasks);

    // Sort: active first, then by creation date (newest first)
    const sortedTasks = [...tasks].sort((a, b) => {
        const activeStatuses = ["running", "awaiting_confirmation", "queued"];
        const aActive = activeStatuses.includes(a.status);
        const bActive = activeStatuses.includes(b.status);

        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return b.createdAt - a.createdAt;
    });

    const renderItem = useCallback(({ item }: { item: Task }) => <TaskItem task={item} />, []);

    const keyExtractor = useCallback((item: Task) => item.id, []);

    if (tasks.length === 0) {
        return (
            <View className="flex-1 items-center justify-center p-8">
                <ListTodo size={48} color="#565f89" />
                <Text className="text-tokyo-comment text-lg mt-4 text-center">
                    No background tasks yet
                </Text>
                <Text className="text-tokyo-comment/70 text-sm mt-2 text-center">
                    Long-press the send button to run a task in the background
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={sortedTasks}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            // Performance optimizations
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
        />
    );
}
