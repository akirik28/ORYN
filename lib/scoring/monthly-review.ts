import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileDimension } from "@/types/database";
import { toProfileSignal, type DimensionSignal } from "./signal";
import { CAREER_PROFILE_SCORE_VERSION } from "./types";

const REVIEW_WINDOW_DAYS = 30;

export interface DimensionDelta {
  dimension: ProfileDimension;
  before: number;
  after: number;
  delta: number;
}

export interface MonthlyReview {
  hasHistory: boolean;
  windowDays: number;
  /**
   * The aggregate, kept for internal consumers (trend logic, snapshots, ranking). It is
   * deliberately not rendered to students any more — see lib/scoring/change.ts.
   */
  overallBefore: number | null;
  overallAfter: number | null;
  overallDelta: number | null;
  dimensionDeltas: DimensionDelta[];
  /** Current qualitative read, so Progress can name strengths and the next area to work on. */
  signal: DimensionSignal[];
  projectsCompletedRecently: number;
  applicationsSubmittedRecently: number;
}

/**
 * Phase 40 — Monthly Review. Deterministic, not AI-generated: score deltas are numbers
 * already computed by the scoring engine, and narrating "why" from real deltas doesn't
 * need a model call (Phase 27 — don't spend AI budget where plain arithmetic answers the
 * question). "Completed recently" is a proxy (row last touched in the window), not a
 * precise completion timestamp neither table stores — worded in the UI to stay honest
 * about that rather than implying more precision than the data actually has.
 */
export async function getMonthlyReview(supabase: SupabaseClient<Database>, userId: string): Promise<MonthlyReview> {
  const since = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [scoresRes, baselineSnapshotRes, projectsRes, applicationsRes] = await Promise.all([
    supabase.from("profile_scores").select("dimension, score, confidence, reason_codes").eq("user_id", userId).eq("calculation_version", CAREER_PROFILE_SCORE_VERSION),
    supabase
      .from("profile_score_snapshots")
      .select("overall_score, dimension_scores, created_at")
      .eq("user_id", userId)
      .lte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("ongoing", false).gte("updated_at", since),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["submitted", "under_review", "accepted", "waitlisted", "rejected"]).gte("updated_at", since),
  ]);

  const currentScores = scoresRes.data ?? [];
  const overallAfter = currentScores.length > 0 ? Math.round(currentScores.reduce((sum, s) => sum + s.score, 0) / currentScores.length) : null;

  const signal = toProfileSignal(currentScores);

  const baseline = baselineSnapshotRes.data;
  if (!baseline) {
    return {
      hasHistory: false,
      windowDays: REVIEW_WINDOW_DAYS,
      overallBefore: null,
      overallAfter,
      overallDelta: null,
      dimensionDeltas: [],
      signal,
      projectsCompletedRecently: projectsRes.count ?? 0,
      applicationsSubmittedRecently: applicationsRes.count ?? 0,
    };
  }

  const beforeDimensions = baseline.dimension_scores;
  const dimensionDeltas: DimensionDelta[] = currentScores
    .map((s) => {
      const before = beforeDimensions[s.dimension];
      if (before === undefined) return null;
      return { dimension: s.dimension, before, after: s.score, delta: s.score - before };
    })
    .filter((d): d is DimensionDelta => d !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    hasHistory: true,
    windowDays: REVIEW_WINDOW_DAYS,
    overallBefore: baseline.overall_score,
    overallAfter,
    overallDelta: overallAfter !== null ? overallAfter - baseline.overall_score : null,
    dimensionDeltas,
    signal,
    projectsCompletedRecently: projectsRes.count ?? 0,
    applicationsSubmittedRecently: applicationsRes.count ?? 0,
  };
}
