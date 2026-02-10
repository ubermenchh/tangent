import { useChatStore } from "@/stores/chatStore";

describe("useChatStore", () => {
    let randomSpy: jest.SpiedFunction<typeof Math.random>;

    beforeEach(() => {
        useChatStore.setState({ messages: [], activeStreams: new Set() });
        jest.spyOn(Date, "now").mockReturnValue(1000);
        randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456789);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("addMessage appends a message and returns id", () => {
        const { addMessage } = useChatStore.getState();

        const id = addMessage("user", "hello");

        const state = useChatStore.getState();
        expect(id).toMatch(/^msg_/);
        expect(state.messages).toHaveLength(1);
        expect(state.messages[0]).toMatchObject({
            id,
            role: "user",
            content: "hello",
            timestamp: 1000,
        });
    });

    test("addMessage merges optional fields", () => {
        const { addMessage } = useChatStore.getState();

        const id = addMessage("assistant", "processing", {
            status: "thinking",
            reasoning: "step 1",
            toolCalls: [],
        });

        const msg = useChatStore.getState().messages.find(m => m.id === id);
        expect(msg).toMatchObject({
            id,
            role: "assistant",
            content: "processing",
            status: "thinking",
            reasoning: "step 1",
            toolCalls: [],
        });
    });

    test("updateMessage updates only the target message", () => {
        const { addMessage, updateMessage } = useChatStore.getState();

        randomSpy.mockReset();
        randomSpy.mockReturnValueOnce(0.111111111).mockReturnValueOnce(0.222222222);

        const id1 = addMessage("user", "first");
        const id2 = addMessage("assistant", "second");

        expect(id1).not.toBe(id2);

        updateMessage(id2, { status: "complete", content: "updated" });

        const messages = useChatStore.getState().messages;
        expect(messages.find(m => m.id === id1)?.content).toBe("first");
        expect(messages.find(m => m.id === id2)).toMatchObject({
            content: "updated",
            status: "complete",
        });
    });

    test("appendToMessage concatenates content", () => {
        const { addMessage, appendToMessage } = useChatStore.getState();
        const id = addMessage("assistant", "Hel");

        appendToMessage(id, "lo");
        appendToMessage(id, " world");

        const msg = useChatStore.getState().messages.find(m => m.id === id);
        expect(msg?.content).toBe("Hello world");
    });

    test("appendToReasoning builds reasoning string", () => {
        const { addMessage, appendToReasoning } = useChatStore.getState();
        const id = addMessage("assistant", "answer");

        appendToReasoning(id, "Think");
        appendToReasoning(id, "ing...");

        const msg = useChatStore.getState().messages.find(m => m.id === id);
        expect(msg?.reasoning).toBe("Thinking...");
    });

    test("clearMessages empties messages", () => {
        const { addMessage, clearMessages } = useChatStore.getState();

        addMessage("user", "a");
        addMessage("assistant", "b");
        expect(useChatStore.getState().messages).toHaveLength(2);

        clearMessages();
        expect(useChatStore.getState().messages).toHaveLength(0);
    });

    test("addStream/removeStream drive isStreaming state", () => {
        const { addStream, removeStream, isStreaming } = useChatStore.getState();

        expect(isStreaming()).toBe(false);

        addStream("m1");
        expect(isStreaming()).toBe(true);

        // Set semantics: duplicate add should not duplicate size
        addStream("m1");
        expect(useChatStore.getState().activeStreams.size).toBe(1);

        addStream("m2");
        expect(useChatStore.getState().activeStreams.size).toBe(2);

        removeStream("m1");
        expect(isStreaming()).toBe(true);

        removeStream("m2");
        expect(isStreaming()).toBe(false);
    });

    test("operations on unknown id do not crash or mutate unrelated messages", () => {
        const { addMessage, updateMessage, appendToMessage, appendToReasoning } =
            useChatStore.getState();

        const id = addMessage("assistant", "stable");

        updateMessage("missing", { content: "nope" });
        appendToMessage("missing", "x");
        appendToReasoning("missing", "y");

        const msg = useChatStore.getState().messages.find(m => m.id === id);
        expect(msg).toMatchObject({
            id,
            content: "stable",
        });
        expect(msg?.reasoning).toBeUndefined();
    });
});
