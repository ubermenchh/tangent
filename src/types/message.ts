export type MessageRole = "user" | "assistant";

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    status: "pending" | "running" | "success" | "error";
}

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    toolCalls?: ToolCall[];
}

export const createMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
