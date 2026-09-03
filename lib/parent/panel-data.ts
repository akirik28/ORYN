import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getParentChildPanelState } from "@/lib/parent/child-panel";
import { getProfileScores } from "@/lib/security/dal";
import { toDimensionScoreRows, rankDimensionGaps } from "@/lib/counselor/gaps";
import { toProfileSignal } from "@/lib/scoring/signal";
import { computeDashboardHeroState } from "@/lib/scoring/dashboard-hero";
import { isOpportunityRecommendable } from "@/lib/opportunities/lifecycle";
import { competesInCoreRecommendations } from "@/lib/opportunities/commercial";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { OutlookLabel, ApplicationStatus } from "@/types/database";

export interface ParentPanelOpportunity {
  id: string;
  title: string;
  category: string;
  deadline: string | null;
}

export interface ParentPanelUniversity {
  id: string;
  name: string;
  outlook: OutlookLabel | null;
}

export interface ParentPanelApplication {
  id: string;
  universityName: string;
  status: ApplicationStatus;
  deadline: string | null;
}

/**
 * `kind` mirrors lib/scoring/dashboard-hero.ts's own three-state honesty model exactly (see
 * that file's header comment) -- a parent gets the identical "can this even be named yet"
 * judgment the student's own dashboard makes, not a separately-computed one that could
 * disagree. `label` is the dimension name ONLY, never a score: spec's explicit instruction
 * ("show the gap; don't make it a verdict on the child") is why this type has no numeric
 * field at all, not just why the UI happens not to render one.
 */
export interface ParentPanelGap {
  kind: "claimable" | "rich_unclaimable" | "empty";
  label: string | null;
}

export interface ParentPanelData {
  studentDisplayName: string;
  opportunities: ParentPanelOpportunity[];
  universities: ParentPanelUniversity[];
  applications: ParentPanelApplication[];
  gap: ParentPanelGap;
}

/**
 * Mirrors lib/parent/child-panel.ts's ParentChildPanelState states exactly (same names, same
 * discriminant) -- this is a thin enrichment of that type, not a parallel vocabulary. "active"
 * is the only state carrying data, for the same reason theirs is: there is no path through
 * this type from "I have data" to "I have no data" that skips a real, active-status link.
 */
export type ParentPanelResult = { state: "no_link" } | { state: "pending" } | { state: "revoked" } | { state: "active"; data: ParentPanelData };

async function fetchOpportunities(studentUserId: string): Promise<ParentPanelOpportunity[]> {
  const supabase = await createClient();
  // Two-step, not a nested join -- matches lib/opportunities/home-strip.ts's own established
  // pattern for this exact pair of tables (no PostgREST-discoverable relationship between
  // opportunity_matches and opportunities to join through directly). Direct table reads here
  // are correct, not a shortcut: opportunity_matches has its own real RLS policy (2026-09-04),
  // unlike profiles/target_universities/applications, which is exactly why those three go
  // through child-panel.ts's whitelisted RPCs instead of a query written here.
  const { data: matches } = await supabase
    .from("opportunity_matches")
    .select("opportunity_id, match_score")
    .eq("user_id", studentUserId)
    .eq("eligible", true)
    .order("match_score", { ascending: false })
    .limit(20);

  const opportunityIds = (matches ?? []).map((m) => m.opportunity_id);
  if (opportunityIds.length === 0) return [];

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, category, deadline, status, cycle_status, last_verified_at, verified_at, source_verified_at, cost, selectivity_tier")
    .in("id", opportunityIds);

  const byId = new Map((opportunities ?? []).map((o) => [o.id, o]));
  return opportunityIds
    .map((id) => byId.get(id))
    .filter((o): o is NonNullable<typeof o> => o != null)
    .filter((o) => isOpportunityRecommendable(o) && competesInCoreRecommendations(o))
    .slice(0, 5)
    .map((o) => ({ id: o.id, title: o.title, category: o.category, deadline: o.deadline }));
}

async function computeGap(studentUserId: string, locale: Locale): Promise<ParentPanelGap> {
  // profile_scores has its own direct RLS policy (2026-09-04) -- getProfileScores reads it
  // exactly as the student's own dashboard does, through the identical pipeline below, so a
  // parent gets the same honesty judgment, not a separately-computed one.
  const scores = await getProfileScores(studentUserId);
  const scoreRows = toDimensionScoreRows(scores);
  const biggestGap = rankDimensionGaps(scoreRows)[0] ?? null;
  const profileSignal = toProfileSignal(scores);
  const hero = computeDashboardHeroState(profileSignal, biggestGap ? { dimension: biggestGap.dimension, score: biggestGap.score } : null, locale);
  return { kind: hero.kind, label: hero.gapLabel };
}

