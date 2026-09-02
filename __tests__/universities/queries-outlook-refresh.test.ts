import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TargetUniversity } from "@/types/database";

// 2026-09-01 — the admission-outlook staleness fix: getTargetUniversitiesWithDetails now
// refreshes any outlook that predates profiles.updated_at before returning, so the dashboard
// and Saved list never render a verdict computed against an old profile. refreshAdmissionOutlook
// itself is mocked here — its own logic (the honesty gate, the scoring math) is unit-tested in
// __tests__/admissions/outlook.test.ts; this file is about the read-time refresh decision, not
// about re-proving the computation it wraps.

vi.mock("@/lib/admissions/persist", () => ({ refreshAdmissionOutlook: vi.fn() }));

import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";

const USER_ID = "student-1";

function target(overrides: Partial<TargetUniversity> = {}): TargetUniversity {
  return {
    id: "t1",
    user_id: USER_ID,
    university_id: "u1",
    program_id: null,
    status: "exploring",
    notes: null,
    academic_fit_score: null,
    profile_fit_score: null,
    outlook: "competitive",
    estimate_range_low: null,
    estimate_range_high: null,
    outlook_confidence: "medium",
    outlook_model_version: "admission_model_v1",
    outlook_calculated_at: "2026-08-01T00:00:00.000Z",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  } as TargetUniversity;
}

const UNIVERSITY_ROW = { id: "u1", name: "Test University", superseded_by_id: null };

/** Chainable no-matter-the-method mock: every intermediate call returns itself, and it is
 *  awaitable directly (implements `.then`) so callers that stop at `.eq()`/`.order()` without
 *  a terminal `.single()` still resolve — matching how getTargetUniversitiesWithDetails
 *  itself never calls `.single()` on its own `target_universities`/`universities` reads. */
function builder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    order: () => b,
    limit: () => b,
    in: () => b,
    range: () => b,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (r: typeof result) => unknown) => resolve(result),
  };
  return b;
}

/** `target_universities` is queried twice per call with genuinely different intent (the
 *  initial list, then a re-fetch of just the refreshed ids) — a queue lets each test control
 *  both responses independently. `profiles`/`universities` are fixed per test. */
function makeSupabase(opts: { targetUniversitiesQueue: Array<{ data: unknown; error?: unknown }>; profileUpdatedAt: string | null; universities?: unknown[] }) {
  let call = 0;
  return {
    from: (table: string) => {
      if (table === "target_universities") {
        const result = opts.targetUniversitiesQueue[call] ?? { data: [], error: null };
        call++;
        return builder({ error: null, ...result });
      }
      if (table === "profiles") return builder({ data: opts.profileUpdatedAt ? { updated_at: opts.profileUpdatedAt } : null, error: null });
      if (table === "universities") return builder({ data: opts.universities ?? [UNIVERSITY_ROW], error: null });
      return builder({ data: [], error: null });
    },
  } as unknown as SupabaseClient<Database>;
}

beforeEach(() => {
  vi.mocked(refreshAdmissionOutlook).mockReset();
});

