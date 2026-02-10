import { z } from "zod";
import type { Skill, ScopedAgentConfig } from "@/skills/types";

const mockGetTools = jest.fn();
const mockAiTool = jest.fn((config: unknown) => ({ __mockTool: true, config }));

jest.mock("ai", () => ({
    tool: (config: unknown) => mockAiTool(config),
}));

jest.mock("@/agent/tools/registry", () => ({
    toolRegistry: {
        getTools: (...args: unknown[]) => mockGetTools(...args),
    },
}));

import { skillRegistry } from "@/skills/registry";

let seq = 0;
const uid = (label: string) => `sr_${label}_${++seq}`;

function makeSkill(id: string, overrides: Partial<Skill> = {}): Skill {
    return {
        id,
        name: id,
        description: `${id} description`,
        promptFragment: `${id} prompt`,
        ...overrides,
    };
}

describe("skillRegistry", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTools.mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("register + match + enable/disable works", () => {
        const id = uid("skill");
        const keyword = uid("keyword");
        const phrase = `${uid("multi")} phrase`;

        const skill = makeSkill(id);
        skillRegistry.register(skill, [keyword, phrase]);

        expect(skillRegistry.getSkill(id)?.id).toBe(id);

        const match1 = skillRegistry.matchSkills(`please ${keyword}`);
        expect(match1.some(m => m.skill.id === id)).toBe(true);

        const match2 = skillRegistry.matchSkills(`please ${phrase}`);
        expect(match2.some(m => m.skill.id === id)).toBe(true);

        skillRegistry.disable(id);
        const matchDisabled = skillRegistry.matchSkills(`please ${keyword}`);
        expect(matchDisabled.some(m => m.skill.id === id)).toBe(false);

        skillRegistry.enable(id);
        const matchEnabled = skillRegistry.matchSkills(`please ${keyword}`);
        expect(matchEnabled.some(m => m.skill.id === id)).toBe(true);
    });

    test("matchSkills sorts by confidence descending", () => {
        const idA = uid("skillA");
        const idB = uid("skillB");

        const a1 = uid("a1");
        const a2 = uid("a2");
        const a3 = uid("a3");
        const a4 = uid("a4");
        const b1 = uid("b1");

        skillRegistry.register(makeSkill(idA), [a1, a2, a3, a4]); // 1/1.2 => 0.83
        skillRegistry.register(makeSkill(idB), [b1]); // 1/1 => 1.0

        const matches = skillRegistry.matchSkills(`${a1} ${b1}`);
        const a = matches.find(m => m.skill.id === idA);
        const b = matches.find(m => m.skill.id === idB);

        expect(a).toBeDefined();
        expect(b).toBeDefined();
        expect((b?.confidence ?? 0)).toBeGreaterThan(a?.confidence ?? 0);
        expect(matches[0].skill.id).toBe(idB);
    });

    test("composeConfig merges tools/flags/model and appends core tools", async () => {
        const skillTool1 = uid("skill_tool_1");
        const skillTool2 = uid("skill_tool_2");

        const s1 = makeSkill(uid("compose1"), {
            promptFragment: "fragment one",
            requiredGlobalTools: ["global_a", "global_b"],
            tools: [
                {
                    name: skillTool1,
                    description: "tool 1",
                    parameters: z.object({}),
                    execute: async () => ({ ok: true }),
                },
            ],
            sensitiveActions: ["delete_message"],
            maxSteps: 8,
            needsAccessibility: true,
        });

        const s2 = makeSkill(uid("compose2"), {
            promptFragment: "fragment two",
            requiredGlobalTools: ["global_b", "global_c"],
            tools: [
                {
                    name: skillTool2,
                    description: "tool 2",
                    parameters: z.object({}),
                    execute: async () => ({ ok: true }),
                },
            ],
            sensitiveActions: ["send_money"],
            maxSteps: 14,
            needsBackground: true,
            model: "gemini-3-flash-preview",
        });

        const config = await skillRegistry.composeConfig([s1, s2]);

        expect(config.systemPrompt).toContain("fragment one");
        expect(config.systemPrompt).toContain("fragment two");

        expect(config.toolNames).toEqual(
            expect.arrayContaining([
                "global_a",
                "global_b",
                "global_c",
                skillTool1,
                skillTool2,
                "get_device_info",
                "get_battery_status",
                "get_clipboard",
                "set_clipboard",
                "web_search",
            ])
        );

        expect(new Set(config.toolNames).size).toBe(config.toolNames.length); // deduped
        expect(config.maxSteps).toBe(14);
        expect(config.model).toBe("gemini-3-flash-preview");
        expect(config.needsAccessibility).toBe(true);
        expect(config.needsBackground).toBe(true);
        expect(config.sensitiveActions.has("delete_message")).toBe(true);
        expect(config.sensitiveActions.has("send_money")).toBe(true);
    });

    test("resolveTools prefers global tools over skill tools", async () => {
        const sharedToolName = uid("shared_tool");
        const skillOnlyName = uid("skill_only");
        const globalOnlyName = uid("global_only");

        skillRegistry.register(
            makeSkill(uid("resolver"), {
                tools: [
                    {
                        name: sharedToolName,
                        description: "shared skill tool",
                        parameters: z.object({}),
                        execute: async () => ({ from: "skill" }),
                    },
                    {
                        name: skillOnlyName,
                        description: "skill-only tool",
                        parameters: z.object({}),
                        execute: async () => ({ from: "skill" }),
                    },
                ],
            }),
            [uid("resolver_keyword")]
        );

        const globalShared = { source: "global-shared" } as unknown;
        const globalOnly = { source: "global-only" } as unknown;

        mockGetTools.mockResolvedValue({
            [sharedToolName]: globalShared,
            [globalOnlyName]: globalOnly,
        });

        const resolved = await skillRegistry.resolveTools([
            sharedToolName,
            skillOnlyName,
            globalOnlyName,
            uid("missing"),
        ]);

        expect(resolved[sharedToolName]).toBe(globalShared);
        expect(resolved[globalOnlyName]).toBe(globalOnly);
        expect(resolved[skillOnlyName]).toBeDefined();
        expect(resolved[uid("absent") as keyof typeof resolved]).toBeUndefined();
        expect(mockAiTool).toHaveBeenCalled();
    });

    test("buildScopedConfig returns null when no skills match", async () => {
        const result = await skillRegistry.buildScopedConfig(uid("definitely_no_match_prompt"));
        expect(result).toBeNull();
    });

    test("buildScopedConfig selects top 3 matches and tolerates activation errors", async () => {
        const id1 = uid("top1");
        const id2 = uid("top2");
        const id3 = uid("top3");
        const id4 = uid("low4");

        const kw1 = uid("kw1");
        const kw2 = uid("kw2");
        const kw3 = uid("kw3");
        const kw4 = uid("kw4");

        const onActivate1 = jest.fn(async () => {});
        const onActivate2 = jest.fn(async () => {
            throw new Error("activation failed");
        });
        const onActivate3 = jest.fn(async () => {});
        const onActivate4 = jest.fn(async () => {});

        // First 3 have confidence 1.0, last one has lower confidence.
        skillRegistry.register(makeSkill(id1, { onActivate: onActivate1 }), [kw1]);
        skillRegistry.register(makeSkill(id2, { onActivate: onActivate2 }), [kw2]);
        skillRegistry.register(makeSkill(id3, { onActivate: onActivate3 }), [kw3]);
        skillRegistry.register(makeSkill(id4, { onActivate: onActivate4 }), [kw4, uid("extra"), uid("extra2"), uid("extra3")]);

        const fakeConfig: ScopedAgentConfig = {
            systemPrompt: "scoped",
            toolNames: ["get_device_info"],
            maxSteps: 5,
            model: undefined,
            needsAccessibility: false,
            needsBackground: false,
            sensitiveActions: new Set<string>(),
        };
        const fakeTools = { get_device_info: { tool: "x" } } as Record<string, unknown>;

        const composeSpy = jest.spyOn(skillRegistry, "composeConfig").mockResolvedValue(fakeConfig);
        const resolveSpy = jest
            .spyOn(skillRegistry, "resolveTools")
            .mockResolvedValue(fakeTools as never);

        const result = await skillRegistry.buildScopedConfig(`${kw1} ${kw2} ${kw3} ${kw4}`);

        expect(result).not.toBeNull();
        expect(result?.matchedSkills).toHaveLength(3);
        const matchedIds = result?.matchedSkills.map(s => s.id) ?? [];
        expect(matchedIds).toEqual(expect.arrayContaining([id1, id2, id3]));
        expect(matchedIds).not.toContain(id4);

        expect(onActivate1).toHaveBeenCalledTimes(1);
        expect(onActivate2).toHaveBeenCalledTimes(1); // error is swallowed
        expect(onActivate3).toHaveBeenCalledTimes(1);
        expect(onActivate4).not.toHaveBeenCalled();

        expect(composeSpy).toHaveBeenCalledTimes(1);
        expect(resolveSpy).toHaveBeenCalledWith(fakeConfig.toolNames);
    });
});