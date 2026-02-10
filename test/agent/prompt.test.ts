import { composeSystemPrompt, SYSTEM_PROMPT, SYSTEM_PROMPT_BASE } from "@/agent/prompt";
import type { Skill } from "@/skills/types";

function makeSkill(id: string, promptFragment: string): Skill {
    return {
        id,
        name: `Skill ${id}`,
        description: `Description ${id}`,
        promptFragment,
    };
}

describe("agent prompt composition", () => {
    test("SYSTEM_PROMPT matches SYSTEM_PROMPT_BASE", () => {
        expect(SYSTEM_PROMPT).toBe(SYSTEM_PROMPT_BASE);
    });

    test("returns base prompt when no skills are active", () => {
        expect(composeSystemPrompt([])).toBe(SYSTEM_PROMPT_BASE);
    });

    test("returns base prompt when all fragments are empty strings", () => {
        const skills = [makeSkill("a", ""), makeSkill("b", "")];
        expect(composeSystemPrompt(skills)).toBe(SYSTEM_PROMPT_BASE);
    });

    test("appends active skills section with trimmed fragments in order", () => {
        const skills = [makeSkill("a", "  First fragment  "), makeSkill("b", "\nSecond fragment\n")];

        const result = composeSystemPrompt(skills);

        expect(result).toBe(
            `${SYSTEM_PROMPT_BASE}

## Active Skills

First fragment

Second fragment`
        );
    });
});