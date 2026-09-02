import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity, OpportunityMatch, ProfileScore } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getProfileScores } from "@/lib/security/dal";
import { buildStudentAdvisorContext, type StudentAdvisorContext } from "@/lib/ai/student-context";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { getCompletenessChecklist } from "@/lib/scoring/completeness";
import { assembleRequirementFacts } from "@/lib/requirements/facts";
import { evaluateRequirement } from "@/lib/requirements/evaluate";
import { INFORMATIONAL_CATEGORIES } from "@/lib/requirements/types";
import { NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES } from "@/lib/requirements/ingest";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { ACTIVE_TARGET_STATUSES } from "@/lib/deadlines/upcoming";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { toDimensionScoreRows } from "./gaps";
import type { CounselorState, RequirementCandidateInput } from "./types";

/**
 * Requirement-driven candidates for one student's active target universities (see
 * candidates.ts's ACTIONABLE_REQUIREMENT_STATUSES for which evaluation statuses actually
 * become a candidate). Mirrors lib/deadlines/upcoming.ts's university-level-always/
 * program-level-only-if-targeted rule and lib/requirements/persist.ts's own
 * informational-category exclusion — reuses lib/requirements/evaluate.ts directly rather
 * than a second evaluation pass; does not write to student_requirement_evaluations (that
 * table backs the university detail page's own "Requirement Check" UI, a different write
 * path — Counselor Core only reads the evaluation logic, it doesn't own that cache).
 */
async function getRequirementCandidateInputs(
  supabase: SupabaseClient<Database>,
  userId: string,
  activeTargets: StudentAdvisorContext["targetUniversities"],
  locale: Locale
): Promise<RequirementCandidateInput[]> {
  if (activeTargets.length === 0) return [];

  const universityIds = [...new Set(activeTargets.map((t) => t.universityId))];
  const { data: requirements } = await supabase.from("university_requirements").select("*").in("university_id", universityIds);
  if (!requirements || requirements.length === 0) return [];

  // Never surface a candidate ("sit this test", "meet this grade") built from a requirement
  // a research pass has since confirmed closed or unresolved — mirrors
  // lib/requirements/persist.ts's own filter, same reasoning as lib/deadlines/upcoming.ts's.
  const current = requirements.filter((r) => !NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has(r.verification_state));
  const evaluable = current.filter((r) => !INFORMATIONAL_CATEGORIES.includes(r.requirement_type));
  if (evaluable.length === 0) return [];

  const programIdsByUniversity = new Map<string, Set<string | null>>();
  const nameByUniversityId = new Map<string, string>();
  for (const target of activeTargets) {
    nameByUniversityId.set(target.universityId, target.name);
    const set = programIdsByUniversity.get(target.universityId) ?? new Set<string | null>();
    set.add(target.programId);
    programIdsByUniversity.set(target.universityId, set);
  }

  const applicable = evaluable.filter((r) => {
    const targetedPrograms = programIdsByUniversity.get(r.university_id);
    if (!targetedPrograms) return false;
    return r.program_id === null || targetedPrograms.has(r.program_id);
  });
  if (applicable.length === 0) return [];

  const facts = await assembleRequirementFacts(supabase, userId);

  return applicable.map((requirement) => ({
    universityId: requirement.university_id,
    universityName: nameByUniversityId.get(requirement.university_id) ?? "University",
    requirement,
    // The row doubles as the qualifier source, `is_exclusion` included — see
    // lib/requirements/persist.ts.
    evaluation: evaluateRequirement(requirement.requirement_type, requirement.structured_rule, facts, requirement, locale),
  }));
}

/**
 * Counselor Core Phase I DB boundary (docs/counselor-core-plan.md §4/§11). Everything below
 * this function is pure (lib/counselor/{gaps,candidates,eligibility,scoring,evidence,
 * pipeline}.ts) — this is the only place Counselor Core touches Supabase.
 *
 * Known, deliberate inefficiency: this calls assembleScoringFacts directly (for the
 * completeness checklist) in addition to buildStudentAdvisorContext, which also calls it
 * internally — one duplicate round of ~10 lightweight parallel queries per Counselor page
 * load. Not pathological (bounded, not N+1 across any collection), but a real, documented
 * optimization opportunity for later rather than a correctness issue; avoided restructuring
 * buildStudentAdvisorContext's contract a second time in this pass to keep the change
 * additive (see lib/ai/student-context.ts's own Phase B extension).
 */
