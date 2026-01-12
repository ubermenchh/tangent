import {
    GoogleGenerativeAI,
    Content,
    Part,
    FunctionDeclarationsTool,
    FunctionDeclaration,
    SchemaType,
    GenerateContentResponse,
} from "@google/generative-ai";
import {
    LLMClient,
    LLMConfig,
    LLMMessage,
    LLMResponse,
    ToolDefinition,
    ToolCallRequest,
} from "./types";

interface FunctionCallPart {
    functionCall: {
        name: string;
        args: Record<string, unknown>;
    };
    thoughtSignature?: string;
}

export class GeminiClient implements LLMClient {
    private client: GoogleGenerativeAI;
    private model: string;
    private temperature: number;
    private maxTokens: number;

    constructor(config: LLMConfig) {
        this.client = new GoogleGenerativeAI(config.apiKey);
        this.model = config.model ?? "gemini-3-flash-preview";
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens ?? 2048;
    }

    async chat(
        messages: LLMMessage[],
        tools?: ToolDefinition[],
        systemPrompt?: string
    ): Promise<LLMResponse> {
        const contents = this.convertMessages(messages);
        const geminiTools = tools ? this.convertTools(tools) : undefined;

        if (contents.length === 0) {
            return {
                content: "No message to send.",
                toolCalls: [],
                finishReason: "error",
            };
        }

        const model = this.client.getGenerativeModel({
            model: this.model,
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: this.temperature,
                maxOutputTokens: this.maxTokens,
            },
            tools: geminiTools,
        });

        const result = await model.generateContent({
            contents,
        });

        return this.parseResponse(result.response);
    }

    private convertMessages(messages: LLMMessage[]): Content[] {
        const contents: Content[] = [];

        for (const msg of messages) {
            if (msg.role === "system") continue;

            const parts: Part[] = [];

            if (msg.content) {
                parts.push({ text: msg.content });
            }

            if (msg.role === "tool" && msg.toolCallId) {
                parts.push({
                    functionResponse: {
                        name: msg.toolCallId,
                        response: { result: msg.content },
                    },
                });
            }

            if (msg.toolCalls) {
                for (const call of msg.toolCalls) {
                    const functionCallPart: FunctionCallPart = {
                        functionCall: {
                            name: call.name,
                            args: call.arguments,
                        },
                    };

                    if (call.thoughtSignature) {
                        functionCallPart.thoughtSignature = call.thoughtSignature;
                    }
                    parts.push(functionCallPart);
                }
            }

            if (parts.length > 0) {
                contents.push({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts,
                });
            }
        }
        return contents;
    }

    private convertTools(tools: ToolDefinition[]): FunctionDeclarationsTool[] {
        return [
            {
                functionDeclarations: tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: SchemaType.OBJECT,
                        properties: Object.fromEntries(
                            Object.entries(tool.parameters.properties).map(([key, prop]) => [
                                key,
                                {
                                    type: prop.type.toUpperCase() as SchemaType,
                                    description: prop.description,
                                    ...(prop.enum && { enum: prop.enum }),
                                },
                            ])
                        ),
                        required: tool.parameters.required ? [tool.parameters.required] : undefined,
                    },
                })) as FunctionDeclaration[],
            },
        ];
    }

    private parseResponse(response: GenerateContentResponse): LLMResponse {
        const candidate = response.candidates?.[0];
        const content = candidate?.content;
        const parts = content?.parts ?? [];

        let textContent: string | null = null;
        const toolCalls: ToolCallRequest[] = [];

        for (const part of parts) {
            if (part.text) {
                textContent = (textContent ?? "") + part.text;
            }

            if (part.functionCall) {
                toolCalls.push({
                    id: part.functionCall.name,
                    name: part.functionCall.name,
                    arguments: (part.functionCall.args ?? {}) as Record<string, unknown>,
                    thoughtSignature: (part as FunctionCallPart).thoughtSignature,
                });
            }
        }

        let finishReason: LLMResponse["finishReason"] = "stop";
        if (toolCalls.length > 0) {
            finishReason = "tool_calls";
        } else if (candidate?.finishReason === "MAX_TOKENS") {
            finishReason = "length";
        }

        return {
            content: textContent,
            toolCalls,
            finishReason,
        };
    }
}
