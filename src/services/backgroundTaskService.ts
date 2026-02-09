import BackgroundService from "react-native-background-actions";
import { useChatStore } from "@/stores/chatStore";
import { useTaskStore } from "@/stores/taskStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { AgentOrchestrator } from "@/agent";
import { initializeSkills } from "@/skills";
import { logger } from "@/lib/logger";

const log = logger.create("BackgroundTaskService");

interface TaskParams {
    taskId: string;
    prompt: string;
}

class BackgroundTaskService {
    private isRunning = false;
    private orchestrator: AgentOrchestrator | null = null;

    async startTask(taskId: string, prompt: string): Promise<void> {
        const { updateTask, getTask } = useTaskStore.getState();
        const task = getTask(taskId);

        if (!task) {
            log.error(`Task not found: ${taskId}`);
            return;
        }

        if (this.isRunning) {
            log.info(`Task ${taskId} queued - another task is running`);
            return;
        }

        const apiKey = useSettingsStore.getState().geminiApiKey;
        if (!apiKey) {
            updateTask(taskId, { status: "failed", error: "No API key configured" });
            return;
        }

        initializeSkills();
        this.orchestrator = new AgentOrchestrator({ apiKey });

        const options = {
            taskName: "TangentTask",
            taskTitle: "Tangent",
            taskDesc: prompt.length > 50 ? prompt.slice(0, 47) + "..." : prompt,
            taskIcon: {
                name: "ic_launcher",
                type: "mipmap",
            },
            color: "#7aa2f7",
            linkingURI: `tangent://task/${taskId}`,
            parameters: { taskId, prompt } as TaskParams,
            progressBar: {
                max: 100,
                value: 0,
            },
        };

        log.info(`Starting background task: ${taskId}`);

        try {
            await BackgroundService.start(
                params => this.executeTask(params as TaskParams),
                options
            );
        } catch (error) {
            log.error(`Failed to start background service`, error);
            updateTask(taskId, {
                status: "failed",
                error:
                    error instanceof Error ? error.message : "Failed to start background service",
            });
        }
    }

    private async executeTask({ taskId, prompt }: TaskParams): Promise<void> {
        this.isRunning = true;
        const { updateTask, getTask, setActiveTask } = useTaskStore.getState();

        setActiveTask(taskId);
        updateTask(taskId, { status: "running", progress: 10 });

        try {
            await BackgroundService.updateNotification({
                taskDesc: "Processing your request...",
                progressBar: { max: 100, value: 10 },
            });

            log.info(`Executing task via orchestrator: ${taskId}`);

            updateTask(taskId, { currentStep: "Thinking...", progress: 20 });
            await BackgroundService.updateNotification({
                taskDesc: "Thinking...",
                progressBar: { max: 100, value: 20 },
            });

            // Check for cancellation before starting
            const currentTask = getTask(taskId);
            if (!currentTask || currentTask.status === "cancelled") {
                log.info(`Task ${taskId} was cancelled before execution`);
                await this.stop();
                return;
            }

            const result = await this.orchestrator!.execute(prompt, [], {
                maxSteps: 15,
            });

            // Check for cancellation after execution
            if (!BackgroundService.isRunning()) {
                log.info(`Background service stopped during task ${taskId}`);
                updateTask(taskId, { status: "cancelled" });
                return;
            }

            const resultText = result.content || "Task completed successfully";

            log.info(
                `Task ${taskId} completed, parallel=${result.parallel}, ` +
                    `subtasks=${result.subResults.length}`
            );

            updateTask(taskId, {
                status: "completed",
                progress: 100,
                result: resultText,
                completedAt: Date.now(),
                currentStep: undefined,
            });

            // Only add the assistant response -- ChatInput already added the user message
            const { addMessage } = useChatStore.getState();
            addMessage("assistant", resultText);

            await BackgroundService.updateNotification({
                taskTitle: "Task Complete",
                taskDesc: "Tap to view results",
                progressBar: { max: 100, value: 100 },
            });
        } catch (error) {
            log.error(`Task execution error: ${taskId}`, error);
            updateTask(taskId, {
                status: "failed",
                error: error instanceof Error ? error.message : "Execution failed",
                currentStep: undefined,
            });

            await BackgroundService.updateNotification({
                taskTitle: "Task Failed",
                taskDesc: error instanceof Error ? error.message : "Execution failed",
            });
        } finally {
            this.isRunning = false;
            setActiveTask(null);

            await this.processQueue();
        }
    }

    private async processQueue(): Promise<void> {
        if (this.isRunning) return;

        const { tasks } = useTaskStore.getState();
        const queuedTasks = tasks
            .filter(t => t.status === "queued")
            .sort((a, b) => a.createdAt - b.createdAt);

        if (queuedTasks.length > 0) {
            const next = queuedTasks[0];
            log.info(`Processing next queued task: ${next.id}`);
            await this.startTask(next.id, next.prompt);
        } else {
            log.info("No more tasks in queue, stopping background service");
            await BackgroundService.stop();
        }
    }

    async stop(): Promise<void> {
        log.info("Stopping background task service");
        this.orchestrator?.cancel();
        this.orchestrator = null;
        this.isRunning = false;

        try {
            await BackgroundService.stop();
        } catch (error) {
            log.error("Error stopping background service", error);
        }
    }

    isTaskRunning(): boolean {
        return this.isRunning;
    }
}

export const backgroundTaskService = new BackgroundTaskService();
