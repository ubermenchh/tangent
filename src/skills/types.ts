import { ZodObject, ZodRawShape } from "zod";

export interface SkillToolConfig<T extends ZodRawShape = ZodRawShape> {
    name: string;
    description: string;
    parameters: ZodObject<T>;
    execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface Skill {
    id: string;
    name: string;
    description: string;

    // prompt injected when the skill is active
    promptFragment: string;
    tools?: SkillToolConfig[];
    requiredGlobalTools?: string[];
    maxSteps?: number;
    model?: string;
    needsAccessibility?: boolean;
    needsBackground?: boolean;
    // tools that need user confirmation
    sensitiveActions?: string[];
    // android permissions required for this skill
    permission?: string[];

    onActivate?: () => Promise<void>;
    onDeactivate?: () => Promise<void>;
}

export interface SkillMatch {
    skill: Skill;
    confidence: number;
}

export interface ScopedAgentConfig {
    systemPrompt: string;
    toolNames: string[];
    maxSteps: number;
    model?: string;
    needsAccessibility: boolean;
    needsBackground: boolean;
    sensitiveActions: Set<string>;
}
