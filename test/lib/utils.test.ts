import { cn } from "@/lib/utils";

describe("cn", () => {
    test("joins basic class strings", () => {
        expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
    });

    test("ignores falsy values", () => {
        expect(cn("flex", false, null, undefined, "", "p-2")).toBe("flex p-2");
    });

    test("merges conflicting Tailwind classes (last one wins)", () => {
        expect(cn("p-2 text-left", "p-4", "text-right")).toBe("p-4 text-right");
    });

    test("supports clsx object and array inputs", () => {
        expect(
            cn(["font-bold", "tracking-wide"], {
                hidden: false,
                block: true,
            })
        ).toBe("font-bold tracking-wide block");
    });
});