/**
 * `get_parent_child_target_universities`/`_applications` (via getParentChildPanelState)
 * return bare FK uuids, never a joined name (44, 2026-09-04 -- corrected two wrong guesses
 * earlier in this file's history that assumed the join happened inside the function).
 * `universities` is the global public catalog, not per-student data, so reading it by `id`
 * needs no whitelist of its own -- the same access any authenticated context already has via
 * the university explorer. Applications need a second hop (target_university_id ->
 * target_universities.university_id -> universities.name); reading target_universities here
 * by its own primary key (already resolved as this function's input) is narrower than the
 * SELECT-by-owner the RPC exists to gate, so it doesn't need the whitelist either.
 */
async function enrichWithUniversityNames(
  targetUniversities: { id: string; university_id: string; outlook: OutlookLabel | null; updated_at: string }[],
  applications: { id: string; target_university_id: string; status: ApplicationStatus; deadline: string | null; updated_at: string }[]
): Promise<{ universities: ParentPanelUniversity[]; applications: ParentPanelApplication[] }> {
  const supabase = await createClient();

  const universityIdByTargetId = new Map(targetUniversities.map((t) => [t.id, t.university_id]));
  for (const targetId of applications.map((a) => a.target_university_id)) {
    if (!universityIdByTargetId.has(targetId)) universityIdByTargetId.set(targetId, null as unknown as string);
  }
  const unresolvedTargetIds = applications.map((a) => a.target_university_id).filter((id) => !universityIdByTargetId.get(id));

  if (unresolvedTargetIds.length > 0) {
    const { data: targets } = await supabase.from("target_universities").select("id, university_id").in("id", unresolvedTargetIds);
    for (const t of targets ?? []) universityIdByTargetId.set(t.id, t.university_id);
  }

  const allUniversityIds = [...new Set([...universityIdByTargetId.values()].filter((id): id is string => Boolean(id)))];
  const { data: universityRows } = allUniversityIds.length > 0 ? await supabase.from("universities").select("id, name").in("id", allUniversityIds) : { data: [] };
  const nameByUniversityId = new Map((universityRows ?? []).map((u) => [u.id, u.name]));

  const universities = targetUniversities
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((t) => ({ id: t.id, name: nameByUniversityId.get(t.university_id) ?? "", outlook: t.outlook }))
    .filter((u) => u.name !== "");

  const applicationRows = applications
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
    .map((a) => {
      const universityId = universityIdByTargetId.get(a.target_university_id);
      const name = universityId ? (nameByUniversityId.get(universityId) ?? "") : "";
      return { id: a.id, universityName: name, status: a.status, deadline: a.deadline };
    })
    .filter((a) => a.universityName !== "");

  return { universities, applications: applicationRows };
}

/**
 * The parent panel's one entry point. `getParentChildPanelState` (lib/parent/child-panel.ts)
 * owns the actual authorization-relevant question -- whether an active link exists at all --
 * and its type makes that unskippable; this function only enriches the "active" branch with
 * the two things child-panel.ts doesn't cover (university names, which need an extra join it
 * deliberately doesn't do, and opportunities/gap, which read different tables with their own
 * direct RLS policies rather than a profiles-style whitelist). This function must never grow
 * its own link-status logic -- that would be exactly the "two empty arrays collapse into one
 * screen" mistake child-panel.ts's type exists to make unreachable.
 */
export async function getParentPanelData(studentUserId: string, locale: Locale = DEFAULT_LOCALE): Promise<ParentPanelResult> {
  const state = await getParentChildPanelState(studentUserId);
  if (state.state !== "active") return { state: state.state };

  const [{ universities, applications }, opportunities, gap] = await Promise.all([
    enrichWithUniversityNames(state.targetUniversities, state.applications),
    fetchOpportunities(studentUserId),
    computeGap(studentUserId, locale),
  ]);

  return {
    state: "active",
    data: { studentDisplayName: state.profile?.display_name ?? "", opportunities, universities, applications, gap },
  };
}
