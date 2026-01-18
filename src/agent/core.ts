import { generateText, ModelMessage as AIMessage, stepCountIs } from "ai";
import { createModel } from "@/lib/llm";
import { toolRegistry } from "./tools";
import { Message, ToolCall } from "../types/message";
import { logger } from "@/lib/logger";

const SYSTEM_PROMPT = `You are Tangent, a helpful mobile assistant that can interact with the user's Android phone.

You have access to tools that let you:
- Get device information (brand, model, OS)
- Check battery status
- Search contacts by name
- Send SMS messages
- Search indexed local files and documents
- Check file index status
- Search the web for current information, news, and facts
- Find similar web pages to a given URL
- Get full content from web pages

When the user asks for information you can get via tools, USE THE TOOLS. Don't make up information.

For web searches:
- Use web_search for current events, news, facts, or anything you don't know
- Use find_similar to find related content to a URL
- Use get_page_content to read a full web page

For file searches:
- Use search_files to find documents, notes, or any indexed files
- Results include file names, paths, and descriptions
- If the index is empty, tell the user to index files in Settings first

For sending SMS:
1. First search for the contact if the user mentions a name
2. Then use send_sms with the phone number found

Be concise and helpful. If a tool returns data, summarize it naturally for the user.`;

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
                logger.info("Agent", `Tool calls made: ${toolCalls.map(c => c.toolName).join(", ")}`);
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
}
