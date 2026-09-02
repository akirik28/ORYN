import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { University, UniversityRequirement, UniversityStatistic } from "@/types/database";
import { loadSupersessionMap as loadSupersessionMapUncached, type SupersessionMap } from "./canonical";

/**
 * docs/performance.md §5 traced `/universities/[id]` re-fetching the same university's own
 * `universities`/`university_statistics`/`university_requirements` rows, and the global
 * supersession map, across `generateMetadata`, the page component, `refreshAdmissionOutlook`,
 * and `refreshRequirementEvaluations` — up to 3x for `universities` alone. Same fix shape as
 * `lib/security/dal.ts`'s `getProfileScores` (docs/performance.md §2/§5, closed the
 * `profile_scores` category): `cache()`-wrapped, constructs its own `createClient()`
 * internally rather than accepting one as a parameter. That last part is load-bearing, not a
 * style choice, for the identical reason documented on `getProfileScores` — `cache()`
 * memoizes on argument identity, `createClient()` isn't itself memoized, and a helper shaped
 * `(supabase, id)` would see a different `supabase` reference from every independent caller
 * and never actually dedupe.
 *
 * Each function does one wide `select("*")` (or the widest shape a caller needs) rather than
 * each call site specifying its own narrower column list — same reasoning as
 * `getProfileScores`'s own comment: a narrower query is what made the duplicate reads look
 * like different queries at a glance even though they wanted the same row.
 *
 * Not a fit for every `universities`/`university_statistics`/`university_requirements`
 * caller: cohort-wide reads (`lib/universities/queries.ts`'s country/cost/QS-position scans,
 * many universities at once) and script/acquisition contexts have no request for `cache()`
 * to scope to and are structurally different queries these helpers aren't shaped for.
 */
export const getUniversity = cache(async (universityId: string): Promise<University | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("universities").select("*").eq("id", universityId).maybeSingle();
  if (error) {
    console.error("[universities] failed to load university", { universityId, error: error.message });
    return null;
  }
  return data;
});

/** Widest current-year row for this university, matching every existing caller's own
 * `.order("stat_year", { ascending: false }).limit(1).maybeSingle()` convention exactly —
 * changing that shape (e.g. to "all years") would change behavior for callers that never
 * asked for it, not just deduplicate them. */
export const getUniversityStatistics = cache(async (universityId: string): Promise<UniversityStatistic | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("university_statistics")
    .select("*")
    .eq("university_id", universityId)
    .order("stat_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[universities] failed to load university statistics", { universityId, error: error.message });
    return null;
  }
  return data;
});

/** docs/performance.md §5 found this one already querying identically at both call sites
 * (`select("*")` on `university_requirements` filtered by `university_id`, nothing narrower
 * anywhere) — the simplest of the four categories here, since there was no shape to
 * reconcile, only the duplicate round trip itself. */
export const getUniversityRequirements = cache(async (universityId: string): Promise<UniversityRequirement[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("university_requirements").select("*").eq("university_id", universityId);
  if (error) {
    console.error("[universities] failed to load university requirements", { universityId, error: error.message });
    return [];
  }
  return data ?? [];
});

/**
 * Global (not per-university) — the same 9-row supersession table for every caller in a
 * request, so this is the one function here `cache()` can dedupe with no argument-identity
 * concern at all: there's nothing to key on, and every call in one render wants the exact
 * same result. Wraps the existing `loadSupersessionMap(supabase)` (lib/universities/canonical.ts)
 * rather than changing its signature — that function has callers across the app/script
 * surface this cache()'d entry point isn't meant for (see that file's own doc comment), so
 * this is a new, page-appropriate memoized entry point layered on top, not a retrofit of a
 * widely-shared one.
 */
export const getSupersessionMap = cache(async (): Promise<SupersessionMap> => {
  const supabase = await createClient();
  return loadSupersessionMapUncached(supabase);
});
