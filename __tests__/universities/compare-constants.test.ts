import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMPARE_MAX } from "@/lib/universities/compare-constants";

/**
 * Guards a real bug caught live while building the compare feature (P0H): COMPARE_MAX was
 * first defined inside compare-context.tsx ("use client") and imported into the server-
 * rendered compare page. A named export from a "use client" module becomes a client-reference
 * proxy for ANY export, not just components — the server component received a function that
 * throws if called, not the number. `.slice(0, thatFunction)` coerced it to NaN, which `slice`
 * clamps to 0, so every "Compare N" link silently produced an empty comparison with no error
 * anywhere. Moving the constant to this plain, directive-free module fixed it. This test can't
 * reproduce the RSC bundler behavior itself (Vitest doesn't run the Next.js server/client
 * transform), so the only thing it CAN guard is the actual precondition: this file must never
 * grow a "use client" (or "use server") directive, and the compare page must keep importing
 * from here rather than from the client module.
 */
describe("compare constants stay in a plain, client/server-safe module", () => {
  test("COMPARE_MAX is a real number, not a client-reference proxy", () => {
    expect(typeof COMPARE_MAX).toBe("number");
    expect(COMPARE_MAX).toBeGreaterThanOrEqual(2);
  });

  test("lib/universities/compare-constants.ts carries no client/server directive", () => {
    const source = readFileSync(join(__dirname, "..", "..", "lib/universities/compare-constants.ts"), "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).not.toMatch(/^\s*["']use server["']/m);
  });

  test("the server-rendered compare page imports COMPARE_MAX from the plain module, not the client one", () => {
    const source = readFileSync(join(__dirname, "..", "..", "app/(app)/universities/compare/page.tsx"), "utf8");
    expect(source).toContain('from "@/lib/universities/compare-constants"');
    expect(source).not.toContain('COMPARE_MAX } from "@/features/universities/compare-context"');
  });
});
