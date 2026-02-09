import { Agent } from "./core";
import { skillRegistry, initializeSkills } from "@/skills";
import { Skill, ScopedAgentConfig } from "@/skills/types";
import { Message, ToolCall } from "@/types/message";
import { logger } from "@/lib/logger";
import { createModel } from "@/lib/llm";
import { generateText } from "ai";

const log = logger.create("Orchestrator");

interface SubTask {
    id: string;
    description: string;
    skills: Skill[];
    prompt: string;
}

interface SubAgentResult {
    subtaskId: string;
    skillIds: string[];
    content: string;
    toolCalls: ToolCall[];
    status: "completed" | "failed" | "cancelled";
    error?: string;
    durationMs: number;
}

export interface OrchestratorResult {
    content: string;
    toolCalls: ToolCall[];
    subResults: SubAgentResult[];
    parallel: boolean;
}

interface OrchestratorConfig {
    apiKey: string;
    model?: string;
    maxConcurrency?: number;
}

export class AgentOrchestrator {
    private apiKey: string;
    private modelId: string;
    private maxConcurrency: number;
    private activeAgents: Set<Agent> = new Set();
    private aborted = false;

    constructor(config: OrchestratorConfig) {
        this.apiKey = config.apiKey;
        this.modelId = config.model ?? "gemini-3-pro-preview";
        this.maxConcurrency = config.maxConcurrency ?? 3;
    }

    cancel(): void {
        this.aborted = true;
        for (const agent of this.activeAgents) {
            agent.cancel();
        }
        this.activeAgents.clear();
    }

    async execute(
        prompt: string,
        conversationHistory: Message[],
        options?: { maxSteps?: number; streaming?: boolean }
    ): Promise<OrchestratorResult> {
        initializeSkills();

        const scoped = await skillRegistry.buildScopedConfig(prompt);

        if (!scoped) {
            log.info("No skills matched, running default agent");
            return this.runDefaultAgent(prompt, conversationHistory, options);
        }

        const { config, tools, matchedSkills } = scoped;

        log.info(`Matched skills: ${matchedSkills.map(s => s.id).join(", ")}`);

        const nonAccessibilitySkills = matchedSkills.filter(s => !s.needsAccessibility);

        if (matchedSkills.length === 1 || nonAccessibilitySkills.length === 0) {
            log.info("Running single scoped agent");
            return this.runScopedAgent(
                prompt,
                conversationHistory,
                config,
                tools,
                matchedSkills,
                options
            );
        }

        const subtasks = await this.planSubtasks(prompt, matchedSkills);

        if (subtasks.length <= 1) {
            log.info("Planner returned single task, running scoped agent");
            return this.runScopedAgent(
                prompt,
                conversationHistory,
                config,
                tools,
                matchedSkills,
                options
            );
        }

        log.info(`Executing ${subtasks.length} subtasks in parallel`);
        return this.runParallel(subtasks, conversationHistory, prompt, options);
    }

    private async runDefaultAgent(
        prompt: string,
        conversationHistory: Message[],
        options?: { maxSteps?: number }
    ): Promise<OrchestratorResult> {
        const agent = new Agent({ apiKey: this.apiKey, model: this.modelId });
        this.activeAgents.add(agent);
        const start = Date.now();

        try {
            const result = await agent.processMessage(prompt, conversationHistory, options);
            return {
                content: result.content,
                toolCalls: result.toolCalls,
                subResults: [],
                parallel: false,
            };
        } catch (error) {
            log.error("Default agent failed", error);
            return {
                content: "I encountered an error processing your request.",
                toolCalls: [],
                subResults: [
                    {
                        subtaskId: "default",
                        skillIds: [],
                        content: "",
                        toolCalls: [],
                        status: "failed",
                        error: error instanceof Error ? error.message : String(error),
                        durationMs: Date.now() - start,
                    },
                ],
                parallel: false,
            };
        } finally {
            this.activeAgents.delete(agent);
        }
    }

    private async runScopedAgent(
        prompt: string,
        conversationHistory: Message[],
        config: ScopedAgentConfig,
        tools: Record<string, unknown>,
        skills: Skill[],
        options?: { maxSteps?: number }
    ): Promise<OrchestratorResult> {
        const agent = new Agent({
            apiKey: this.apiKey,
            model: config.model ?? this.modelId,
            tools: tools as Record<string, import("ai").Tool>,
            systemPrompt: config.systemPrompt,
            maxSteps: config.maxSteps,
        });
        this.activeAgents.add(agent);

        const start = Date.now();

        try {
            const result = await agent.processMessage(prompt, conversationHistory, {
                maxSteps: options?.maxSteps ?? config.maxSteps,
            });

            return {
                content: result.content,
                toolCalls: result.toolCalls,
                subResults: [
                    {
                        subtaskId: "scoped",
                        skillIds: skills.map(s => s.id),
                        content: result.content,
                        toolCalls: result.toolCalls,
                        status: "completed",
                        durationMs: Date.now() - start,
                    },
                ],
                parallel: false,
            };
        } catch (error) {
            log.error("Scoped agent failed", error);
            return {
                content: "I encountered an error processing your request.",
                toolCalls: [],
                subResults: [
                    {
                        subtaskId: "scoped",
                        skillIds: skills.map(s => s.id),
                        content: "",
                        toolCalls: [],
                        status: "failed",
                        error: error instanceof Error ? error.message : String(error),
                        durationMs: Date.now() - start,
                    },
                ],
                parallel: false,
            };
        } finally {
            this.activeAgents.delete(agent);
        }
    }

