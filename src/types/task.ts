export type TaskStatus =
    | "queued"
    | "running"
    | "awaiting_confirmation"
    | "failed"
    | "completed"
    | "cancelled";

export interface TaskStep {
    id: string;
    description: string;
    status: "pending" | "running" | "completed" | "failed";
    toolName?: string;
    startedAt?: number;
    completedAt?: number;
    result?: unknown;
    error?: string;
}

export interface ToolCallInfo {
    name: string;
    arguments: Record<string, unknown>;
}

export interface Task {
    id: string;
    prompt: string;

    status: TaskStatus;
    progress: number;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;

    currentStep?: string;
    steps: TaskStep[];

    result?: string;
    error?: string;

    pendingConfirmation?: {
        action: string;
        description: string;
        toolCall: ToolCallInfo;
    };
}

export const createTaskId = (): string => {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
};
