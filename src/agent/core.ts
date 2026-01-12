import { createLLMClient, LLMClient, LLMMessage } from "@/lib/llm";
import { toolRegistry } from "./tools";
import { Message, ToolCall } from "../types/message";

const SYSTEM_PROMPT = `You are Tangent, a helpful mobile assistant that can interact with the user's Android phone.

You have access to tools that let you:
- Get device information (brand, model, OS)
- Check battery status

When the user asks for information you can get via tools, USE THE TOOLS. Don't make up information.

Be concise and helpful. If a tool returns data, summarize it naturally for the user.`;

interface AgentConfig {
    apiKey: string;
    model?: string;
}

export class Agent {
    private llm: LLMClient;

    constructor(config: AgentConfig) {
        this.llm = createLLMClient("gemini", {
            apiKey: config.apiKey,
            model: config.model ?? "gemini-3-flash-preview",
        });
    }

    async processMessage(
        userMessage: string,
        conversationHistory: Message[]
    ): Promise<{ content: string; toolCalls: ToolCall[] }> {
        const llmMessages = this.convertToLLMMessage(conversationHistory);
        llmMessages.push({ role: "user", content: userMessage });
        const tools = toolRegistry.getDefinitions();

        let response = await this.llm.chat(llmMessages, tools, SYSTEM_PROMPT);
        const executedToolCalls: ToolCall[] = [];

        while (response.finishReason === "tool_calls" && response.toolCalls.length > 0) {
            for (const call of response.toolCalls) {
                const toolCall: ToolCall = {
                    id: call.id,
                    name: call.name,
                    arguments: call.arguments,
                    status: "running",
                };
                executedToolCalls.push(toolCall);

                try {
                    const result = await toolRegistry.execute(call.name, call.arguments);
                    toolCall.result = result;
                    toolCall.status = "success";

                    llmMessages.push({
                        role: "assistant",
                        content: "",
                        toolCalls: [
                            {
                                id: call.id,
                                name: call.name,
                                arguments: call.arguments,
                                thoughtSignature: call.thoughtSignature,
                            },
                        ],
                    });
                    llmMessages.push({
                        role: "tool",
                        content: JSON.stringify(result),
                        toolCallId: call.name,
                    });
                } catch (error) {
                    toolCall.result = { error: String(error) };
                    toolCall.status = "error";

                    llmMessages.push({
                        role: "assistant",
                        content: "",
                        toolCalls: [{ id: call.id, name: call.name, arguments: call.arguments }],
                    });
                    llmMessages.push({
                        role: "tool",
                        content: JSON.stringify({ error: String(error) }),
                        toolCallId: call.name,
                    });
                }
            }
            response = await this.llm.chat(llmMessages, tools, SYSTEM_PROMPT);
        }
        return {
            content: response.content ?? "I encountered an issue processing your request.",
            toolCalls: executedToolCalls,
        };
    }

    private convertToLLMMessage(messages: Message[]): LLMMessage[] {
        return messages.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));
    }
}
