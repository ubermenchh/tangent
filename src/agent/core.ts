import { streamText, generateText, ModelMessage as AIMessage, stepCountIs } from "ai";
import { createModel } from "@/lib/llm";
import { toolRegistry } from "./tools";
import { Message, ToolCall } from "../types/message";
import { logger } from "@/lib/logger";
import { SYSTEM_PROMPT } from "./prompt";

interface AgentConfig {
    apiKey: string;
    model?: string;
}

export class Agent {
    private apiKey: string;
    private modelId: string;

    constructor(config: AgentConfig) {
        this.apiKey = config.apiKey;
        this.modelId = config.model ?? "gemini-3-flash-preview";
    }

    async processMessage(
        userMessage: string,
        conversationHistory: Message[]
    ): Promise<{ content: string; toolCalls: ToolCall[] }> {
        logger.info("Agent", `Processing message: "${userMessage.slice(0, 100)}..."`);
        logger.debug("Agent", `History length: ${conversationHistory.length}`);

        const messages: AIMessage[] = conversationHistory.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));

        messages.push({
            role: "user",
            content: userMessage,
        });

        const model = createModel(this.apiKey, this.modelId);
        const tools = toolRegistry.getTools();

        logger.debug("Agent", `Available tools: ${Object.keys(tools).join(", ")}`);

        try {
            const startTime = Date.now();

            const { text, toolCalls, steps } = await generateText({
                model,
                system: SYSTEM_PROMPT,
                messages,
                tools,
                stopWhen: stepCountIs(5),
            });

            const duration = Date.now() - startTime;
            logger.info("Agent", `Response generated in ${duration}ms`);
            logger.debug("Agent", `Steps taken: ${steps?.length ?? 0}`);

            if (toolCalls.length > 0) {
                logger.info(
                    "Agent",
                    `Tool calls made: ${toolCalls.map(c => c.toolName).join(", ")}`
                );
                toolCalls.forEach(call => {
                    logger.debug("Agent", `Tool: ${call.toolName}`, { args: call.input });
                });
            }

            const executedToolCalls: ToolCall[] = toolCalls.map(call => ({
                id: call.toolCallId,
                name: call.toolName,
                arguments: call.input,
                status: "success",
            }));

            logger.debug("Agent", `Response preview: "${text.slice(0, 200)}..."`);

            return {
                content: text,
                toolCalls: executedToolCalls,
            };
        } catch (error) {
            logger.error("Agent", "Execution error", error);
            return {
                content: "I encountered an error processing your request.",
                toolCalls: [],
            };
        }
    }

    async *processMessageStream(
        userMessage: string,
        conversationHistory: Message[]
    ): AsyncGenerator<{
        type: "text" | "tool-call" | "tool-result" | "reasoning" | "done" | "error";
        content?: string;
        toolCall?: ToolCall;
    }> {
        const messages: AIMessage[] = conversationHistory.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));
        messages.push({ role: "user", content: userMessage });

        const model = createModel(this.apiKey, this.modelId);
        const tools = toolRegistry.getTools();

        try {
            const result = streamText({
                model,
                system: SYSTEM_PROMPT,
                messages,
                tools,
                stopWhen: stepCountIs(5),
            });

            for await (const text of result.textStream) {
                if (text) {
                    yield { type: "text", content: text };
                }
            }

            const toolCalls = await result.toolCalls;
            if (toolCalls && toolCalls.length > 0) {
                for (const tc of toolCalls) {
                    yield {
                        type: "tool-call",
                        toolCall: {
                            id: tc.toolCallId,
                            name: tc.toolName,
                            arguments: tc.input as Record<string, unknown>,
                            status: "success",
                        },
                    };
                }
            }

            yield { type: "done" };
        } catch (error) {
            logger.error("Agent", "Stream error", error);
            yield {
                type: "error",
                content: error instanceof Error ? error.message : "Stream failed",
            };
        }
    }
}
