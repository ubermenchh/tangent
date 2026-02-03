import { generateText, ModelMessage as AIMessage, stepCountIs } from "ai";
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
    private abortController: AbortController | null = null;

    constructor(config: AgentConfig) {
        this.apiKey = config.apiKey;
        this.modelId = config.model ?? "gemini-3-pro-preview";
    }

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
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
        const tools = await toolRegistry.getTools();

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
        type: "text" | "tool-call" | "thinking" | "reasoning" | "done" | "error" | "cancelled";
        content?: string;
        toolCall?: ToolCall;
    }> {
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        if (signal.aborted) {
            yield { type: "cancelled", content: "Cancelled before start" };
            return;
        }

        yield { type: "thinking", content: "Processing your request..." };

        const messages: AIMessage[] = conversationHistory.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));
        messages.push({ role: "user", content: userMessage });

        const model = createModel(this.apiKey, this.modelId);
        const tools = await toolRegistry.getTools();

        if (signal.aborted) {
            yield { type: "cancelled", content: "Cancelled" };
            return;
        }

        try {
            logger.info("Agent", `Processing: "${userMessage.slice(0, 50)}..."`);
            const startTime = Date.now();

            const { text, toolCalls, steps, reasoningText } = await generateText({
                model,
                system: SYSTEM_PROMPT,
                messages,
                tools,
                stopWhen: stepCountIs(5),
                providerOptions: {
                    google: {
                        thinkingConfig: {
                            includeThoughts: true,
                            thinkingLevel: "high",
                        },
                    },
                },
            });

            const duration = Date.now() - startTime;
            logger.info("Agent", `Response in ${duration}ms, ${steps?.length ?? 0} steps`);

            if (signal.aborted) {
                yield { type: "cancelled", content: "Cancelled" };
                return;
            }

            if (reasoningText) {
                const chunkSize = 8;
                for (let i = 0; i < reasoningText.length; i += chunkSize) {
                    if (signal.aborted) {
                        yield { type: "cancelled", content: "Cancelled" };
                        return;
                    }
                    const chunk = reasoningText.slice(i, i + chunkSize);
                    yield { type: "reasoning", content: chunk };
                    await new Promise(r => setTimeout(r, 2));
                }
            }

            if (toolCalls.length > 0) {
                for (const tc of toolCalls) {
                    if (signal.aborted) {
                        yield { type: "cancelled", content: "Cancelled" };
                        return;
                    }

                    yield {
                        type: "tool-call",
                        toolCall: {
                            id: tc.toolCallId,
                            name: tc.toolName,
                            arguments: tc.input as Record<string, unknown>,
                            status: "success",
                        },
                    };

                    await new Promise(r => setTimeout(r, 100));
                }
            }

            if (text) {
                const chunkSize = 8;
                for (let i = 0; i < text.length; i += chunkSize) {
                    if (signal.aborted) {
                        yield { type: "cancelled", content: "Cancelled" };
                        return;
                    }

                    const chunk = text.slice(i, i + chunkSize);
                    yield { type: "text", content: chunk };
                    await new Promise(r => setTimeout(r, 5));
                }
            }

            yield { type: "done" };
        } catch (error) {
            if (signal.aborted) {
                yield { type: "cancelled", content: "Cancelled" };
                return;
            }

            if (error === undefined || error === null) {
                yield { type: "error", content: "Unknown error occurred" };
                return;
            }

            if (
                error instanceof Error &&
                (error.name === "AbortError" ||
                    error.message.includes("abort") ||
                    error.message.includes("cancel"))
            ) {
                yield { type: "cancelled", content: "Cancelled" };
                return;
            }

            logger.error("Agent", "Stream error", error);
            yield {
                type: "error",
                content: error instanceof Error ? error.message : "Stream failed",
            };
        } finally {
            this.abortController = null;
        }
    }
}
