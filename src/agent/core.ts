import { generateText, ModelMessage as AIMessage, stepCountIs, Tool } from "ai";
import { createModel } from "@/lib/llm";
import { toolRegistry } from "./tools";
import { Message, ToolCall } from "../types/message";
import { logger } from "@/lib/logger";
import { SYSTEM_PROMPT } from "./prompt";
import { createAsyncChannel } from "@/lib/asyncChannel";

interface AgentConfig {
    apiKey: string;
    model?: string;
    tools?: Record<string, Tool>;
    systemPrompt?: string;
    maxSteps?: number;
}

export class Agent {
    private apiKey: string;
    private modelId: string;
    private scopedTools: Record<string, Tool> | null;
    private scopedPrompt: string;
    private defaultMaxSteps: number;
    private abortController: AbortController | null = null;

    constructor(config: AgentConfig) {
        this.apiKey = config.apiKey;
        this.modelId = config.model ?? "gemini-3-pro-preview";
        this.scopedTools = config.tools ?? null;
        this.scopedPrompt = config.systemPrompt ?? SYSTEM_PROMPT;
        this.defaultMaxSteps = config.maxSteps ?? 5;
    }

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private async getTools(): Promise<Record<string, Tool>> {
        if (this.scopedTools) return this.scopedTools;
        return toolRegistry.getTools();
    }

    async processMessage(
        userMessage: string,
        conversationHistory: Message[],
        options?: { maxSteps?: number }
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
        const tools = await this.getTools();

        logger.debug("Agent", `Available tools: ${Object.keys(tools).join(", ")}`);

        try {
            const startTime = Date.now();

            const { text, toolCalls, steps } = await generateText({
                model,
                system: this.scopedPrompt,
                messages,
                tools,
                stopWhen: stepCountIs(options?.maxSteps ?? this.defaultMaxSteps),
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
        conversationHistory: Message[],
        options?: { streaming?: boolean; maxSteps?: number }
    ): AsyncGenerator<{
        type:
            | "text"
            | "tool-call"
            | "tool-call-end"
            | "thinking"
            | "reasoning"
            | "done"
            | "error"
            | "cancelled";
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
        const tools = await this.getTools();

        if (signal.aborted) {
            yield { type: "cancelled", content: "Cancelled" };
            return;
        }

        type StreamChunk = {
            type:
                | "text"
                | "tool-call"
                | "tool-call-end"
                | "thinking"
                | "reasoning"
                | "done"
                | "error"
                | "cancelled";
            content?: string;
            toolCall?: ToolCall;
        };
        const channel = createAsyncChannel<StreamChunk>();

        const runningTools = new Map<string, ToolCall>();

        const unsubscribe = toolRegistry.onToolEvent(event => {
            if (signal.aborted) return;

            if (event.type === "start") {
                const toolCall: ToolCall = {
                    id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    name: event.toolName,
                    arguments: event.args as Record<string, unknown>,
                    status: "running",
                };
                runningTools.set(event.toolName, toolCall);
                logger.debug("Agent", `Tool started: ${event.toolName}`);
                channel.push({ type: "tool-call", toolCall });
            } else if (event.type === "end") {
                const toolCall = runningTools.get(event.toolName);
                if (toolCall) {
                    toolCall.status = "success";
                    toolCall.result = event.result;
                    logger.debug("Agent", `Tool completed: ${event.toolName}`);
                    channel.push({ type: "tool-call-end", toolCall });
                    runningTools.delete(event.toolName);
                }
            }
        });

        const generatePromise = (async () => {
            try {
                logger.info("Agent", `Processing: "${userMessage.slice(0, 50)}..."`);
                const startTime = Date.now();

                const { text, steps, reasoningText } = await generateText({
                    model,
                    system: this.scopedPrompt,
                    messages,
                    tools,
                    stopWhen: stepCountIs(options?.maxSteps ?? this.defaultMaxSteps),
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
                    channel.push({ type: "cancelled", content: "Cancelled" });
                    return;
                }

                if (reasoningText) {
                    if (options?.streaming === false) {
                        channel.push({ type: "reasoning", content: reasoningText });
                    } else {
                        const chunkSize = 8;
                        for (let i = 0; i < reasoningText.length; i += chunkSize) {
                            if (signal.aborted) {
                                channel.push({ type: "cancelled", content: "Cancelled" });
                                return;
                            }
                            const chunk = reasoningText.slice(i, i + chunkSize);
                            channel.push({ type: "reasoning", content: chunk });
                            await new Promise(r => setTimeout(r, 2));
                        }
                    }
                }

                if (text) {
                    if (options?.streaming === false) {
                        channel.push({ type: "text", content: text });
                    } else {
                        const chunkSize = 8;
                        for (let i = 0; i < text.length; i += chunkSize) {
                            if (signal.aborted) {
                                channel.push({ type: "cancelled", content: "Cancelled" });
                                return;
                            }
                            const chunk = text.slice(i, i + chunkSize);
                            channel.push({ type: "text", content: chunk });
                            await new Promise(r => setTimeout(r, 5));
                        }
                    }
                }

                channel.push({ type: "done" });
            } catch (error) {
                if (signal.aborted) {
                    channel.push({ type: "cancelled", content: "Cancelled" });
                    return;
                }

                if (error === undefined || error === null) {
                    channel.push({ type: "error", content: "Unknown error occurred" });
                    return;
                }

                if (
                    error instanceof Error &&
                    (error.name === "AbortError" ||
                        error.message.includes("abort") ||
                        error.message.includes("cancel"))
                ) {
                    channel.push({ type: "cancelled", content: "Cancelled" });
                    return;
                }

                logger.error("Agent", "Stream error", error);
                channel.push({
                    type: "error",
                    content: error instanceof Error ? error.message : "Stream failed",
                });
            } finally {
                unsubscribe();
                channel.close();
            }
        })();

        try {
            for await (const chunk of channel) {
                if (signal.aborted && chunk.type !== "cancelled") {
                    yield { type: "cancelled", content: "Cancelled" };
                    break;
                }
                yield chunk;

                if (chunk.type === "done" || chunk.type === "error" || chunk.type === "cancelled") {
                    break;
                }
            }
        } finally {
            this.abortController = null;
            await generatePromise.catch(() => {});
        }
    }
}
