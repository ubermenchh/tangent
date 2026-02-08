import BackgroundService from "react-native-background-actions";
import { useChatStore } from "@/stores/chatStore";
import { useTaskStore } from "@/stores/taskStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Agent } from "@/agent";
import { logger } from "@/lib/logger";

const log = logger.create("BackgroundTaskService");

const SENSITIVE_TOOLS = new Set(["send_sms", "make_phone_call", "send_whatsapp"]);

interface TaskParams {
    taskId: string;
    prompt: string;
}

class BackgroundTaskService {
    private isRunning = false;
    private agent: Agent | null = null;

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

        this.agent = new Agent({ apiKey });

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
        updateTask(taskId, { status: "running", progress: 5 });

        let accumulatedtext = "";

        try {
            await BackgroundService.updateNotification({
                taskDesc: "Processing your request...",
                progressBar: { max: 100, value: 5 },
            });

            log.info(`Executing task: ${taskId}`);

            for await (const chunk of this.agent!.processMessageStream(prompt, [], {
                streaming: false,
                maxSteps: 15,
            })) {
                if (!BackgroundService.isRunning()) {
                    log.info(`Background service stopped, cancelling task ${taskId}`);
                    updateTask(taskId, { status: "cancelled" });
                    break;
                }

                const currentTask = getTask(taskId);
                if (!currentTask || currentTask.status === "cancelled") {
                    log.info(`Task ${taskId} was cancelled`);
                    await this.stop();
                    break;
                }

                switch (chunk.type) {
                    case "thinking":
                        updateTask(taskId, { currentStep: "Thinking...", progress: 10 });
                        await BackgroundService.updateNotification({
                            taskDesc: "Thinking...",
                            progressBar: { max: 100, value: 10 },
                        });
                        break;

                    case "tool-call": {
                        const toolName = chunk.toolCall?.name || "unknown";
                        const toolArgs = chunk.toolCall?.arguments || {};

                        log.info(`Tool call: ${toolName}`);

                        if (SENSITIVE_TOOLS.has(toolName)) {
                            log.info(
                                `Sensitive tool detected: ${toolName}, requesting confirmation`
                            );

                            updateTask(taskId, {
                                status: "awaiting_confirmation",
                                currentStep: `Waiting for approval: ${toolName}`,
                                pendingConfirmation: {
                                    action: toolName,
                                    description: this.getToolDescription(toolName, toolArgs),
                                    toolCall: { name: toolName, arguments: toolArgs },
                                },
                            });

                            await BackgroundService.updateNotification({
                                taskTitle: "Approval Required",
                                taskDesc: `Approve: ${toolName}?`,
                                progressBar: { max: 100, value: 50 },
                            });

                            const approved = await this.waitForConfirmation(taskId);

                            if (!approved) {
                                log.info(`User denied action: ${toolName}`);
                                await this.stop();
                                return;
                            }

                            log.info(`User approved action: ${toolName}`);
                            await BackgroundService.updateNotification({
                                taskTitle: "Tangent",
                                taskDesc: `Running: ${toolName}`,
                                progressBar: { max: 100, value: 60 },
                            });
                        } else {
                            updateTask(taskId, {
                                currentStep: `Running: ${toolName}`,
                                progress: 50,
                            });
                            await BackgroundService.updateNotification({
                                taskDesc: `Running: ${toolName}`,
                                progressBar: { max: 100, value: 50 },
                            });
                        }
                        break;
                    }

                    case "tool-call-end": {
                        const toolName = chunk.toolCall?.name || "unknown";
                        log.info(`Tool completed: ${toolName}`);
                        updateTask(taskId, {
                            currentStep: `Completed: ${toolName}`,
                            progress: 60,
                        });
                        await BackgroundService.updateNotification({
                            taskDesc: `Completed: ${toolName}`,
                            progressBar: { max: 100, value: 60 },
                        });
                        break;
                    }

                    case "text":
                        accumulatedtext += chunk.content || "";
                        break;

                    case "done": {
                        log.info(`Task ${taskId} completed successfully`);
                        const resultText = accumulatedtext || "Task completed successfully";

                        updateTask(taskId, {
                            status: "completed",
                            progress: 100,
                            result: resultText,
                            completedAt: Date.now(),
                            currentStep: undefined,
                        });

                        const { addMessage } = useChatStore.getState();
                        addMessage("user", prompt);
                        addMessage("assistant", resultText);

                        await BackgroundService.updateNotification({
                            taskTitle: "Task Complete",
                            taskDesc: "Tap to view results",
                            progressBar: { max: 100, value: 100 },
                        });
                        break;
                    }

                    case "error":
                        log.error(`Task ${taskId} error: ${chunk.content}`);
                        updateTask(taskId, {
                            status: "failed",
                            error: chunk.content || "Unknown error",
                            currentStep: undefined,
                        });

                        await BackgroundService.updateNotification({
                            taskTitle: "Task Failed",
                            taskDesc: chunk.content || "Unknown error",
                        });
                        break;

                    case "cancelled":
                        updateTask(taskId, { status: "cancelled" });
                        break;
                }
            }
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

    private async waitForConfirmation(taskId: string): Promise<boolean> {
        const { getTask } = useTaskStore.getState();

        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                const task = getTask(taskId);

                if (!task) {
                    clearInterval(checkInterval);
                    resolve(false);
                    return;
                }

                // User approved - task status changed back to "running"
                if (task.status === "running" && !task.pendingConfirmation) {
                    clearInterval(checkInterval);
                    resolve(true);
                    return;
                }

                // User denied - task status changed to "cancelled"
                if (task.status === "cancelled") {
                    clearInterval(checkInterval);
                    resolve(false);
                    return;
                }

                // Task failed or completed for some other reason
                if (task.status === "failed" || task.status === "completed") {
                    clearInterval(checkInterval);
                    resolve(false);
                    return;
                }
            }, 500);

            // Timeout after 5 minutes
            setTimeout(
                () => {
                    clearInterval(checkInterval);
                    log.warn(`Confirmation timeout for task ${taskId}`);
                    useTaskStore.getState().updateTask(taskId, {
                        status: "failed",
                        error: "Confirmation timeout",
                        pendingConfirmation: undefined,
                    });
                    resolve(false);
                },
                5 * 60 * 1000
            );
        });
    }

    private getToolDescription(toolName: string, args: Record<string, unknown>): string {
        switch (toolName) {
            case "send_sms":
                return `Send SMS to ${args.phoneNumber}: "${String(args.message).slice(0, 50)}..."`;
            case "make_phone_call":
                return `Call ${args.phoneNumber}`;
            case "send_whatsapp":
                return `Send WhatsApp to ${args.phoneNumber}: "${String(args.message).slice(0, 50)}..."`;
            default:
                return `Execute ${toolName}`;
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
            // No more tasks, stop the background service
            log.info("No more tasks in queue, stopping background service");
            await BackgroundService.stop();
        }
    }

    async stop(): Promise<void> {
        log.info("Stopping background task service");
        this.agent?.cancel();
        this.agent = null;
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
