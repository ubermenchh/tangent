export type MessageRole = "user" | "assistant";
export type MessageStatus = "pending" | "streaming" | "complete" | "error" | "thinking";

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
    status?: MessageStatus;
    toolCalls?: ToolCall[];
    reasoning?: string;
}

export const createMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
