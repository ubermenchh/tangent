import { Tool, tool } from "ai";
import { logger } from "@/lib/logger";
import { toolRegistry } from "@/agent/tools/registry";
import { Skill, SkillMatch, ScopedAgentConfig } from "./types";
import { SYSTEM_PROMPT_BASE } from "@/agent/prompt";

const log = logger.create("SkillRegistry");

interface SkillEntry {
    skill: Skill;
    keywords: string[];
}

class SkillRegistry {
    private skills: Map<string, SkillEntry> = new Map();
    private enabledSkills: Set<string> = new Set();
    private skillTools: Map<string, Tool> = new Map();

    register(skill: Skill, keywords: string[]): void {
        if (this.skills.has(skill.id)) {
            log.warn(`Skill "${skill.id}" already registered, overwriting`);
        }

        if (skill.tools) {
            for (const t of skill.tools) {
                const aiTool = tool({
                    description: t.description,
                    inputSchema: t.parameters,
                    execute: t.execute,
                });
                this.skillTools.set(t.name, aiTool);
                log.debug(`Registered skill tool: ${t.name} (skill=${skill.id})`);
            }
        }

        this.skills.set(skill.id, { skill, keywords });
        this.enabledSkills.add(skill.id);
        log.info(`Registered skill: ${skill.id} (${keywords.length} keywords)`);
    }

    enable(id: string): void {
        if (!this.skills.has(id)) {
            log.warn(`Cannot enable unknown skill: ${id}`);
            return;
        }
        this.enabledSkills.add(id);
        log.info(`Enabled skill: ${id}`);
    }

    disable(id: string): void {
        this.enabledSkills.delete(id);
        log.info(`Disabled skill: ${id}`);
    }

    isEnabled(id: string): boolean {
        return this.enabledSkills.has(id);
    }

    getSkill(id: string): Skill | undefined {
        return this.skills.get(id)?.skill;
    }

    getAllSkills(): Skill[] {
        return Array.from(this.skills.values()).map(e => e.skill);
    }

    getEnabledSkills(): Skill[] {
        return Array.from(this.skills.values())
            .filter(e => this.enabledSkills.has(e.skill.id))
            .map(e => e.skill);
    }

    matchSkills(prompt: string): SkillMatch[] {
        const lower = prompt.toLowerCase();
        const words = lower.split(/\s+/);
        const matches: SkillMatch[] = [];

        for (const [, entry] of this.skills) {
            if (!this.enabledSkills.has(entry.skill.id)) continue;

            let hits = 0;
            for (const kw of entry.keywords) {
                // Support multi-word keywords
                if (kw.includes(" ")) {
                    if (lower.includes(kw)) hits++;
                } else {
                    if (words.includes(kw)) hits++;
                }
            }

            if (hits > 0) {
                const confidence = Math.min(hits / Math.max(entry.keywords.length * 0.3, 1), 1);
                matches.push({ skill: entry.skill, confidence });
            }
        }

        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    async composeConfig(skills: Skill[]): Promise<ScopedAgentConfig> {
        const fragments = skills.map(s => s.promptFragment).filter(Boolean);

        const systemPrompt =
            fragments.length > 0
                ? `${SYSTEM_PROMPT_BASE}\n\n${fragments.join("\n\n")}`
                : SYSTEM_PROMPT_BASE;

        const toolNames = new Set<string>();
        const sensitiveActions = new Set<string>();
        let maxSteps = 5;
        let needsAccessibility = false;
        let needsBackground = false;
        let model: string | undefined;

        for (const skill of skills) {
            if (skill.requiredGlobalTools) {
                for (const name of skill.requiredGlobalTools) {
                    toolNames.add(name);
                }
            }

            if (skill.tools) {
                for (const t of skill.tools) {
                    toolNames.add(t.name);
                }
            }

            if (skill.sensitiveActions) {
                for (const a of skill.sensitiveActions) {
                    sensitiveActions.add(a);
                }
            }

            if (skill.maxSteps && skill.maxSteps > maxSteps) {
                maxSteps = skill.maxSteps;
            }

            if (skill.needsAccessibility) needsAccessibility = true;
            if (skill.needsBackground) needsBackground = true;

            if (skill.model) model = skill.model;
        }

        const coreTools = [
            "get_device_info",
            "get_battery_status",
            "get_clipboard",
            "set_clipboard",
            "web_search",
        ];
        for (const t of coreTools) {
            toolNames.add(t);
        }

        return {
            systemPrompt,
            toolNames: Array.from(toolNames),
            maxSteps,
            model,
            needsAccessibility,
            needsBackground,
            sensitiveActions,
        };
    }

    async resolveTools(toolNames: string[]): Promise<Record<string, Tool>> {
        const allGlobal = await toolRegistry.getTools();
        const resolved: Record<string, Tool> = {};

        for (const name of toolNames) {
            if (allGlobal[name]) {
                resolved[name] = allGlobal[name];
            } else if (this.skillTools.has(name)) {
                resolved[name] = this.skillTools.get(name)!;
            } else {
                log.warn(`Tool "${name}" not found in global or skill registries`);
            }
        }

        return resolved;
    }

    async buildScopedConfig(prompt: string): Promise<{
        config: ScopedAgentConfig;
        tools: Record<string, Tool>;
        matchedSkills: Skill[];
    } | null> {
        const matches = this.matchSkills(prompt);
        if (matches.length === 0) return null;

        const topSkills = matches.slice(0, 3).map(m => m.skill);

        for (const skill of topSkills) {
            if (skill.onActivate) {
                try {
                    await skill.onActivate();
                } catch (err) {
                    log.error(`Skill ${skill.id} activation failed`, err);
                }
            }
        }

        const config = await this.composeConfig(topSkills);
        const tools = await this.resolveTools(config.toolNames);

        return { config, tools, matchedSkills: topSkills };
    }
}

export const skillRegistry = new SkillRegistry();
