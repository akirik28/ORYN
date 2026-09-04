import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, University, UniversityRequirement, UniversityStatistic, UniversityDeadline, UniversityRanking, OutlookLabel } from "@/types/database";
import { getUniversity, getUniversityRequirements, getUniversityStatistics } from "@/lib/universities/detail-reads";
import { isUndefinedFunctionError } from "@/lib/supabase/errors";

/**
 * B6 (2026-09-04) — the parent-safe university detail page's data, and only its data.
 *
 * Deliberately does NOT import anything from lib/admissions/persist.ts or
 * lib/admissions/outlook.ts. The student's own /universities/[id] page computes and WRITES
 * an admission outlook keyed to whoever is viewing it (refreshAdmissionOutlook) — sending a
 * parent through that path would either compute nonsense against the parent's own (nonexistent)
 * profile, or, worse, write a row under the parent's own account. This module reads the
 * CHILD's own already-computed outlook instead, through the one channel CEO named as
 * allowed for child-specific data: the get_parent_child_* whitelist RPCs (migration 0116),
 * which are SECURITY DEFINER and independently re-check `is_active_parent_of` server-side —
 * this file adds no authorization logic of its own, it trusts that gate.
 *
 * `getUniversity`/`getUniversityStatistics`/`getUniversityRequirements`
 * (lib/universities/detail-reads.ts) are reused as-is, matching B3c's own precedent
 * (UniversityCatalogBrowser reusing loadUniversityBrowsePage rather than writing a parallel
 * query): all three are plain `select("*")` reads with no per-student personalization and no
 * write path in their own bodies. The remaining reads here (deadlines, rankings, tuition,
 * sources, the RPC) take an explicit `supabase` client rather than each constructing its own
 * — not for caching (there's only one caller), but so a test can inject a client that proves
 * nothing here ever issues an update/insert/upsert/delete, the same shape
 * refreshAdmissionOutlook's own optional `client` parameter exists for
 * (__tests__/admissions/persist-confidence-gate.test.ts).
 */

export interface ParentSafeChildOutlook {
  status: string;
  outlook: OutlookLabel | null;
  estimateRangeLow: number | null;
  estimateRangeHigh: number | null;
  estimateConfidence: string | null;
}

export interface ParentSafeUniversityDetail {
  university: University;
  stats: UniversityStatistic | null;
  requirements: UniversityRequirement[];
  deadlines: Pick<UniversityDeadline, "id" | "deadline_type" | "deadline_date" | "recurrence" | "recurrence_month" | "recurrence_day" | "cycle_label" | "verification_state" | "binding_policy">[];
  rankings: Pick<UniversityRanking, "ranking_provider" | "ranking_edition" | "rank_display">[];
  tuition: { internationalAmount: number | null; internationalUnit: string | null; internationalPrecisionState: string | null; statsAsOf: string | null };
  sourceCount: number;
  /** Non-null exactly when the child has this university on their own target list — read
   * from get_parent_child_target_universities, never recomputed. Null means "not targeted,"
   * not "unknown": the RPC degrades to an empty result set for a link this parent doesn't
   * hold, same as every other get_parent_child_* caller in lib/parent/child-panel.ts. */
  childOutlook: ParentSafeChildOutlook | null;
}

interface TargetUniversityRpcRow {
  id: string;
  university_id: string;
  program_id: string | null;
  status: string;
  academic_fit_score: number | null;
  profile_fit_score: number | null;
  outlook: OutlookLabel | null;
  estimate_range_low: number | null;
  estimate_range_high: number | null;
  outlook_confidence: string | null;
  created_at: string;
  updated_at: string;
}

export async function loadParentSafeUniversityDetail(
  supabase: SupabaseClient<Database>,
  universityId: string,
  studentUserId: string
): Promise<ParentSafeUniversityDetail | null> {
  const [university, stats, requirements, deadlinesRes, rankingsRes, metricsRes, sourcesRes, targetsRes] = await Promise.all([
    getUniversity(universityId),
    getUniversityStatistics(universityId),
    getUniversityRequirements(universityId),
    supabase
      .from("university_deadlines")
      .select("id, deadline_type, deadline_date, recurrence, recurrence_month, recurrence_day, cycle_label, verification_state, binding_policy")
      .eq("university_id", universityId),
    supabase.from("university_rankings").select("ranking_provider, ranking_edition, rank_display").eq("university_id", universityId).order("ranking_provider"),
    supabase
      .from("university_profile_metrics")
      .select("metric_code, value_numeric, unit, stats_as_of, precision_state")
      .eq("university_id", universityId)
      .eq("metric_code", "tuition_international_annual"),
    supabase.from("university_sources").select("id", { count: "exact", head: true }).eq("university_id", universityId),
    supabase.rpc("get_parent_child_target_universities", { p_student: studentUserId }),
  ]);

  if (!university) return null;

  const intl = metricsRes.data?.[0] ?? null;

  let childOutlook: ParentSafeChildOutlook | null = null;
  if (targetsRes.error) {
    if (!isUndefinedFunctionError(targetsRes.error, "get_parent_child_target_universities")) {
      console.error("[parent/university-detail] get_parent_child_target_universities failed", { studentUserId, error: targetsRes.error });
    }
  } else {
    const rows = (targetsRes.data ?? []) as TargetUniversityRpcRow[];
    const match = rows.find((r) => r.university_id === universityId);
    if (match) {
      childOutlook = {
        status: match.status,
        outlook: match.outlook,
        estimateRangeLow: match.estimate_range_low,
        estimateRangeHigh: match.estimate_range_high,
        estimateConfidence: match.outlook_confidence,
      };
    }
  }

  return {
    university,
    stats,
    requirements,
    deadlines: deadlinesRes.data ?? [],
    rankings: rankingsRes.data ?? [],
    tuition: {
      internationalAmount: intl?.value_numeric ?? null,
      internationalUnit: intl?.unit ?? null,
      internationalPrecisionState: intl?.precision_state ?? null,
      statsAsOf: intl?.stats_as_of ?? null,
    },
    sourceCount: sourcesRes.count ?? 0,
    childOutlook,
  };
}
