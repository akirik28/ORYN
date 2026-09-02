import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { CAREER_PROFILE_SCORE_VERSION } from "@/lib/scoring/types";
import type { BenchmarkDimension, CohortFilter } from "./types";

/** Hard cap on how many peer profiles one cohort query will scan — a pre-launch safety
 * bound, not a tuned production limit (see lib/benchmarking/README note in
 * docs/current-state.md). Revisit once real cohort sizes approach it. */
const MAX_COHORT_SCAN = 2000;

/**
 * Reads other students' profile_scores to build per-dimension peer-score arrays for one
 * cohort. This is the one place in the codebase that deliberately reads across many users'
 * private rows at once — profiles/profile_scores RLS is owner-only by design (see
 * SECURITY.md), and a percentile genuinely cannot be computed without looking past one
 * user's own rows, so this goes through the admin client rather than trying to force it
 * through RLS.
 *
 * The privacy boundary is enforced by this function's *return shape*, not by caller
 * discipline: it returns only `number[]` per dimension, never a peer's user id, name, or
 * any other identifying field, so nothing upstream of this function is even capable of
 * re-identifying a peer from the result — see lib/benchmarking/compute.ts, which is all
 * this feeds into.
 */
export async function getCohortDimensionScores(filter: CohortFilter, excludeUserId: string): Promise<Map<BenchmarkDimension, number[]>> {
  const admin = createAdminClient();

  let query = admin.from("profiles").select("id, profile_strength_score").neq("id", excludeUserId).limit(MAX_COHORT_SCAN);
  if (filter.graduationYear !== null) query = query.eq("graduation_year", filter.graduationYear);
  if (filter.curriculum !== null) query = query.eq("curriculum", filter.curriculum);

  const { data: peers } = await query;
  const byDimension = new Map<BenchmarkDimension, number[]>();
  if (!peers || peers.length === 0) return byDimension;

  const overallScores = peers.map((p) => p.profile_strength_score).filter((s): s is number => s !== null);
  if (overallScores.length > 0) byDimension.set("overall", overallScores);

  const peerIds = peers.map((p) => p.id);
  // calculation_version filtered for the same reason as every other profile_scores reader
  // (lib/security/dal.ts's getProfileScores) -- doubly so here, since this pools many
  // students' scores together: a peer recomputed under a newer formula before everyone
  // else would otherwise get compared on a different scale, not just shown a stale number.
  const { data: scores } = await admin.from("profile_scores").select("user_id, dimension, score").eq("calculation_version", CAREER_PROFILE_SCORE_VERSION).in("user_id", peerIds);
  for (const row of scores ?? []) {
    byDimension.set(row.dimension, [...(byDimension.get(row.dimension) ?? []), row.score]);
  }

  return byDimension;
}