    private async planSubtasks(prompt: string, skills: Skill[]): Promise<SubTask[]> {
        const skillList = skills.map(s => `- ${s.id}: ${s.description}`).join("\n");

        const plannerPrompt = `You are a task planner. Given a user request and available skills, decompose the request into independent subtasks that can run in parallel.

Available skills:
${skillList}

Rules:
- Only create multiple subtasks if the request genuinely has independent parts
- Each subtask must map to one or more skills
- If the request is a single coherent task, return exactly one subtask
- Return JSON array of objects with "description" and "skillIds" fields

User request: "${prompt}"

Return ONLY the JSON array, no other text.`;

        try {
            const model = createModel(this.apiKey, "gemini-3-flash-preview");

            const { text } = await generateText({
                model,
                prompt: plannerPrompt,
            });

            const cleaned = text
                .replace(/```json\n?/g, "")
                .replace(/```/g, "")
                .trim();
            const parsed = JSON.parse(cleaned) as Array<{
                description: string;
                skillIds: string[];
            }>;

            if (!Array.isArray(parsed) || parsed.length === 0) {
                log.warn("Planner returned empty or invalid response");
                return [];
            }

            return parsed.map((item, i) => ({
                id: `subtask_${i}`,
                description: item.description,
                skills: item.skillIds
                    .map(id => skills.find(s => s.id === id))
                    .filter((s): s is Skill => s !== undefined),
                prompt: item.description,
            }));
        } catch (error) {
            log.error("Task planning failed", error);
            return [];
        }
    }

    private async runParallel(
        subtasks: SubTask[],
        conversationHistory: Message[],
        originalPrompt: string,
        options?: { maxSteps?: number }
    ): Promise<OrchestratorResult> {
        const accessibilityQueue: SubTask[] = [];
        const parallelTasks: SubTask[] = [];

        for (const task of subtasks) {
            if (task.skills.some(s => s.needsAccessibility)) {
                accessibilityQueue.push(task);
            } else {
                parallelTasks.push(task);
            }
        }

        const results: SubAgentResult[] = [];

        const parallelResults = await this.executeWithConcurrency(
            parallelTasks,
            conversationHistory,
            options
        );
        results.push(...parallelResults);

        for (const task of accessibilityQueue) {
            const result = await this.executeSubtask(task, conversationHistory, options);
            results.push(result);
        }

        const content = await this.synthesize(results, originalPrompt);

        const allToolCalls = results.flatMap(r => r.toolCalls);

        return {
            content,
            toolCalls: allToolCalls,
            subResults: results,
            parallel: parallelTasks.length > 0,
        };
    }

    private async executeWithConcurrency(
        tasks: SubTask[],
        conversationHistory: Message[],
        options?: { maxSteps?: number }
    ): Promise<SubAgentResult[]> {
        const results: SubAgentResult[] = [];
        const executing: Set<Promise<void>> = new Set();

        for (const task of tasks) {
            const promise = (async () => {
                const result = await this.executeSubtask(task, conversationHistory, options);
                results.push(result);
            })();

            executing.add(promise);
            promise.finally(() => executing.delete(promise));

            if (executing.size >= this.maxConcurrency) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);

        return results;
    }

    private async executeSubtask(
        subtask: SubTask,
        conversationHistory: Message[],
        options?: { maxSteps?: number }
    ): Promise<SubAgentResult> {
        const start = Date.now();

        try {
            const config = await skillRegistry.composeConfig(subtask.skills);
            const tools = await skillRegistry.resolveTools(config.toolNames);

            const agent = new Agent({
                apiKey: this.apiKey,
                model: config.model ?? this.modelId,
                tools,
                systemPrompt: config.systemPrompt,
                maxSteps: config.maxSteps,
            });
            this.activeAgents.add(agent);

            try {
                const result = await agent.processMessage(subtask.prompt, conversationHistory, {
                    maxSteps: options?.maxSteps ?? config.maxSteps,
                });

                return {
                    subtaskId: subtask.id,
                    skillIds: subtask.skills.map(s => s.id),
                    content: result.content,
                    toolCalls: result.toolCalls,
                    status: "completed",
                    durationMs: Date.now() - start,
                };
            } finally {
                this.activeAgents.delete(agent);
            }
        } catch (error) {
            log.error(`Subtask ${subtask.id} failed`, error);
            return {
                subtaskId: subtask.id,
                skillIds: subtask.skills.map(s => s.id),
                content: "",
                toolCalls: [],
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
                durationMs: Date.now() - start,
            };
        }
    }

    private async synthesize(results: SubAgentResult[], originalPrompt: string): Promise<string> {
        const completed = results.filter(r => r.status === "completed");
        const failed = results.filter(r => r.status === "failed");

        if (completed.length === 1 && failed.length === 0) {
            return completed[0].content;
        }

        if (completed.length === 0) {
            return (
                "I wasn't able to complete your request. " +
                failed
                    .map(r => r.error)
                    .filter(Boolean)
                    .join("; ")
            );
        }

        const resultSummaries = results
            .map(r => {
                if (r.status === "completed") {
                    return `[${r.skillIds.join(", ")}]: ${r.content}`;
                }
                return `[${r.skillIds.join(", ")}]: FAILED - ${r.error}`;
            })
            .join("\n\n");

        try {
            const model = createModel(this.apiKey, "gemini-3-flash-preview");

            const { text } = await generateText({
                model,
                prompt: `The user asked: "${originalPrompt}"

Multiple agents worked on parts of this request. Combine their results into a single coherent response for the user. Be concise and natural. If any part failed, mention it briefly.

Agent results:
${resultSummaries}

Combined response:`,
            });

            return text;
        } catch (error) {
            log.error("Synthesis failed, returning raw results", error);
            return completed.map(r => r.content).join("\n\n");
        }
    }
}
