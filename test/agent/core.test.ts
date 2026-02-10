import type { Tool } from "ai";
import type { Message } from "@/types/message";

const mockGenerateText = jest.fn();
const mockStepCountIs = jest.fn((maxSteps: number) => `stop-${maxSteps}`);

jest.mock("ai", () => ({
    generateText: (input: unknown) => mockGenerateText(input),
    stepCountIs: (maxSteps: number) => mockStepCountIs(maxSteps),
}));

const mockCreateModel = jest.fn().mockReturnValue({ id: "mock-model" });

jest.mock("@/lib/llm", () => ({
    createModel: (apiKey: string, modelId?: string) => mockCreateModel(apiKey, modelId),
}));

type ToolEvent = {
    type: "start" | "end";
    toolName: string;
    args: unknown;
    result?: unknown;
};

const mockGetTools = jest.fn();
const mockOnToolEvent = jest.fn();

jest.mock("@/agent/tools", () => ({
    toolRegistry: {
        getTools: (...args: unknown[]) => mockGetTools(...args),
        onToolEvent: (...args: unknown[]) => mockOnToolEvent(...args),
    },
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const { logger: mockLogger } = jest.requireMock("@/lib/logger") as {
    logger: {
        info: jest.Mock;
        debug: jest.Mock;
        warn: jest.Mock;
        error: jest.Mock;
    };
};

import { Agent } from "@/agent/core";

type StreamChunk = {
    type: "text" | "tool-call" | "tool-call-end" | "thinking" | "reasoning" | "done" | "error" | "cancelled";
    content?: string;
    toolCall?: unknown;
};

async function collectStream(
    stream: AsyncGenerator<StreamChunk>
): Promise<StreamChunk[]> {
    const chunks: StreamChunk[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
        if (chunk.type === "done" || chunk.type === "error" || chunk.type === "cancelled") {
            break;
        }
    }
    return chunks;
}

describe("Agent", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTools.mockResolvedValue({});
        mockOnToolEvent.mockImplementation(() => jest.fn());
    });

    test("processMessage uses scoped tools and maps tool calls", async () => {
        const scopedTools = { scoped_tool: {} } as unknown as Record<string, Tool>;

        mockGenerateText.mockResolvedValue({
            text: "Done.",
            toolCalls: [
                {
                    toolCallId: "tc_1",
                    toolName: "open_app",
                    input: { app: "Maps" },
                },
            ],
            steps: [{ id: "s1" }],
        });

        const history: Message[] = [
            {
                id: "m1",
                role: "assistant",
                content: "How can I help?",
                timestamp: 1,
            },
        ];

        const agent = new Agent({
            apiKey: "k1",
            tools: scopedTools,
            systemPrompt: "Scoped prompt",
            maxSteps: 9,
        });

        const result = await agent.processMessage("Open maps", history, { maxSteps: 3 });

        expect(mockCreateModel).toHaveBeenCalledWith("k1", "gemini-3-pro-preview");
        expect(mockGetTools).not.toHaveBeenCalled();
        expect(mockStepCountIs).toHaveBeenCalledWith(3);

        expect(mockGenerateText).toHaveBeenCalledWith(
            expect.objectContaining({
                system: "Scoped prompt",
                tools: scopedTools,
                stopWhen: "stop-3",
            })
        );

        const calledMessages = mockGenerateText.mock.calls[0][0].messages;
        expect(calledMessages).toEqual([
            { role: "assistant", content: "How can I help?" },
            { role: "user", content: "Open maps" },
        ]);

        expect(result).toEqual({
            content: "Done.",
            toolCalls: [
                {
                    id: "tc_1",
                    name: "open_app",
                    arguments: { app: "Maps" },
                    status: "success",
                },
            ],
        });
    });

    test("processMessage returns fallback response on failure", async () => {
        mockGenerateText.mockRejectedValueOnce(new Error("LLM failed"));

        const agent = new Agent({ apiKey: "k2" });
        const result = await agent.processMessage("hello", []);

        expect(mockGetTools).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            content: "I encountered an error processing your request.",
            toolCalls: [],
        });
        expect(mockLogger.error).toHaveBeenCalled();
    });

    test("processMessageStream returns thinking, reasoning, text, done when streaming=false", async () => {
        mockGenerateText.mockResolvedValue({
            text: "final",
            reasoningText: "reasoned",
            toolCalls: [],
            steps: [],
        });

        const agent = new Agent({ apiKey: "k3" });
        const chunks = await collectStream(
            agent.processMessageStream("Explain", [], { streaming: false, maxSteps: 4 })
        );

        expect(chunks.map(c => c.type)).toEqual(["thinking", "reasoning", "text", "done"]);
        expect(chunks[1].content).toBe("reasoned");
        expect(chunks[2].content).toBe("final");

        expect(mockStepCountIs).toHaveBeenCalledWith(4);
        expect(mockGenerateText).toHaveBeenCalledWith(
            expect.objectContaining({
                providerOptions: {
                    google: {
                        thinkingConfig: {
                            includeThoughts: true,
                            thinkingLevel: "high",
                        },
                    },
                },
            })
        );
    });

    test("processMessageStream emits tool-call lifecycle events", async () => {
        let listener: ((event: ToolEvent) => void) | undefined;

        mockOnToolEvent.mockImplementation((cb: (event: ToolEvent) => void) => {
            listener = cb;
            return jest.fn();
        });

        let resolveGenerateText: ((value: unknown) => void) | undefined;
        const pending = new Promise(resolve => {
            resolveGenerateText = resolve;
        });
        mockGenerateText.mockReturnValue(pending);

        const agent = new Agent({ apiKey: "k4" });
        const streamPromise = collectStream(
            agent.processMessageStream("Do something", [], { streaming: false })
        );

        for (let i = 0; i < 5 && !listener; i++) {
            await Promise.resolve();
        }
        if (!listener || !resolveGenerateText) {
            throw new Error("Listener or resolver not initialized");
        }

        listener({ type: "start", toolName: "tap", args: { text: "Continue" } });
        listener({
            type: "end",
            toolName: "tap",
            args: { text: "Continue" },
            result: { ok: true },
        });

        resolveGenerateText({
            text: "All done",
            reasoningText: "",
            toolCalls: [],
            steps: [],
        });

        const chunks = await streamPromise;
        expect(chunks.map(c => c.type)).toEqual(
            expect.arrayContaining(["tool-call", "tool-call-end", "text", "done"])
        );

        const endChunk = chunks.find(c => c.type === "tool-call-end");
        expect(endChunk?.toolCall).toMatchObject({
            name: "tap",
            status: "success",
            result: { ok: true },
        });
    });

    test("cancel() during stream emits cancelled before generation", async () => {
        const agent = new Agent({ apiKey: "k5" });

        const stream = agent.processMessageStream("Cancel this", [], { streaming: false });

        const first = await stream.next();
        expect(first.value).toMatchObject({ type: "thinking" });

        agent.cancel();

        const second = await stream.next();
        expect(second.value).toMatchObject({ type: "cancelled" });
        expect(mockGenerateText).not.toHaveBeenCalled();
    });

    test("processMessageStream emits error chunk on generation error", async () => {
        mockGenerateText.mockRejectedValueOnce(new Error("stream exploded"));

        const agent = new Agent({ apiKey: "k6" });
        const chunks = await collectStream(
            agent.processMessageStream("hello", [], { streaming: false })
        );

        expect(chunks.map(c => c.type)).toEqual(["thinking", "error"]);
        expect(chunks[1].content).toBe("stream exploded");
    });
});