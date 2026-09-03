import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OutlookLabel, ApplicationStatus } from "@/types/database";
import { isUndefinedFunctionError, isUndefinedTableError } from "@/lib/supabase/errors";
import { getProfileScores } from "@/lib/security/dal";
import { toDimensionScoreRows, rankDimensionGaps } from "@/lib/counselor/gaps";
import { toProfileSignal } from "@/lib/scoring/signal";
import { computeDashboardHeroState } from "@/lib/scoring/dashboard-hero";
import { isOpportunityRecommendable } from "@/lib/opportunities/lifecycle";
import { competesInCoreRecommendations } from "@/lib/opportunities/commercial";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { ParentLink } from "./types";

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

export type ParentPanelResult =
  | { status: "no_row" } // no parent_links row for this parent at all
  | { status: "pending" } // link exists but hasn't been confirmed -- a4's routing owns showing the pending screen; this result exists so this function stays the single source of truth for panel state, per oryn-44/oryn-45 2026-09-04: never infer state from whether the data queries came back empty, since a revoked link and a brand-new student both legitimately return []
  | { status: "revoked" }
  | { status: "ready"; data: ParentPanelData };

/**
 * Reads the parent's own parent_links row(s) directly -- RLS auto-scopes to
 * `parent_user_id = auth.uid() or student_user_id = auth.uid()` (oryn-44, 2026-09-04), so
 * this is a parent reading exactly their own row, not a whitelist-worthy cross-account read.
 * The one field this function exists to produce, `student_user_id`, is also the `p_student`
 * argument every whitelisted RPC below requires.
 *
 * State comes from here, never from whether a data query returns rows: an inactive link and
 * a genuinely brand-new student both make get_parent_child_target_universities/
 * _applications return `[]`, which is the correct non-error response in both cases (oryn-44).
 * Checking `status` here first, before ever calling those functions, is what tells the two
 * apart.
 */
async function resolveLink(supabase: SupabaseClient<Database>): Promise<ParentLink | null> {
  const { data, error } = await supabase.from("parent_links" as never).select("*").order("updated_at" as never, { ascending: false }).limit(1).maybeSingle();

  if (error) {
    // Migration 0116 not applied yet resolves to the same "no_row" state a genuinely-absent
    // link produces -- not logged as an error, since this is an expected pre-migration state,
    // not a failure.
    if (isUndefinedTableError(error, "parent_links")) return null;
    console.error("[parent] failed to read parent_links", { error: error.message });
    return null;
  }
  return (data as unknown as ParentLink | null) ?? null;
}

/**
 * `profiles` reads for a parent go through a SECURITY DEFINER function with an explicit
 * 9-column whitelist (oryn-44/b9, 2026-09-04) -- `advisor_instructions` lives on this same
 * row, and RLS is row-level, so a parent granted SELECT on the row at all would receive the
 * student's private advisor instructions along with everything else. `.from("profiles")`
 * must never appear in this file for that reason; this function is the only door.
 *
 * `returns table` -- always an array, including the 0-or-1-row profile case (oryn-44) -- take
 * `[0]`, never unwrap as a single object.
 */
async function fetchStudentProfile(supabase: SupabaseClient<Database>, studentUserId: string): Promise<{ displayName: string } | null> {
  const { data, error } = await supabase.rpc("get_parent_child_profile" as never, { p_student: studentUserId } as never);
  if (error) {
    if (isUndefinedFunctionError(error, "get_parent_child_profile")) return null;
    console.error("[parent] failed to fetch child profile", { studentUserId, error: error.message });
    return null;
  }
  const row = ((data as unknown[]) ?? [])[0] as { display_name?: string } | undefined;
  return row ? { displayName: row.display_name ?? "" } : null;
}

