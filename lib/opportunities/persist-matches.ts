import "server-only";

import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { computeOpportunityMatch, isNearStudent } from "./matching";
import type { StudentMatchProfile, OpportunityForMatching } from "./matching";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { filterActionableOpportunities } from "./lifecycle";

/**
 * Recomputes and upserts opportunity_matches for one student against every active
 * opportunity. Cheap (pure deterministic math, no AI call) — safe to run on every
 * /opportunities page view, unlike weekly-plan generation.
 *
 * Every READ below stays on `supabase`, the caller's own RLS-scoped client. Only the
 * final `opportunity_matches` upsert uses `admin` (added 2026-08-22, migration 0063,
 * BUG-1's RLS verification package) — that write is fully computed by
 * `computeOpportunityMatch` above before either client is touched, so this changes which
 * connection carries the result, not what the student can see. Paired with a guard
 * trigger on `eligible`/`match_score`/etc: before this change, a student's own RLS-scoped
 * client could upsert this table directly, including setting `eligible = true` on a
 * restricted opportunity with no relation to what this function actually computed.
 *
 * FIXED 2026-08-22 (regression this same package introduced, caught by ORYN-CEO before
 * it reached any real user): `createAdminClient()` throws *synchronously* when
 * `SUPABASE_SECRET_KEY` is unset, and this function is `await`ed, unguarded, from four
 * page render paths (dashboard, /opportunities, /opportunities/[id], and the
 * requirements-evaluation sibling in lib/requirements/persist.ts from
 * /universities/[id]). Before this fix, an unconfigured secret key turned "opportunity
 * matches don't refresh" into "the whole page 500s" -- a strictly worse failure for the
 * student than stale-but-present match data, and inconsistent with this app's own
 * established convention (the dashboard's Counselor Core call, immediately below this
 * function's call sites, is deliberately isolated for exactly this reason: "an
 * unexpected failure ... must never take down the rest of the dashboard"). Now uses
 * `tryCreateAdminClient()` (lib/supabase/admin.ts -- already existed, already documented
 * as the fix for this exact failure mode, found live-testing a different set of pages
 * that had the same problem before this package ever started) and returns early with a
 * loud server-side log, never a thrown error, if the admin client isn't configured.
 * `provider_health` was considered and rejected for that log: its own recording
 * functions call `createAdminClient()` internally, so using it here to report "the admin
 * client is unavailable" would itself throw -- circular. A structured console log is the
 * honest, currently-available signal.
 *
 * Returns `{ refreshed: boolean }` (added in the same fix) so callers can tell the
 * student the truth per AGENTS.md Phase 45's own idiom ("We couldn't refresh X... the
 * last verified data is still shown below") instead of presenting stale matches as
 * current -- silently skipping the write with no visible signal would itself violate
 * Rule 4 (never let production functionality silently return stale data as if it were
 * fresh). `refreshed: false` means specifically "the admin client was unavailable, any
 * existing rows may predate this render" -- NOT "zero matches exist," which is a
 * legitimate, non-stale outcome (opportunities.length === 0 below) and reports
 * `refreshed: true`, since nothing was skipped, there was just nothing to compute.
 */