describe("getTargetUniversitiesWithDetails — outlook staleness", () => {
  test("does not refresh when outlook_calculated_at is newer than profiles.updated_at", async () => {
    const fresh = target({ outlook_calculated_at: "2026-09-01T00:00:00.000Z" });
    const supabase = makeSupabase({ targetUniversitiesQueue: [{ data: [fresh] }], profileUpdatedAt: "2026-08-15T00:00:00.000Z" });

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(refreshAdmissionOutlook).not.toHaveBeenCalled();
    expect(result[0].outlook).toBe("competitive");
  });

  test("refreshes when outlook_calculated_at predates profiles.updated_at, and returns the re-fetched row", async () => {
    const stale = target({ id: "t1", outlook_calculated_at: "2026-08-01T00:00:00.000Z" });
    const refreshedRow = target({ id: "t1", outlook: "reach", outlook_calculated_at: "2026-09-01T00:00:00.000Z" });
    const supabase = makeSupabase({
      targetUniversitiesQueue: [{ data: [stale] }, { data: [refreshedRow] }],
      profileUpdatedAt: "2026-08-20T00:00:00.000Z",
    });
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue({
      outlook: "reach",
      compositeScore: 40,
      selectivityTier: "high",
      estimateRangeLow: null,
      estimateRangeHigh: null,
      estimateConfidence: null,
      modelVersion: "admission_model_v1",
    } as never);

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(refreshAdmissionOutlook).toHaveBeenCalledWith("t1", USER_ID);
    expect(result[0].outlook).toBe("reach");
  });

  test("refreshes when outlook_calculated_at is null (never computed)", async () => {
    const neverComputed = target({ id: "t1", outlook: null, outlook_calculated_at: null });
    const refreshedRow = target({ id: "t1", outlook: "likely", outlook_calculated_at: "2026-09-01T00:00:00.000Z" });
    const supabase = makeSupabase({
      targetUniversitiesQueue: [{ data: [neverComputed] }, { data: [refreshedRow] }],
      profileUpdatedAt: "2026-08-20T00:00:00.000Z",
    });
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue({ outlook: "likely", compositeScore: 80, selectivityTier: "low", estimateRangeLow: null, estimateRangeHigh: null, estimateConfidence: null, modelVersion: "v1" } as never);

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(refreshAdmissionOutlook).toHaveBeenCalledOnce();
    expect(result[0].outlook).toBe("likely");
  });

  test("a null refresh result (honesty gate refuses) clears the stale outlook rather than leaving the old value", async () => {
    // The regression this guards: refreshAdmissionOutlook deliberately leaves the DB row
    // untouched when the gate refuses, so a naive re-read after the call would still show the
    // stale non-null outlook — exactly the bug this whole feature exists to prevent, just one
    // layer further in.
    const staleButOnceConfident = target({ id: "t1", outlook: "competitive", outlook_calculated_at: "2026-08-01T00:00:00.000Z" });
    const supabase = makeSupabase({
      targetUniversitiesQueue: [{ data: [staleButOnceConfident] }], // no second call expected — refused rows aren't re-fetched
      profileUpdatedAt: "2026-08-20T00:00:00.000Z",
    });
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue(null);

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(result[0].outlook).toBeNull();
    expect(result[0].estimate_range_low).toBeNull();
    expect(result[0].estimate_range_high).toBeNull();
  });

  test("multiple stale rows refresh independently — one refused, one succeeds", async () => {
    const staleA = target({ id: "a", outlook: "competitive", outlook_calculated_at: "2026-08-01T00:00:00.000Z" });
    const staleB = target({ id: "b", outlook: "reach", outlook_calculated_at: "2026-08-01T00:00:00.000Z" });
    const refreshedB = target({ id: "b", outlook: "likely", outlook_calculated_at: "2026-09-01T00:00:00.000Z" });
    const supabase = makeSupabase({
      targetUniversitiesQueue: [{ data: [staleA, staleB] }, { data: [refreshedB] }],
      profileUpdatedAt: "2026-08-20T00:00:00.000Z",
    });
    vi.mocked(refreshAdmissionOutlook).mockImplementation(async (id: string) => (id === "a" ? null : ({ outlook: "likely", compositeScore: 70, selectivityTier: "medium", estimateRangeLow: null, estimateRangeHigh: null, estimateConfidence: null, modelVersion: "v1" } as never)));

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);
    const byId = Object.fromEntries(result.map((r) => [r.id, r.outlook]));

    expect(byId.a).toBeNull();
    expect(byId.b).toBe("likely");
  });

  test("does nothing when the student has no profile row (defensive — should not happen in practice)", async () => {
    const stale = target({ outlook_calculated_at: "2026-08-01T00:00:00.000Z" });
    const supabase = makeSupabase({ targetUniversitiesQueue: [{ data: [stale] }], profileUpdatedAt: null });

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(refreshAdmissionOutlook).not.toHaveBeenCalled();
    expect(result[0].outlook).toBe("competitive");
  });

  test("an empty target list never touches profiles or refreshAdmissionOutlook", async () => {
    const supabase = makeSupabase({ targetUniversitiesQueue: [{ data: [] }], profileUpdatedAt: "2026-08-20T00:00:00.000Z" });

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(result).toEqual([]);
    expect(refreshAdmissionOutlook).not.toHaveBeenCalled();
  });

  // 2026-09-02, the version-tracking gap: outlook_model_version was written per row but
  // never read back here — only outlook_calculated_at vs profiles.updated_at was checked,
  // so a row with a fresh timestamp under a stale FORMULA would never refresh for a student
  // whose profile hasn't otherwise changed. lib/admissions/staleness.ts's isOutlookStale is
  // unit-tested directly for the full matrix; this proves it's actually wired in here.
  test("a fresh-timestamped row under a different model version still refreshes", async () => {
    const wrongVersion = target({ id: "t1", outlook_calculated_at: "2026-09-01T00:00:00.000Z", outlook_model_version: "admission_model_v0_hypothetical" });
    const refreshedRow = target({ id: "t1", outlook: "reach", outlook_model_version: "admission_model_v1", outlook_calculated_at: "2026-09-02T00:00:00.000Z" });
    // A profile timestamp OLDER than the row's own outlook_calculated_at -- if this test
    // passed without the version check, it would prove the check ISN'T what triggered the
    // refresh (timestamp staleness alone would say "not stale" here).
    const supabase = makeSupabase({
      targetUniversitiesQueue: [{ data: [wrongVersion] }, { data: [refreshedRow] }],
      profileUpdatedAt: "2026-08-01T00:00:00.000Z",
    });
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue({
      outlook: "reach",
      compositeScore: 40,
      selectivityTier: "high",
      estimateRangeLow: null,
      estimateRangeHigh: null,
      estimateConfidence: null,
      modelVersion: "admission_model_v1",
    } as never);

    const result = await getTargetUniversitiesWithDetails(supabase, USER_ID);

    expect(refreshAdmissionOutlook).toHaveBeenCalledWith("t1", USER_ID);
    expect(result[0].outlook).toBe("reach");
  });
});
