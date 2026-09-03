import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DIMENSION_ORDER } from "@/lib/scoring/labels";
import { CAREER_PROFILE_SCORE_VERSION } from "@/lib/scoring/types";
import { evidenceStateFor, isAssessed } from "@/lib/scoring/signal";
import { getCohortDimensionScores } from "./cohort";
import { evaluateBenchmarkDimension, describeCohort } from "./compute";
import type { BenchmarkDimension, CohortFilter, PeerBenchmarkSummary } from "./types";

export type { PeerBenchmarkSummary, BenchmarkDimensionResult, BenchmarkDimension } from "./types";
export { MIN_COHORT_SIZE } from "./types";

/**
 * Phase 19 — reads this student's own profile (RLS-scoped, ordinary client) to resolve
 * their cohort, then lib/benchmarking/cohort.ts (admin client, aggregate-only) for the
 * comparison. Cheap and deterministic — safe to call on every Career Profile page view,
 * same "recompute on read" convention as admission outlook and requirement evaluation.
 */
export async function getPeerBenchmarks(userId: string): Promise<PeerBenchmarkSummary> {
  const supabase = await createClient();
  const [{ data: profile }, { data: myScores }] = await Promise.all([
    supabase.from("profiles").select("graduation_year, curriculum, profile_strength_score").eq("id", userId).single(),
    supabase.from("profile_scores").select("dimension, score, confidence, reason_codes").eq("user_id", userId).eq("calculation_version", CAREER_PROFILE_SCORE_VERSION),
  ]);
  if (!profile) return { cohortDescription: "All Proxola students", results: [] };

  const filter: CohortFilter = { graduationYear: profile.graduation_year, curriculum: profile.curriculum };

  // getCohortDimensionScores goes through the admin client (see cohort.ts) to read past
  // RLS's owner-only scoping — createAdminClient() throws synchronously when
  // SUPABASE_SECRET_KEY isn't configured. Uncaught, that throw propagates out of the
  // Promise.all in app/(app)/profile/page.tsx and crashes the entire Career Profile page
  // with a 500 — found live-testing this pass. Peer benchmarking is the one place this
  // page reads past its own RLS-scoped data, so it's also the one place a missing admin
  // credential can take the whole page down with it; every other section here uses only
  // the RLS-scoped client and degrades per-row (empty arrays), not by crashing. Caught
  // here so a missing/misconfigured secret key collapses into the same, already-honest
  // "not enough comparable students" empty state PeerBenchmark renders for a genuinely
  // small cohort — not false (there still aren't ≥MIN_COHORT_SIZE comparable peers
  // either way), just not distinguishing the two causes in the UI.
  let peerScoresByDimension: Map<BenchmarkDimension, number[]>;
  try {
    peerScoresByDimension = await getCohortDimensionScores(filter, userId);
  } catch (error) {
    console.warn("[benchmarking] cohort lookup unavailable", error);
    peerScoresByDimension = new Map();
  }

  // Comparing this student's own not_assessed/limited_evidence dimension against peers
  // would offer a percentile for a signal Proxola doesn't actually have -- the identical
  // "score 0 reported as a real weakness" harm Phase 68 already forbids everywhere else
  // (lib/scoring/signal.ts's isAssessed/evidenceStateFor, reused here, not reimplemented).
  // "overall" is deliberately exempt: profile_strength_score is the one product-wide
  // average across all 9 dimensions (lib/scoring/index.ts's computeCareerProfile), used
  // unchanged as the dashboard's own headline number -- redefining what "overall" means
  // just for this comparison would make it disagree with every other surface that shows it.
  const myScoreByDimension = new Map<BenchmarkDimension, number>(
    (myScores ?? [])
      .filter((s) => isAssessed(evidenceStateFor(s.score, s.confidence, Array.isArray(s.reason_codes) && s.reason_codes.length > 0)))
      .map((s) => [s.dimension, s.score])
  );
  if (profile.profile_strength_score !== null) myScoreByDimension.set("overall", profile.profile_strength_score);

  const results = [...DIMENSION_ORDER, "overall" as const]
    .filter((dimension) => myScoreByDimension.has(dimension))
    .map((dimension) => evaluateBenchmarkDimension(dimension, myScoreByDimension.get(dimension)!, peerScoresByDimension.get(dimension) ?? []));

  return { cohortDescription: describeCohort(filter), results };
}