async function fetchOpportunities(supabase: SupabaseClient<Database>, studentUserId: string): Promise<ParentPanelOpportunity[]> {
  // Two-step, not a nested join -- matches lib/opportunities/home-strip.ts's own established
  // pattern for this exact pair of tables (no PostgREST-discoverable relationship between
  // opportunity_matches and opportunities to join through directly). Direct table reads here
  // are correct, not a shortcut: opportunity_matches has its own real RLS policy (oryn-45,
  // 2026-09-04), unlike profiles/target_universities/applications.
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

/**
 * `get_parent_child_target_universities` returns `university_id`, never a `name` (oryn-44,
 * 2026-09-04 -- corrected an earlier wrong guess in this file that assumed the function
 * joined internally). `universities` is the global public catalog, not per-student data, so
 * it needs no whitelist of its own -- a direct read by `id` is the same access any
 * authenticated context already has via the university explorer.
 */
async function fetchUniversities(supabase: SupabaseClient<Database>, studentUserId: string): Promise<ParentPanelUniversity[]> {
  const { data, error } = await supabase.rpc("get_parent_child_target_universities" as never, { p_student: studentUserId } as never);
  if (error) {
    if (isUndefinedFunctionError(error, "get_parent_child_target_universities")) return [];
    console.error("[parent] failed to fetch child target universities", { studentUserId, error: error.message });
    return [];
  }
  const rows = ((data as unknown[]) ?? []) as { id: string; university_id: string; outlook: OutlookLabel | null; updated_at: string }[];
  if (rows.length === 0) return [];

  const { data: universities } = await supabase
    .from("universities")
    .select("id, name")
    .in(
      "id",
      rows.map((r) => r.university_id)
    );
  const nameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  return rows
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((r) => ({ id: r.id, name: nameById.get(r.university_id) ?? "", outlook: r.outlook }))
    .filter((u) => u.name !== "");
}

/**
 * `get_parent_child_applications` returns `target_university_id`, not a university name --
 * two hops to render one (oryn-44, 2026-09-04): target_university_id -> target_universities
 * .university_id -> universities.name. The middle hop reads target_universities by `id`
 * (its own primary key, already resolved as this function's input), not by `user_id`, so it
 * is not a second whitelist-worthy per-student query -- fetching known rows by id is a
 * narrower operation than the SELECT-by-owner the RPC exists to gate.
 */
async function fetchApplications(supabase: SupabaseClient<Database>, studentUserId: string): Promise<ParentPanelApplication[]> {
  const { data, error } = await supabase.rpc("get_parent_child_applications" as never, { p_student: studentUserId } as never);
  if (error) {
    if (isUndefinedFunctionError(error, "get_parent_child_applications")) return [];
    console.error("[parent] failed to fetch child applications", { studentUserId, error: error.message });
    return [];
  }
  const rows = ((data as unknown[]) ?? []) as { id: string; target_university_id: string; status: ApplicationStatus; deadline: string | null; updated_at: string }[];
  if (rows.length === 0) return [];

  const { data: targets } = await supabase
    .from("target_universities")
    .select("id, university_id")
    .in(
      "id",
      rows.map((r) => r.target_university_id)
    );
  const universityIdByTargetId = new Map((targets ?? []).map((t) => [t.id, t.university_id]));

  const universityIds = [...new Set([...universityIdByTargetId.values()])];
  const { data: universities } = await supabase.from("universities").select("id, name").in("id", universityIds);
  const nameByUniversityId = new Map((universities ?? []).map((u) => [u.id, u.name]));

  return rows
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
    .map((r) => {
      const universityId = universityIdByTargetId.get(r.target_university_id);
      const name = universityId ? (nameByUniversityId.get(universityId) ?? "") : "";
      return { id: r.id, universityName: name, status: r.status, deadline: r.deadline };
    })
    .filter((a) => a.universityName !== "");
}

async function computeGap(studentUserId: string, locale: Locale): Promise<ParentPanelGap> {
  // profile_scores has its own direct RLS policy (oryn-45, 2026-09-04) -- getProfileScores
  // reads it exactly as the student's own dashboard does, through the identical pipeline
  // below, so a parent gets the same honesty judgment, not a separately-computed one.
  const scores = await getProfileScores(studentUserId);
  const scoreRows = toDimensionScoreRows(scores);
  const biggestGap = rankDimensionGaps(scoreRows)[0] ?? null;
  const profileSignal = toProfileSignal(scores);
  const hero = computeDashboardHeroState(profileSignal, biggestGap ? { dimension: biggestGap.dimension, score: biggestGap.score } : null, locale);
  return { kind: hero.kind, label: hero.gapLabel };
}

/**
 * The parent panel's one entry point. `resolveLink` decides *state* -- pending/revoked/no_row
 * short-circuit before any whitelisted function is ever called, per oryn-44's explicit
 * correction: an empty data result and an inactive link both look like `[]`, so the link's
 * own `status` column, not the shape of what comes back from the data functions, is what
 * this must branch on. Every subsequent read is scoped to `link.student_user_id`, run
 * through the caller's own (parent's) session client -- RLS/SECURITY DEFINER whitelists
 * decide whether each read is actually allowed. This function adds no authorization logic of
 * its own beyond resolving which student to ask about; it is not, and must never become, the
 * thing that decides a parent may see a student's data.
 */
export async function getParentPanelData(supabase: SupabaseClient<Database>, locale: Locale = DEFAULT_LOCALE): Promise<ParentPanelResult> {
  const link = await resolveLink(supabase);
  if (!link) return { status: "no_row" };
  if (link.status === "revoked") return { status: "revoked" };
  if (link.status !== "active") return { status: "pending" };

  const studentUserId = link.student_user_id;
  const [profile, opportunities, universities, applications, gap] = await Promise.all([
    fetchStudentProfile(supabase, studentUserId),
    fetchOpportunities(supabase, studentUserId),
    fetchUniversities(supabase, studentUserId),
    fetchApplications(supabase, studentUserId),
    computeGap(studentUserId, locale),
  ]);

  return { status: "ready", data: { studentDisplayName: profile?.displayName ?? "", opportunities, universities, applications, gap } };
}
