import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BELOW_MINIMUM_AGE_EVENT_NAMES } from "@/lib/admin/queries";

/**
 * age-gate-flags-section.tsx exists to surface exactly these events, and CEO's own request
 * named the category by a shorthand ("below_minimum_age events") that matches neither literal
 * string exactly -- both are longer, and there are two, not one. Getting this list wrong in
 * either direction is silent: too narrow drops a real safety-relevant row from the one section
 * built to show it; too broad (e.g. a naive `.includes("below_minimum_age")` substring match)
 * could one day match an unrelated future event that happens to contain the same words. This
 * pins the exported list against the actual logEvent(...) call sites directly, the same way
 * __tests__/security/session-less-client-threading.test.ts pins call-site source text rather
 * than trusting a description of it.
 */

function src(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("BELOW_MINIMUM_AGE_EVENT_NAMES matches the real logEvent call sites", () => {
  test("app/(confirm-age)/confirm-age/actions.ts logs the 'backfill' variant", () => {
    const source = src("app/(confirm-age)/confirm-age/actions.ts");
    expect(source).toContain('logEvent(userId, "birth_year_backfill_below_minimum_age"');
    expect(BELOW_MINIMUM_AGE_EVENT_NAMES).toContain("birth_year_backfill_below_minimum_age");
  });

  test("app/(app)/settings/actions.ts logs the 'settings_update' variant", () => {
    const source = src("app/(app)/settings/actions.ts");
    expect(source).toContain('logEvent(session.userId!, "birth_year_settings_update_below_minimum_age"');
    expect(BELOW_MINIMUM_AGE_EVENT_NAMES).toContain("birth_year_settings_update_below_minimum_age");
  });

  test("exactly two variants -- no third has been added without updating this test", () => {
    expect(BELOW_MINIMUM_AGE_EVENT_NAMES).toHaveLength(2);
  });

  test("neither variant is the bare shorthand CEO's own message used", () => {
    // Guards the exact mismatch this list was built to avoid: "below_minimum_age" alone is a
    // substring of both real names, but is not, itself, an event any code logs.
    expect(BELOW_MINIMUM_AGE_EVENT_NAMES).not.toContain("below_minimum_age");
  });
});
