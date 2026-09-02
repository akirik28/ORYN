import "server-only";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getProfileScores } from "@/lib/security/dal";
import { computeOpportunityMatch, isNearStudent } from "./matching";
import type { StudentMatchProfile, OpportunityForMatching } from "./matching";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { filterActionableOpportunities } from "./lifecycle";
import { createNotification } from "@/lib/notifications/create";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/** Notify about at most this many newly-eligible matches per refresh — same "don't
 * overwhelm" ceiling AGENTS.md Phase 7 already applies to the dashboard's own "3
 * highest-impact actions," reused here so a profile edit that newly qualifies a student
 * for a dozen opportunities at once can't produce a dozen notifications in one render. */
const MAX_NEW_MATCH_NOTIFICATIONS_PER_REFRESH = 3;

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
export async function refreshOpportunityMatches(userId: string, locale: Locale = DEFAULT_LOCALE): Promise<{ refreshed: boolean }> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[opportunity-matches] SUPABASE_SECRET_KEY not configured — skipping match refresh, page will render with existing (possibly stale) matches");
    return { refreshed: false };
  }
  const supabase = await createClient();

  const [profileRes, scoresRes, interestsRes, opportunitiesRes, savedRes, previousMatchesRes] = await Promise.all([
    // select("*"), not an explicit column list: an explicit list naming citizenship_countries
    // (migration 0047, not applied on every environment) makes PostgREST reject the WHOLE
    // query (42703 "column does not exist"), silently degrading every other profile field
    // here to its fallback too -- confirmed live against this environment's DB. Same fix as
    // 08ddf0f applied to lib/ai/student-context.ts for the identical failure mode.
    supabase.from("profiles").select("*").eq("id", userId).single(),
    // Shared, cache()'d — docs/performance.md §2. Every real caller of this function (the
    // opportunities pages, the dashboard, getCounselorState) runs inside a real user
    // request, so unlike refreshAdmissionOutlook/getCounselorState there's no
    // background-job client to special-case here.
    getProfileScores(userId).then((data) => ({ data })),
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
    // Read before this call's own upsert overwrites it -- the only way to tell "newly
    // eligible this render" from "already eligible last render too." An empty result here
    // is itself meaningful: it means this student has never had matches computed before,
    // so there is no baseline to diff against (see the notification block below, which
    // treats that case as "skip notifying" rather than "everything is new").
    supabase.from("opportunity_matches").select("opportunity_id, eligible").eq("user_id", userId),
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
      // Package 8 fix: previously reduced to a boolean here (only used to suppress the
      // "not verified yet" note, never to say what the prose actually says). Passing the
      // raw text lets computeEligibility surface the same restriction note
      // lib/counselor/eligibility.ts already does, in the same words.
      citizenshipRestrictions: opportunity.citizenship_restrictions,
      residencyRestrictions: opportunity.residency_restrictions,
      fields: opportunity.fields,
      country: opportunity.country,
    };
    const match = computeOpportunityMatch(studentProfile, forMatching, savedStatusByOpportunityId.get(opportunity.id) ?? null, locale);

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
  await notifyNewlyEligibleMatches(supabase, userId, profileRes.data?.preferred_language, rows, opportunities, previousMatchesRes.data);
  return { refreshed: true };
}

/**
 * Phase 24's `new_opportunity` category, wired up for the first time — previously declared
 * in `NotificationCategory` with no writer anywhere (see
 * docs/handoffs/notification-categories-audit-2026-09-01.md). Deliberately its own function
 * rather than inlined into the upsert above: the diff against `previousMatches` is the whole
 * point and reads better named. Exported (only) so
 * __tests__/opportunities/notify-newly-eligible-matches.test.ts can pin it directly against
 * plain fixtures, the same shape lib/deadlines/scan.ts's notifyIfThresholdCrossed already
 * uses — testing the full refreshOpportunityMatches flow end to end would mean mocking
 * seven-plus table reads and the real matching engine just to reach this. No behavior change.
 *
 * "Newly eligible" is the bar, not merely "eligible" — this function runs from every
 * `refreshOpportunityMatches` call (dashboard, /opportunities, /opportunities/[id], all on
 * every render), so notifying on "still eligible, same as last render" would produce the
 * exact notification storm this project already found and fixed once for weekly_plan (100
 * identical rows for one account). An admin client isn't needed here — `createNotification`
 * already opens its own admin connection internally (no insert policy exists for this table
 * at all, not even a scoped one), so both reads below stay on the caller's own RLS-scoped
 * client, same as every other read in `refreshOpportunityMatches`.
 */
export async function notifyNewlyEligibleMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  preferredLanguage: string | null | undefined,
  rows: { opportunity_id: string; eligible: boolean; match_score: number }[],
  opportunities: { id: string; title: string }[],
  previousMatches: { opportunity_id: string; eligible: boolean }[] | null
): Promise<void> {
  // No previous row at all means this student's matches have never been computed before --
  // there is no baseline, so "everything is eligible" would read as "everything is new" and
  // notify about the student's entire matched catalogue the first time they ever open the
  // app. Skip rather than treat an absent baseline as a diff against nothing.
  if (previousMatches === null || previousMatches.length === 0) return;

  const previouslyEligibleIds = new Set(previousMatches.filter((m) => m.eligible).map((m) => m.opportunity_id));
  const newlyEligible = rows
    .filter((r) => r.eligible && !previouslyEligibleIds.has(r.opportunity_id))
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MAX_NEW_MATCH_NOTIFICATIONS_PER_REFRESH);
  if (newlyEligible.length === 0) return;

  const opportunityById = new Map(opportunities.map((o) => [o.id, o]));
  const locale = toLocale(preferredLanguage);
  const t = await getTranslations({ locale, namespace: "notifications" });

  for (const match of newlyEligible) {
    const opportunity = opportunityById.get(match.opportunity_id);
    if (!opportunity) continue;
    const link = `/opportunities/${match.opportunity_id}`;
    // Dedup: a (user, opportunity) pair notifies at most once, ever -- unlike deadline
    // reminders (which intentionally re-fire at each threshold), a match becoming eligible
    // is a one-time event, so the window is unbounded rather than scoped to a day/week.
    // .limit(1) before .maybeSingle() for the same reason as every other dedup check added
    // tonight: without it, a genuine race (two renders landing within the same request
    // window) can produce two matching rows, and an unbounded maybeSingle() turns that into
    // a permanent, self-perpetuating false negative rather than a one-time double-send.
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("category", "new_opportunity")
      .eq("link", link)
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    await createNotification({
      userId,
      category: "new_opportunity",
      title: t("newOpportunityMatch", { name: opportunity.title }),
      link,
    });
  }
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
