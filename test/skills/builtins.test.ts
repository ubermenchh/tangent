import {
    amazonSkill,
    blinkitSkill,
    entertainmentSkill,
    facebookSkill,
    instagramSkill,
    navigationSkill,
    productivitySkill,
    twitterSkill,
    whatsappSkill,
    zomatoSkill,
} from "@/skills/builtins";

import { shoppingSkill } from "@/skills/builtins/shopping";
import { socialMediaSkill } from "@/skills/builtins/social";
import type { Skill } from "@/skills/types";

const exportedSkills: Skill[] = [
    whatsappSkill,
    twitterSkill,
    instagramSkill,
    facebookSkill,
    amazonSkill,
    zomatoSkill,
    blinkitSkill,
    productivitySkill,
    navigationSkill,
    entertainmentSkill,
];

const extraBuiltins: Skill[] = [shoppingSkill, socialMediaSkill];
const allBuiltins: Skill[] = [...exportedSkills, ...extraBuiltins];

describe("skills/builtins", () => {
    test("index exports the expected skill set", () => {
        const builtinsModule = jest.requireActual("@/skills/builtins") as Record<string, unknown>;

        expect(Object.keys(builtinsModule).sort()).toEqual(
            [
                "whatsappSkill",
                "twitterSkill",
                "instagramSkill",
                "facebookSkill",
                "amazonSkill",
                "zomatoSkill",
                "blinkitSkill",
                "productivitySkill",
                "navigationSkill",
                "entertainmentSkill",
            ].sort()
        );
    });

    test("all builtin ids are unique and non-empty", () => {
        const ids = allBuiltins.map(skill => skill.id);

        expect(ids.every(id => id.length > 0)).toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
    });

    for (const skill of allBuiltins) {
        test(`${skill.id} has a stable shape`, () => {
            expect(skill.name.length).toBeGreaterThan(0);
            expect(skill.description.length).toBeGreaterThan(0);
            expect(skill.promptFragment.trim().startsWith("##")).toBe(true);

            expect(Array.isArray(skill.requiredGlobalTools)).toBe(true);
            expect((skill.requiredGlobalTools ?? []).length).toBeGreaterThan(0);
            expect(new Set(skill.requiredGlobalTools).size).toBe(skill.requiredGlobalTools?.length);
        });
    }

    test("sensitive actions align with required tools", () => {
        expect(whatsappSkill.sensitiveActions).toEqual(["send_whatsapp"]);
        expect(whatsappSkill.requiredGlobalTools).toContain("send_whatsapp");

        expect(productivitySkill.sensitiveActions).toEqual(["send_sms"]);
        expect(productivitySkill.requiredGlobalTools).toContain("send_sms");

        expect(socialMediaSkill.sensitiveActions).toEqual(["send_whatsapp"]);
        expect(socialMediaSkill.requiredGlobalTools).toContain("send_whatsapp");
    });

    test("domain-specific tool requirements are present", () => {
        expect(entertainmentSkill.requiredGlobalTools).toEqual(
            expect.arrayContaining(["search_youtube", "play_video", "search_videos"])
        );
        expect(navigationSkill.requiredGlobalTools).toEqual(
            expect.arrayContaining(["navigate_to", "open_url", "web_search"])
        );
        expect(amazonSkill.requiredGlobalTools).toContain("web_search");
    });
});