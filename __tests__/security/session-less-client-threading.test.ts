import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The standing property this repo has now found broken FOUR separate times in one night,
 * each independently, before anyone connected the dots: `getOrCreateWeeklyPlan`
 * (lib/plan/persist.ts), `refreshAdmissionOutlook` (lib/admissions/persist.ts),
 * `refreshOpportunityMatches` (lib/opportunities/persist-matches.ts), and
 * `recomputeCareerProfile` (lib/scoring/persist.ts) each originally called
 * `createClient()` (lib/supabase/server.ts — reads the request's cookies via
 * next/headers) internally, unconditionally. That's correct for a real page render or
 * Server Action, where there IS a request with a logged-in student's cookies attached.
 * It is silently wrong for a scheduled job (app/api/jobs/*): a job has no request, no
 * cookies, no session — `createClient()` still succeeds there (`cookies()` just returns
 * an empty jar, confirmed via lib/supabase/server.ts's own implementation and
 * __tests__/opportunities/refresh-matches-no-session.test.ts's live-RLS-verified
 * behavior), but every RLS-protected read through it comes back EMPTY, not an error —
 * so the bug never throws, it just silently computes on missing data. When the wrapped
 * work is a paid AI call (lib/plan/persist.ts's own header comment; a live, measured
 * ai_usage anomaly on 2026-09-02 is the concrete cost of one instance of this class),
 * that's not just wrong output, it's wrong output that was billed for.
 *
 * The fix each time has been the same shape: accept an optional client parameter,
 * default to `createClient()` (unchanged for every real session caller), and thread it
 * into every nested call the function makes to another function with the same shape —
 * see lib/plan/persist.ts's own comment on `supabaseClient` for the canonical statement
 * of the pattern. The fourth instance wasn't a function with no override at all — it was
 * `lib/counselor/state.ts`'s `getCounselorState`, which already HAD the parameter and
 * used it correctly for seven of its eight parallel reads, calling the eighth
 * (`buildStudentAdvisorContext`) bare. The property that actually needs enforcing isn't
 * "does this function accept a client" — it's "does every job-reachable call site
 * actually pass the one it has."
 *
 * This file pins that property directly, for every function currently known to sit on a
 * job's call graph (traced 2026-09-02 from all nine app/api/jobs/*\/route.ts entry
 * points). If you're adding a TENTH instance — a new job, or a new call from inside one
 * of the functions below to another function shaped like these — and this test doesn't
 * yet cover it: that's a real gap in this file, not a false negative to work around.
 * Extend the list below rather than assuming a green run here means the codebase is
 * clean; it means what's listed here is clean.
 */

function src(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("lib/counselor/state.ts — getCounselorState threads its client into every nested read", () => {
  const source = src("lib/counselor/state.ts");

  test("buildStudentAdvisorContext receives supabaseClient, not a bare call (the 2026-09-02 fix)", () => {
    // Not paired with a `.not.toContain` check for the old bare call: this file's own
    // fix comment quotes that exact string for context, which would make the negative
    // assertion fail on prose, not code. The positive assertion below is the actual
    // proof — the one real call site now reads exactly this, not the bare form.
    expect(source).toContain("buildStudentAdvisorContext(userId, supabaseClient)");
  });

  test("refreshOpportunityMatches receives the resolved client (fixed same day, different package)", () => {
    expect(source).toContain("await refreshOpportunityMatches(userId, locale, supabase)");
  });

  test("assembleScoringFacts (no optional-client fallback of its own -- always requires one) receives the resolved client", () => {
    expect(source).toContain("assembleScoringFacts(supabase, userId)");
  });

  test("the shared getProfileScores helper is bypassed (in favor of a raw query on the resolved client) exactly when this function's own client was explicitly passed in", () => {
    const guardIndex = source.indexOf("const scoresPromise:");
    const block = source.slice(guardIndex, guardIndex + 400);
    expect(block).toContain("supabaseClient");
    expect(block).toContain('supabase.from("profile_scores")');
    expect(block).toContain("getProfileScores(userId)");
  });
});

describe("lib/ai/weekly-plan.ts — generateWeeklyPlan threads its client into both of its own calls", () => {
  const source = src("lib/ai/weekly-plan.ts");

  test("buildStudentAdvisorContext receives supabaseClient", () => {
    expect(source).toContain("buildStudentAdvisorContext(userId, supabaseClient)");
  });

  test("buildCounselorGrounding (which reaches getCounselorRecommendations -> getCounselorState) receives supabaseClient", () => {
    // locale inserted 2026-09-02 (raw-enum-leak sweep, also fixed the sibling bug this
    // exposed: locale was previously hardcoded undefined here regardless of the real
    // caller) — supabaseClient is still the last positional argument, still threaded.
    expect(source).toContain("buildCounselorGrounding(userId, context.student.preferredLanguage, supabaseClient)");
  });
});

describe("lib/counselor/index.ts — getCounselorRecommendations threads its client into getCounselorState", () => {
  const source = src("lib/counselor/index.ts");

  test("getCounselorState receives supabaseClient, not a bare call", () => {
    expect(source).toContain("getCounselorState(userId, locale, supabaseClient)");
  });
});

describe("lib/plan/generate-for-active-students.ts — the Job D precedent this whole pattern is named after", () => {
  const source = src("lib/plan/generate-for-active-students.ts");

  test("the job's own admin client is threaded into both getCurrentWeeklyPlan and getOrCreateWeeklyPlan", () => {
    expect(source).toContain("getCurrentWeeklyPlan(userId, supabase)");
    expect(source).toContain("getOrCreateWeeklyPlan(userId, { supabaseClient: supabase })");
  });
});

describe("lib/admissions/scan.ts — scanStaleOutlooks threads its client into refreshAdmissionOutlook", () => {
  const source = src("lib/admissions/scan.ts");

  test("the admin client is the fourth argument, not omitted", () => {
    expect(source).toContain("refreshAdmissionOutlook(target.id, target.user_id, undefined, supabase)");
  });
});

describe("lib/scoring/scheduled-review.ts — runScheduledReview threads its client into recomputeCareerProfile", () => {
  const source = src("lib/scoring/scheduled-review.ts");

  test("both supabaseClient and adminClient are the job's own admin client", () => {
    expect(source).toContain("supabaseClient: admin");
    expect(source).toContain("adminClient: admin");
  });
});