// Same reasoning and same caller as buildStudentAdvisorContext's identical parameter
// (lib/ai/student-context.ts) — defaults to the session-scoped client, overridden only by
// the scheduled weekly-plan job, which has no session of its own to default to.
export async function getCounselorState(userId: string, locale: Locale = DEFAULT_LOCALE, supabaseClient?: Awaited<ReturnType<typeof createClient>>): Promise<CounselorState> {
  const supabase = supabaseClient ?? (await createClient());

  // Recompute-on-read, same convention as the Opportunities/Dashboard pages already use --
  // including the one caller with no session of its own (the weekly-plan job path this
  // function's own header comment names), now that `supabase` -- this function's own
  // resolved client, session-scoped or the job's admin one -- is threaded through instead
  // of refreshOpportunityMatches silently building an anonymous client and finding
  // everything RLS-empty. FIXED 2026-09-02: found via docs/performance.md's
  // cache()-in-Route-Handler sweep, where this call was still unconditional and the
  // no-session path silently reported `{ refreshed: true }` having refreshed nothing --
  // full trace of the failure kept in refreshOpportunityMatches's own doc comment
  // (lib/opportunities/persist-matches.ts), not repeated here now that it's fixed rather
  // than merely flagged.
  await refreshOpportunityMatches(userId, locale, supabase);

  // Shared, cache()'d getProfileScores(userId) (docs/performance.md §2) only when this call
  // is request-scoped (no explicit supabaseClient) — the scheduled weekly-plan job
  // (lib/ai/weekly-plan.ts) passes its own client with no request/cookies behind it, so it
  // keeps its own direct query, unchanged.
  const scoresPromise: PromiseLike<{ data: ProfileScore[] | null }> = supabaseClient
    ? supabase.from("profile_scores").select("*").eq("user_id", userId)
    : getProfileScores(userId).then((data) => ({ data }));

  const [advisor, facts, profileRes, scoresRes, skillsRes, featuredRes, contactRes, matchesRes] = await Promise.all([
    // 2026-09-02, session-less-client sweep: this was `buildStudentAdvisorContext(userId)` —
    // no second argument — even though every OTHER read in this same Promise.all correctly
    // uses `supabase` (the resolved client, session-scoped or the job's own admin one).
    // buildStudentAdvisorContext already accepts an optional client (lib/ai/student-context.ts)
    // and generateWeeklyPlan already threads it into ITS OWN direct call to the same
    // function — this one, reached one level deeper via getCounselorRecommendations, was
    // the one call site that fell through to its own internal createClient() instead. In
    // the weekly-plan job's context that's an anonymous, no-cookie client: every RLS read
    // inside it returns empty rather than throwing, so `advisor` here was silently a
    // near-empty context (see student-context.ts and lib/supabase/server.ts's own comments
    // for why "no session" degrades to empty results, not an error) — not a wasted AI call,
    // since the actual billed call happens once, correctly, in generateWeeklyPlan itself,
    // but a systematically degraded prompt (wrong/missing counselor grounding) for every
    // job-generated plan specifically, never for a dashboard-visit-triggered one.
    buildStudentAdvisorContext(userId, supabaseClient),
    assembleScoringFacts(supabase, userId),
    supabase.from("profiles").select("country, school_name, graduation_year, curriculum, headline, about").eq("id", userId).single(),
    scoresPromise,
    supabase.from("skills").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("featured_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    // Legitimate completeness-only use of contact_info, same as lib/scoring/persist.ts's
    // recomputeCareerProfile — a boolean derived from it, values never passed onward.
    supabase
      .from("contact_info")
      .select("phone, email, linkedin_url, instagram_handle, github_url, website_url, twitter_handle, discord_handle")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("opportunity_matches").select("*").eq("user_id", userId).eq("eligible", true),
  ]);

  const contact = contactRes.data;
  const hasContactInfo = Boolean(
    contact &&
      (contact.phone ||
        contact.email ||
        contact.linkedin_url ||
        contact.instagram_handle ||
        contact.github_url ||
        contact.website_url ||
        contact.twitter_handle ||
        contact.discord_handle)
  );

  const completenessChecklist = getCompletenessChecklist({
    ...facts,
    profile: profileRes.data ?? { country: null, school_name: null, graduation_year: null, curriculum: null, headline: null, about: null },
    skillCount: skillsRes.count ?? 0,
    featuredCount: featuredRes.count ?? 0,
    hasContactInfo,
  });

  const matches: OpportunityMatch[] = matchesRes.data ?? [];
  const opportunityIds = [...new Set(matches.map((m) => m.opportunity_id))];
  // `status` must be re-checked here, not only `verification_state`. refreshOpportunityMatches
  // recomputes over `status = 'active'` rows only (persist-matches.ts) but never deletes match
  // rows for an opportunity that has since left active, so an `eligible = true` row outlives the
  // moderation decision that was supposed to retire it. Counselor Core is the third reader of
  // opportunity_matches and the only one that lacked the defensive re-filter persist-matches.ts
  // documents; without this, pulling a record to `under_review` silently fails to stop it being
  // recommended (live 2026-08-23: Wharton Hack-AI-thon, under_review + verified_current, still
  // matched eligible for all 7 users).
  const { data: opportunities } =
    opportunityIds.length > 0
      ? await supabase
          .from("opportunities")
          .select("*")
          .in("id", opportunityIds)
          .eq("status", "active")
          .eq("verification_state", "verified_current")
      : { data: [] as Opportunity[] };
  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));

  const eligibleOpportunityMatches = matches
    .map((match) => ({ match, opportunity: opportunityById.get(match.opportunity_id) }))
    .filter((entry): entry is { match: OpportunityMatch; opportunity: Opportunity } => entry.opportunity !== undefined);

  // StudentAdvisorContext's targetUniversities.status is typed as plain string (it's only
  // ever interpolated into prompt text there) — narrowed here since target_universities.status
  // is enum-backed at the DB level, so this reflects real data, not an assumption.
  const activeStatuses: readonly string[] = ACTIVE_TARGET_STATUSES;
  const activeTargets = advisor.targetUniversities.filter((t) => activeStatuses.includes(t.status));
  const requirementCandidateInputs = await getRequirementCandidateInputs(supabase, userId, activeTargets, locale);

  return {
    userId,
    advisor,
    dimensionScores: toDimensionScoreRows(scoresRes.data ?? []),
    completenessChecklist,
    eligibleOpportunityMatches,
    requirementCandidateInputs,
  };
}
