import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { canonicalUniversityId, loadSupersessionMap, type SupersessionMap } from "@/lib/universities/canonical";
import { NON_ACTIONABLE_VERIFICATION_STATES } from "@/lib/deadlines/ingest";
import { filterActionableOpportunities } from "@/lib/opportunities/lifecycle";

export type DeadlineSource = "application" | "opportunity" | "university";

export interface UpcomingDeadline {
  id: string;
  source: DeadlineSource;
  title: string;
  date: string;
  href: string;
}

const ACTIVE_APPLICATION_STATUSES = ["not_started", "in_progress", "submitted", "under_review"] as const;
/** Exported for lib/counselor/state.ts to reuse — one definition of "an active target",
 * not a second copy of the same business rule. */
export const ACTIVE_TARGET_STATUSES = ["exploring", "target", "applying"] as const;

async function getUpcomingApplicationDeadlines(supabase: SupabaseClient<Database>, userId: string, today: string, supersessionMap: SupersessionMap): Promise<UpcomingDeadline[]> {
  const { data: applications } = await supabase
    .from("applications")
    .select("id, deadline, target_university_id")
    .eq("user_id", userId)
    .not("deadline", "is", null)
    .gte("deadline", today)
    .in("status", ACTIVE_APPLICATION_STATUSES);
  if (!applications || applications.length === 0) return [];

  const targetIds = [...new Set(applications.map((a) => a.target_university_id))];
  const { data: targets } = targetIds.length
    ? await supabase.from("target_universities").select("id, university_id").in("id", targetIds)
    : { data: [] };
  // Canonicalized — see lib/universities/canonical.ts.
  const universityIdByTarget = new Map((targets ?? []).map((t) => [t.id, canonicalUniversityId(supersessionMap, t.university_id)]));

  const universityIds = [...new Set(universityIdByTarget.values())];
  const { data: universities } = universityIds.length
    ? await supabase.from("universities").select("id, name").in("id", universityIds)
    : { data: [] };
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));

  return applications.map((application) => {
    const universityId = universityIdByTarget.get(application.target_university_id);
    const name = universityId ? universityNameById.get(universityId) : null;
    return {
      id: `application-${application.id}`,
      source: "application" as const,
      title: name ? `${name} application` : "Application",
      date: application.deadline!,
      href: `/applications/${application.id}`,
    };
  });
}

/** Exported (only) so __tests__/deadlines/upcoming.test.ts can pin and verify its
 * cycle_status filtering directly, without also mocking the application/university
 * sources getUpcomingDeadlines fans out to. No behavior change. */
export async function getUpcomingOpportunityDeadlines(supabase: SupabaseClient<Database>, userId: string, today: string): Promise<UpcomingDeadline[]> {
  const { data: saved } = await supabase.from("saved_opportunities").select("opportunity_id").eq("user_id", userId).eq("status", "saved");
  if (!saved || saved.length === 0) return [];

  const opportunityIds = [...new Set(saved.map((s) => s.opportunity_id))];
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, deadline, cycle_status")
    .in("id", opportunityIds)
    .not("deadline", "is", null)
    .gte("deadline", today);

  // A closed/historical/discontinued cycle must never surface as "due soon" even with a
  // future-dated deadline on file — the same guard the dashboard's opportunity-match
  // preview already applies (see lib/opportunities/lifecycle.ts's module comment).
  // Deliberately leaves 'unverified' visible: unconfirmed is not the same claim as wrong.
  return filterActionableOpportunities(opportunities ?? []).map((opportunity) => ({
    id: `opportunity-${opportunity.id}`,
    source: "opportunity" as const,
    title: opportunity.title,
    date: opportunity.deadline!,
    href: "/opportunities",
  }));
}

/** `deadline_type` is a coarse category ("scholarship", "application") shared by every cycle
 * of the same kind at a university — e.g. Yale carries four "scholarship"-typed rows (Early
 * Action for US/PR citizens, Early Action for international citizens, Regular Decision,
 * Transfer) that are only distinguishable by the field actually holding that distinction.
 * `cycle_label` is the structured cycle name where research populated one; it still collides
 * for the two Early Action rows above (both "Single-Choice Early Action" — the citizenship
 * split isn't a distinct cycle). `deadline_text_verbatim` is the one field guaranteed to carry
 * whatever actually differs, because it's the source's own wording rather than a normalized
 * category — prefer it, falling back only when it's null (both fields are nullable). */
