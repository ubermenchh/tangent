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
            <View className="mx-4 mt-2 flex-1 items-center justify-center rounded-[28px] border border-[#ffffff20] bg-[#0e111bcc] p-8">
                <View className="h-16 w-16 items-center justify-center rounded-full border border-[#2c3348] bg-[#151a2a]">
                    <ListTodo size={28} color="#a7afcd" />
                </View>
                <Text className="mt-4 text-center text-lg font-semibold text-[#ecf1ff]">
                    No background tasks yet
                </Text>
                <Text className="mt-2 text-center text-sm leading-6 text-[#9aa3c2]">
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
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            // Performance optimizations
            removeClippedSubviews={false}
            maxToRenderPerBatch={10}
            windowSize={5}
        />
    );
}
