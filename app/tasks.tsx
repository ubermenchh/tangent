import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { TaskList } from "@/components/tasks";
import { useTaskStore } from "@/stores/taskStore";
import { router } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TopBar } from "@/components/ui/TopBar";
import { IconButton } from "@/components/ui/IconButton";

export default function TasksScreen() {
    const clearCompletedTasks = useTaskStore(s => s.clearCompletedTasks);
    const taskCount = useTaskStore(s => s.tasks.length);
    const activeCount = useTaskStore(
        s =>
            s.tasks.filter(t => ["queued", "running", "awaiting_confirmation"].includes(t.status))
                .length
    );
    const hasCompletedTasks = useTaskStore(s =>
        s.tasks.some(t => ["completed", "failed", "cancelled"].includes(t.status))
    );

    return (
        <ScreenContainer edges={["top"]} className="bg-[#04050b]">
            <View pointerEvents="none" className="absolute inset-0">
                <View
                    className="absolute rounded-full bg-[#89a2ff]/15"
                    style={{ width: 240, height: 240, top: 60, right: -110 }}
                />
                <View
                    className="absolute rounded-full bg-[#8de0d4]/10"
                    style={{ width: 220, height: 220, bottom: 40, left: -90 }}
                />
            </View>

            <TopBar
                title="Background Tasks"
                className="border-[#1a1d28] bg-[#060812]/90"
                titleClassName="text-[#f1f4ff]"
                left={
                    <IconButton
                        onPress={() => router.back()}
                        accessibilityLabel="Back"
                        tone="neutral"
                        className="rounded-full border-[#2a2e3f] bg-[#111524]"
                        hitSlop={8}
                    >
                        <ArrowLeft size={20} color="#e7ecff" />
                    </IconButton>
                }
                right={
                    hasCompletedTasks ? (
                        <Pressable
                            onPress={clearCompletedTasks}
                            className="flex-row items-center gap-2 rounded-full border border-[#7a3a4a] bg-[#4a1e29] px-3 py-2"
                        >
                            <Trash2 size={16} color="#ff9aad" />
                            <Text className="text-sm text-[#ffd1da]">Clear</Text>
                        </Pressable>
                    ) : (
                        <View style={{ width: 44 }} />
                    )
                }
            />

            <View className="px-4 pb-3 pt-3">
                <View className="flex-row items-center gap-2">
                    <View className="rounded-full border border-[#2b3147] bg-[#101427] px-3 py-1.5">
                        <Text className="text-xs font-semibold text-[#dce4ff]">
                            {taskCount} total
                        </Text>
                    </View>
                    <View className="rounded-full border border-[#355d4f] bg-[#17362e] px-3 py-1.5">
                        <Text className="text-xs font-semibold text-[#b8f7e1]">
                            {activeCount} active
                        </Text>
                    </View>
                </View>
                <Text className="mt-2 text-sm text-[#9aa3c2]">
                    Long-running actions continue here when chat is interrupted or backgrounded.
                </Text>
            </View>

            <TaskList />
        </ScreenContainer>
    );
}
