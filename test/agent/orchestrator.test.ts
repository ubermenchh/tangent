import type { Skill } from "@/skills/types";

const mockProcessMessage = jest.fn();
const mockCancel = jest.fn();

jest.mock("../../src/agent/core", () => ({
    Agent: jest.fn(),
}));

jest.mock("@/skills", () => ({
    initializeSkills: jest.fn(),
    skillRegistry: {
        buildScopedConfig: jest.fn(),
        composeConfig: jest.fn(),
        resolveTools: jest.fn(),
    },
}));

jest.mock("@/lib/llm", () => ({
    createModel: jest.fn(() => ({ id: "mock-model" })),
}));

jest.mock("ai", () => ({
    generateText: jest.fn(),
}));

import { AgentOrchestrator } from "@/agent/orchestrator";

const { Agent: MockAgent } = jest.requireMock("../../src/agent/core") as {
    Agent: jest.Mock;
};

const { skillRegistry: mockSkillRegistry } = jest.requireMock("@/skills") as {
    skillRegistry: {
        buildScopedConfig: jest.Mock;
        composeConfig: jest.Mock;
        resolveTools: jest.Mock;
    };
};

const { generateText: mockGenerateText } = jest.requireMock("ai") as {
    generateText: jest.Mock;
};

function makeSkill(id: string, overrides: Partial<Skill> = {}): Skill {
    return {
        id,
        name: id,
        description: `${id} description`,
        promptFragment: `${id} prompt fragment`,
        ...overrides,
    };
}

const baseScopedConfig = {
    systemPrompt: "scoped prompt",
    toolNames: ["web_search"],
    maxSteps: 7,
    model: undefined as string | undefined,
    needsAccessibility: false,
    needsBackground: false,
    sensitiveActions: new Set<string>(),
};

describe("AgentOrchestrator", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        MockAgent.mockImplementation(() => ({
            processMessage: mockProcessMessage,
            cancel: mockCancel,
        }));

        mockProcessMessage.mockResolvedValue({
            content: "ok",
            toolCalls: [],
        });

        mockSkillRegistry.composeConfig.mockResolvedValue(baseScopedConfig);
        mockSkillRegistry.resolveTools.mockResolvedValue({});
    });

    test("runs scoped agent for a single matched skill", async () => {
        const whatsapp = makeSkill("whatsapp", {
            needsAccessibility: true,
            maxSteps: 20,
        });

        mockSkillRegistry.buildScopedConfig.mockResolvedValue({
            config: {
                ...baseScopedConfig,
                model: "gemini-2.5-flash",
                maxSteps: 20,
            },
            tools: { tap: { description: "tap" } },
            matchedSkills: [whatsapp],
        });

        const orchestrator = new AgentOrchestrator({ apiKey: "k2", model: "gemini-3-pro-preview" });

        const result = await orchestrator.execute("open whatsapp", [], { maxSteps: 12 });

        expect(MockAgent).toHaveBeenCalledWith({
            apiKey: "k2",
            model: "gemini-2.5-flash",
            tools: { tap: { description: "tap" } },
            systemPrompt: "scoped prompt",
            maxSteps: 20,
        });

        expect(mockProcessMessage).toHaveBeenCalledWith("open whatsapp", [], { maxSteps: 12 });
        expect(result.parallel).toBe(false);
        expect(result.subResults).toHaveLength(1);
        expect(result.subResults[0].subtaskId).toBe("scoped");
        expect(result.subResults[0].skillIds).toEqual(["whatsapp"]);
    });

    test("falls back to scoped agent when planner returns invalid JSON", async () => {
        const s1 = makeSkill("shopping");
        const s2 = makeSkill("productivity");

        mockSkillRegistry.buildScopedConfig.mockResolvedValue({
            config: baseScopedConfig,
            tools: {},
            matchedSkills: [s1, s2],
        });

        mockGenerateText.mockResolvedValue({
            text: "not valid json",
        });

        const orchestrator = new AgentOrchestrator({ apiKey: "k3" });
        const result = await orchestrator.execute("buy milk and set reminder", []);

        expect(mockGenerateText).toHaveBeenCalledTimes(1); // planner only
        expect(result.parallel).toBe(false);
        expect(result.subResults).toHaveLength(1);
        expect(result.subResults[0].subtaskId).toBe("scoped");
    });

    test("executes planned subtasks and synthesizes combined response", async () => {
        const s1 = makeSkill("shopping", { needsAccessibility: false });
        const s2 = makeSkill("web", { needsAccessibility: false });

        mockSkillRegistry.buildScopedConfig.mockResolvedValue({
            config: baseScopedConfig,
            tools: {},
            matchedSkills: [s1, s2],
        });

        mockGenerateText
            // planner
            .mockResolvedValueOnce({
                text: JSON.stringify([
                    { description: "Find product price", skillIds: ["shopping"] },
                    { description: "Find reviews", skillIds: ["web"] },
                ]),
            })
            // synthesizer
            .mockResolvedValueOnce({
                text: "Combined answer from both subtasks",
            });

        mockProcessMessage
            .mockResolvedValueOnce({ content: "Price is 100", toolCalls: [] })
            .mockResolvedValueOnce({ content: "Reviews are positive", toolCalls: [] });

        const orchestrator = new AgentOrchestrator({ apiKey: "k4", maxConcurrency: 2 });

        const result = await orchestrator.execute("price and reviews", []);

        expect(mockGenerateText).toHaveBeenCalledTimes(2);
        expect(result.parallel).toBe(true);
        expect(result.content).toBe("Combined answer from both subtasks");
        expect(result.subResults).toHaveLength(2);
        expect(result.subResults.every(r => r.status === "completed")).toBe(true);
    });

    test("cancel() aborts all active agents", async () => {
        let resolvePending: ((value: { content: string; toolCalls: [] }) => void) | undefined;

        const pending = new Promise<{ content: string; toolCalls: [] }>(resolve => {
            resolvePending = resolve as (value: { content: string; toolCalls: [] }) => void;
        });

        mockSkillRegistry.buildScopedConfig.mockResolvedValue(null);
        mockProcessMessage.mockReturnValueOnce(pending);

        const orchestrator = new AgentOrchestrator({ apiKey: "k5" });
        const runPromise = orchestrator.execute("long running task", []);

        await Promise.resolve(); // allow execute() to enqueue agent
        orchestrator.cancel();

        expect(mockCancel).toHaveBeenCalledTimes(1);

        if (!resolvePending) {
            throw new Error("resolvePending not initialized");
        }
        resolvePending({ content: "done", toolCalls: [] });
        await runPromise;
    });
});