export async function refreshOpportunityMatches(userId: string): Promise<{ refreshed: boolean }> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[opportunity-matches] SUPABASE_SECRET_KEY not configured — skipping match refresh, page will render with existing (possibly stale) matches");
    return { refreshed: false };
  }
  const supabase = await createClient();

  const [profileRes, scoresRes, interestsRes, opportunitiesRes, savedRes] = await Promise.all([
    // select("*"), not an explicit column list: an explicit list naming citizenship_countries
    // (migration 0047, not applied on every environment) makes PostgREST reject the WHOLE
    // query (42703 "column does not exist"), silently degrading every other profile field
    // here to its fallback too -- confirmed live against this environment's DB. Same fix as
    // 08ddf0f applied to lib/ai/student-context.ts for the identical failure mode.
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("profile_scores").select("dimension, score, confidence, reason_codes").eq("user_id", userId),
    supabase.from("student_interests").select("label").eq("user_id", userId),
    // select("*") for the same reason as above -- eligible_citizenships is migration 0047.
    supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active"),
    // Counselor Core fix: an opportunity the student already applied to or explicitly
    // dismissed must never resurface as a fresh recommendation — see computeEligibility's
    // savedStatus parameter (lib/opportunities/matching.ts).
    supabase.from("saved_opportunities").select("opportunity_id, status").eq("user_id", userId),
  ]);

  const savedStatusByOpportunityId = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  // A cycle that has closed (or a deadline that has simply passed with no newer one on
  // file — see lifecycle.ts) must stop producing fresh matches, even though `status` stays
  // `active` for these rows (a real, correctly-sourced record, not a bad one). This does not
  // clean up matches computed before a cycle closed; see the defensive re-filter in every
  // surface that reads opportunity_matches back (ForYouView, dashboard preview).
  const opportunities = filterActionableOpportunities(opportunitiesRes.data ?? []);
  if (opportunities.length === 0) return { refreshed: true };

  const currentYear = new Date().getFullYear();
  const age = profileRes.data?.birth_year ? currentYear - profileRes.data.birth_year : null;

  // Counselor Core Phase D — see app/(app)/dashboard/page.tsx's identical usage.
  const weakestDimensions = rankDimensionGaps(toDimensionScoreRows(scoresRes.data ?? []))
    .slice(0, 3)
    .map((g) => g.dimension);

  const studentProfile: StudentMatchProfile = {
    age,
    country: profileRes.data?.country ?? null,
    interests: (interestsRes.data ?? []).map((i) => i.label),
    weakestDimensions,
    citizenshipCountries: profileRes.data?.citizenship_countries ?? [],
    graduationYear: profileRes.data?.graduation_year ?? null,
  };

  const rows = opportunities.map((opportunity) => {
    const forMatching: OpportunityForMatching = {
      category: opportunity.category,
      minimumAge: opportunity.minimum_age,
      maximumAge: opportunity.maximum_age,
      eligibleCountries: opportunity.eligible_countries,
      eligibleCitizenships: opportunity.eligible_citizenships ?? [],
      eligibleGrades: opportunity.eligible_grades ?? [],
      // ?? false: migration 0060 may not be applied on this environment yet — an absent
      // column means "not confirmed open," which is also the honest live default.
      countryEligibilityConfirmedOpen: opportunity.country_eligibility_confirmed_open ?? false,
      // Restriction prose suppresses the "not verified yet" note — the row WAS researched
      // and its restriction evidence is already surfaced (counselor advisory notes, the
      // opportunity detail page's Eligibility notes section).
      hasUnstructuredEligibilityEvidence: Boolean(opportunity.citizenship_restrictions || opportunity.residency_restrictions),
      fields: opportunity.fields,
      country: opportunity.country,
    };
    const match = computeOpportunityMatch(studentProfile, forMatching, savedStatusByOpportunityId.get(opportunity.id) ?? null);

    return {
      user_id: userId,
      opportunity_id: opportunity.id,
      eligible: match.eligible,
      eligibility_notes: match.eligibilityNotes,
      relevance_score: match.relevanceScore,
      profile_need_score: match.profileNeedScore,
      match_score: match.matchScore,
      effort_estimate: null,
      reason_codes: buildReasonCodes(match, studentProfile, forMatching),
      calculated_at: new Date().toISOString(),
    };
  });

  await admin.from("opportunity_matches").upsert(rows, { onConflict: "user_id,opportunity_id" });
  return { refreshed: true };
}

function buildReasonCodes(
  match: ReturnType<typeof computeOpportunityMatch>,
  student: StudentMatchProfile,
  opportunity: OpportunityForMatching
): string[] {
  const codes: string[] = [];
  if (!match.eligible) codes.push("ineligible");
  if (match.relevanceScore >= 70) codes.push("matches_your_interests");
  if (match.profileNeedScore >= 70) codes.push("addresses_a_current_gap");
  if (isNearStudent(student, opportunity)) codes.push("near_you");
  return codes;
}
