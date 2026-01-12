export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<
            string,
            {
                type: string;
                description: string;
                enum?: string[];
            }
        >;
        required?: string[];
    };
}

export interface ToolCallRequest {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    thoughtSignature?: string;
}

export type Role = "user" | "assistant" | "system" | "tool";

export interface LLMMessage {
    role: Role;
    content: string;
    toolCalls?: ToolCallRequest[];
    toolCallId?: string;
}

export interface LLMResponse {
    content: string | null;
    toolCalls: ToolCallRequest[];
    finishReason: "stop" | "tool_calls" | "length" | "error";
}

export interface LLMConfig {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LLMClient {
    chat(
        messages: LLMMessage[],
        tools?: ToolDefinition[],
        systemPrompt?: string
    ): Promise<LLMResponse>;
}
