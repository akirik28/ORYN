import { describe, expect, test } from "vitest";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-04 — pins the real shape of a genuine gap found in the live database (C4/A6
 * follow-up), not a hypothetical: a real account with target universities and every
 * profile_scores dimension either `not_assessed` (empty reason_codes) or `limited_evidence`
 * (low confidence) has no computed outlook on any of them. Read as a bug at first — it
 * isn't. `refreshAdmissionOutlook`'s own gate (see that function's "The gate" comment)
 * withholds judgment on purpose when `hasConfidentSignal` is false, exactly this account's
 * real shape. `hasConfidentSignal` itself already has thorough unit coverage
 * (__tests__/scoring/signal.test.ts) — what had no coverage anywhere was this function,
 * given a REAL mix of not_assessed/limited_evidence rows (not an empty array, not a
 * generic "low confidence" single row), actually reaching that gate and refusing to write.
 * That's the assertion this file exists to freeze, so a future "empty outlook looks like a
 * bug" fix doesn't quietly start fabricating a guess for exactly this shape.
 */

type QueryResult = { data: unknown; error: { message: string } | null };

function fakeClient(perTable: Record<string, QueryResult>): { client: SupabaseClient<Database>; calls: { update: number } } {
  // `calls` is a live, shared object (not a primitive snapshot) — the caller reads
  // `calls.update` *after* refreshAdmissionOutlook has run, so this has to stay a reference
  // the closure below keeps mutating, not a number captured at construction time.
  const calls = { update: 0 };
  const client = {
    from: (table: string) => {
      const result = perTable[table] ?? { data: null, error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        update: () => {
          calls.update++;
          return builder;
        },
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

const TARGET_ID = "target-1";
const USER_ID = "user-1";

// The real shape: 8 dimensions with nothing recorded (empty reason_codes -> not_assessed),
// 1 with a low-confidence, near-zero read (limited_evidence, not emerging/developing/strong
// -- see evidenceStateFor's own confidence check, which runs before the score bands).
// Zero of the nine reach an assessed state, so hasConfidentSignal must be false.
const UNCONFIDENT_SCORE_ROWS = [
  { dimension: "academics", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "intellectual_curiosity", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "leadership", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "research", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "entrepreneurship", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "community_impact", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "awards_distinction", score: 0, confidence: "low", reason_codes: [] },
  { dimension: "career_exploration", score: 4, confidence: "low", reason_codes: ["activity_breadth"] },
  { dimension: "execution_project_depth", score: 0, confidence: "low", reason_codes: [] },
];

const BASE_TABLES: Record<string, QueryResult> = {
  target_universities: { data: { id: TARGET_ID, university_id: "uni-1", program_id: null }, error: null },
  profiles: { data: { profile_strength_score: 0, completeness_percent: 50, country: "Ireland" }, error: null },
  university_statistics: { data: { admission_rate: 0.2, data_confidence: "high" }, error: null },
  universities: { data: { name: "Trinity College Dublin", country: "Ireland" }, error: null },
};

describe("refreshAdmissionOutlook — the confidence gate, pinned against a real account's shape", () => {
  test("a profile with no confident signal returns null and never attempts to write", async () => {
    const { client, calls } = fakeClient({ ...BASE_TABLES, profile_scores: { data: UNCONFIDENT_SCORE_ROWS, error: null } });
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", client);
    expect(outlook).toBeNull();
    expect(calls.update).toBe(0);
  });

  test("sanity check — the same target with one genuinely confident dimension DOES get an outlook written", async () => {
    const confidentRows = [...UNCONFIDENT_SCORE_ROWS.slice(0, -1), { dimension: "execution_project_depth", score: 65, confidence: "high", reason_codes: ["project"] }];
    const { client, calls } = fakeClient({ ...BASE_TABLES, profile_scores: { data: confidentRows, error: null } });
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", client);
    expect(outlook).not.toBeNull();
    expect(calls.update).toBeGreaterThan(0);
  });
});
