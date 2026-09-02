import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWN_PRODUCT_EVENT_NAMES, BELOW_MINIMUM_AGE_EVENT_NAMES } from "@/lib/admin/queries";

/**
 * getFeatureCensus (lib/admin/queries.ts) reads exactly this list -- too narrow silently
 * drops a real feature from the growth panel's census (the whole point of the section);
 * too broad shows a phantom "0 events" row for something no code actually logs. Pins the
 * exported list against the real logEvent(...) call sites directly, same technique as
 * __tests__/admin/below-minimum-age-event-names.test.ts (which this test deliberately
 * doesn't re-verify -- BELOW_MINIMUM_AGE_EVENT_NAMES is spread into this list and that
 * file already guards its own two entries).
 */

function src(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

const REAL_CALL_SITES: { file: string; literal: string; eventName: string }[] = [
  { file: "app/(app)/opportunities/actions.ts", literal: '"opportunity_saved"', eventName: "opportunity_saved" },
  { file: "app/(app)/opportunities/actions.ts", literal: '"opportunity_applied"', eventName: "opportunity_applied" },
  { file: "app/(app)/settings/actions.ts", literal: 'logEvent(session.userId!, "ultra_interest_registered")', eventName: "ultra_interest_registered" },
  { file: "app/(app)/advisor/actions.ts", literal: 'logEvent(userId, "advisor_message_sent"', eventName: "advisor_message_sent" },
  { file: "app/(app)/universities/actions.ts", literal: 'logEvent(userId, "target_university_added"', eventName: "target_university_added" },
  { file: "app/(app)/plan/actions.ts", literal: 'logEvent(session.userId!, "weekly_action_completed"', eventName: "weekly_action_completed" },
  { file: "app/(app)/profile/import/actions.ts", literal: 'logEvent(userId, "cv_imported"', eventName: "cv_imported" },
  { file: "app/(app)/applications/actions.ts", literal: 'logEvent(session.userId!, "application_updated"', eventName: "application_updated" },
  { file: "app/(app)/profile/actions.ts", literal: 'logEvent(session.userId!, "profile_item_added"', eventName: "profile_item_added" },
  { file: "app/(app)/profile/actions.ts", literal: 'logEvent(session.userId!, "research_project_started"', eventName: "research_project_started" },
  { file: "app/(onboarding)/onboarding/actions.ts", literal: 'logEvent(session.userId!, "cv_imported"', eventName: "cv_imported" },
  { file: "app/(onboarding)/onboarding/actions.ts", literal: 'logEvent(userId, "onboarding_completed")', eventName: "onboarding_completed" },
];

describe("KNOWN_PRODUCT_EVENT_NAMES matches the real logEvent call sites", () => {
  test.each(REAL_CALL_SITES)("$file logs $eventName", ({ file, literal, eventName }) => {
    expect(src(file)).toContain(literal);
    expect(KNOWN_PRODUCT_EVENT_NAMES).toContain(eventName);
  });

  test("every known name is unique -- cv_imported has two call sites but appears once in the list", () => {
    expect(new Set(KNOWN_PRODUCT_EVENT_NAMES).size).toBe(KNOWN_PRODUCT_EVENT_NAMES.length);
  });

  test("exactly the real distinct event names -- 11 product + 2 safety-net, no extra or missing entry", () => {
    // 12 call sites above, but cv_imported fires from two of them -- 11 distinct names.
    const realDistinctNames = new Set(REAL_CALL_SITES.map((c) => c.eventName));
    expect(realDistinctNames.size).toBe(11);
    for (const name of realDistinctNames) expect(KNOWN_PRODUCT_EVENT_NAMES).toContain(name);
    expect(KNOWN_PRODUCT_EVENT_NAMES).toHaveLength(realDistinctNames.size + BELOW_MINIMUM_AGE_EVENT_NAMES.length);
  });

  test("includes both age-gate safety-net events, not just product events", () => {
    for (const name of BELOW_MINIMUM_AGE_EVENT_NAMES) expect(KNOWN_PRODUCT_EVENT_NAMES).toContain(name);
  });
});