export function deadlineDetailLabel(deadline: { deadline_text_verbatim: string | null; cycle_label: string | null; deadline_type: string }): string {
  return deadline.deadline_text_verbatim ?? deadline.cycle_label ?? deadline.deadline_type;
}

async function getUpcomingUniversityDeadlines(supabase: SupabaseClient<Database>, userId: string, today: string, supersessionMap: SupersessionMap): Promise<UpcomingDeadline[]> {
  const { data: targets } = await supabase
    .from("target_universities")
    .select("university_id, program_id")
    .eq("user_id", userId)
    .in("status", ACTIVE_TARGET_STATUSES);
  if (!targets || targets.length === 0) return [];

  // Canonicalized — see lib/universities/canonical.ts.
  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const [{ data: deadlines }, { data: universities }] = await Promise.all([
    supabase
      .from("university_deadlines")
      .select("id, university_id, program_id, deadline_type, deadline_date, verification_state, cycle_label, deadline_text_verbatim")
      .in("university_id", universityIds)
      .not("deadline_date", "is", null)
      .gte("deadline_date", today),
    supabase.from("universities").select("id, name").in("id", universityIds),
  ]);
  const universityNameById = new Map((universities ?? []).map((u) => [u.id, u.name]));
  const programIdsByUniversity = new Map<string, Set<string | null>>();
  for (const target of targets) {
    const canonicalId = canonicalUniversityId(supersessionMap, target.university_id);
    const set = programIdsByUniversity.get(canonicalId) ?? new Set<string | null>();
    set.add(target.program_id);
    programIdsByUniversity.set(canonicalId, set);
  }

  const result: UpcomingDeadline[] = [];
  for (const deadline of deadlines ?? []) {
    // VERIFIED_HISTORICAL (and the other non-actionable states) can land in the table since
    // migration 0056 — a real, correctly-sourced date for a cycle that has already closed must
    // never surface here as if it were live. See NON_ACTIONABLE_VERIFICATION_STATES.
    if (NON_ACTIONABLE_VERIFICATION_STATES.has(deadline.verification_state)) continue;
    // A university-level deadline (program_id null) always applies; a program-specific
    // one only applies once the student has actually targeted that exact program.
    const targetedPrograms = programIdsByUniversity.get(deadline.university_id);
    if (!targetedPrograms) continue;
    if (deadline.program_id !== null && !targetedPrograms.has(deadline.program_id)) continue;

    const name = universityNameById.get(deadline.university_id) ?? "University";
    result.push({
      id: `university-${deadline.id}`,
      source: "university",
      title: `${name} — ${deadlineDetailLabel(deadline)}`,
      date: deadline.deadline_date!,
      href: `/universities/${deadline.university_id}`,
    });
  }
  return result;
}

/** "Due soon" feed (Phase 23) — the cross-source Deadline Engine: merges application,
 * saved-opportunity, and target-university-program deadlines into one sorted feed. Mirrors
 * the three sources lib/deadlines/scan.ts notifies on, so what a student sees here lines up
 * with what they get reminded about. */
export async function getUpcomingDeadlines(supabase: SupabaseClient<Database>, userId: string, limit = 5): Promise<UpcomingDeadline[]> {
  const today = new Date().toISOString().slice(0, 10);
  // Loaded once and threaded into the two functions below that need it — both run inside the
  // same Promise.all, so a single upfront load also avoids a redundant round trip. See
  // lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);

  const [applications, opportunities, universities] = await Promise.all([
    getUpcomingApplicationDeadlines(supabase, userId, today, supersessionMap),
    getUpcomingOpportunityDeadlines(supabase, userId, today),
    getUpcomingUniversityDeadlines(supabase, userId, today, supersessionMap),
  ]);

  return [...applications, ...opportunities, ...universities].sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
