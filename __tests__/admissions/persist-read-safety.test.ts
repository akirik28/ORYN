import { describe, expect, test, vi } from "vitest";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-03: readOr adoption (docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md, tier 1)
 * -- refreshAdmissionOutlook computes the reach/competitive/likely label a student sees on
 * a target university. No prior coverage existed for this function at all (every OTHER
 * piece of the outlook pipeline -- explain/outlook/system-shape/field-availability -- has
 * its own tests; this DB-orchestration layer didn't).
 *
 * Always passes an explicit fake `client`, so profilePromise/scoresPromise take their
 * direct-query branch (the shared getCurrentProfile()/getProfileScores() helpers, used only
 * on the session-implicit path, are out of scope for this file's own contained fix).
 */

type QueryResult = { data: unknown; error: { message: string } | null };

// reason_codes non-empty is what evidenceStateFor reads as "has evidence" -- an empty array
// is itself a real claim ("nothing to score"), which lands on not_assessed, not a confident
// state (see lib/scoring/signal.ts's own doc comment on DimensionScoreRow.reasonCodes).
const CONFIDENT_SCORE_ROW = { dimension: "academics", score: 65, confidence: "high", reason_codes: ["has_activities"] };

function fakeClient(perTable: Record<string, QueryResult>): SupabaseClient<Database> {
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
        update: () => builder,
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

const TARGET_ID = "target-1";
const USER_ID = "user-1";

const SUCCEEDING_TABLES: Record<string, QueryResult> = {
  target_universities: { data: { id: TARGET_ID, university_id: "uni-1", program_id: null }, error: null },
  profiles: { data: { profile_strength_score: 60, completeness_percent: 70, country: "Turkey" }, error: null },
  profile_scores: { data: [CONFIDENT_SCORE_ROW], error: null },
  university_statistics: { data: { admission_rate: 0.2, data_confidence: "high" }, error: null },
  universities: { data: { name: "Bocconi", country: "Italy" }, error: null },
};

describe("refreshAdmissionOutlook — read-failure visibility", () => {
  test("every read succeeding produces a real outlook and logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", fakeClient(SUCCEEDING_TABLES));
    expect(outlook).not.toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed target_universities read returns null (unchanged from a genuinely-missing row) but is now logged, not silent", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ ...SUCCEEDING_TABLES, target_universities: { data: null, error: { message: "connection reset" } } });
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", client);
    expect(outlook).toBeNull();
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("refreshAdmissionOutlook.target"))).toBe(true);
    spy.mockRestore();
  });

  test("a genuinely-missing target row also returns null, with no log -- only a real read failure logs, not a real absence", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ ...SUCCEEDING_TABLES, target_universities: { data: null, error: null } });
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", client);
    expect(outlook).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed profile_scores read lands on the same conservative gate a genuinely-empty one always did (withhold the outlook), now logged instead of indistinguishable from 'not enough data yet'", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ ...SUCCEEDING_TABLES, profile_scores: { data: null, error: { message: "boom" } } });
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", client);
    expect(outlook).toBeNull();
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("refreshAdmissionOutlook.scores"))).toBe(true);
    spy.mockRestore();
  });

  test("a failed university_statistics read still produces an outlook (admissionRate falls back to null, same as a genuinely-missing stat), logged under its own category", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ ...SUCCEEDING_TABLES, university_statistics: { data: null, error: { message: "timeout" } } });
    const outlook = await refreshAdmissionOutlook(TARGET_ID, USER_ID, "en", client);
    expect(outlook).not.toBeNull();
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("refreshAdmissionOutlook.stats"))).toBe(true);
    spy.mockRestore();
  });
});
