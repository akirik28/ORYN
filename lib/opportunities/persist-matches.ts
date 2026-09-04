import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getProfileScores } from "@/lib/security/dal";
import { CAREER_PROFILE_SCORE_VERSION } from "@/lib/scoring/types";
import { computeOpportunityMatch, computeAvoidSignals, isNearStudent } from "./matching";
import type { StudentMatchProfile, OpportunityForMatching, DismissedOpportunitySignal } from "./matching";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { evidenceStateFor, type EvidenceState } from "@/lib/scoring/signal";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { readOr } from "@/lib/supabase/safe-read";
import type { ProfileDimension } from "@/types/database";
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
 * Every READ below stays on `supabase` -- the caller's own RLS-scoped client for every
 * real page-render caller, or an explicitly passed client (see `client` below) for the
 * one caller with no session of its own. Only the final `opportunity_matches` upsert
 * uses `admin` (added 2026-08-22, migration 0063,
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
 * fresh). `refreshed: false` means "this refresh could not actually see the student's
 * own data" -- originally just the admin client being unavailable, and now also a
 * session-less `supabase` client that comes back with no profile row: found live
 * 2026-09-02, this function was called unconditionally from `getCounselorState`
 * (lib/counselor/state.ts) with no client override even when that function had one of
 * its own for the scheduled weekly-plan job -- an anonymous client, every RLS-scoped
 * read here silently empty, `opportunities.length === 0` firing immediately, and
 * `{ refreshed: true }` returned having refreshed nothing. `refreshed: true` still
 * means "zero matches exist" when that's what a *successful* read actually found --
 * the fix below only changes what happens when the read couldn't run for real.
 *
 * `client` (optional, mirrors `refreshAdmissionOutlook` in lib/admissions/persist.ts
 * one function over) is how a caller with no session of its own — `getCounselorState`'s
 * scheduled-job path — passes its own client through instead of this function silently
 * building an unauthenticated one. Every existing caller (the opportunities pages, the
 * dashboard, `getCounselorState`'s two real-session callers) omits it and keeps
 * today's exact behavior.
 *
 * `locale` is now unused inside this function (2026-09-03, the eligibility_notes -> codes
 * fix): its only consumer, computeOpportunityMatch below, stopped accepting a locale the
 * same day, since a request's locale freezing into a stored row was the bug. Kept as a
 * parameter rather than removed — this function has four external callers (three page
 * renders, lib/counselor/state.ts) that would all need a one-line edit for a change with no
 * behavioral upside, during a night with several other lanes active in page-render code this
 * fix's own territory doesn't cover. See lib/opportunities/matching.ts's renderEligibilityNotes
 * for where locale actually matters now: read time, not compute time.
 */
export async function refreshOpportunityMatches(userId: string, locale: Locale = DEFAULT_LOCALE, client?: SupabaseClient<Database>): Promise<{ refreshed: boolean }> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("[opportunity-matches] SUPABASE_SECRET_KEY not configured — skipping match refresh, page will render with existing (possibly stale) matches");
    return { refreshed: false };
  }
  const supabase = client ?? (await createClient());

  const [profileRes, scoresRes, interestsRes, opportunitiesRes, savedRes, previousMatchesRes] = await Promise.all([
    // select("*"), not an explicit column list: an explicit list naming citizenship_countries
    // (migration 0047, not applied on every environment) makes PostgREST reject the WHOLE
    // query (42703 "column does not exist"), silently degrading every other profile field
    // here to its fallback too -- confirmed live against this environment's DB. Same fix as
    // 08ddf0f applied to lib/ai/student-context.ts for the identical failure mode.
    supabase.from("profiles").select("*").eq("id", userId).single(),
    // Shared, cache()'d getProfileScores(userId) (docs/performance.md §2) only when this
    // call is request-scoped (no explicit `client`) -- that helper always builds its own
    // session-cookie client internally, wrong for the same no-session path this whole
    // fix exists for. See lib/admissions/persist.ts's refreshAdmissionOutlook for the
    // identical conditional, one function over.
    // .eq("calculation_version", ...) on the direct branch matches getProfileScores' own
    // filter (lib/security/dal.ts's own comment on why) — this branch bypasses that helper
    // entirely for the no-session job path, so it needs the identical filter applied by hand.
    client ? supabase.from("profile_scores").select("*").eq("user_id", userId).eq("calculation_version", CAREER_PROFILE_SCORE_VERSION) : getProfileScores(userId).then((data) => ({ data })),
    supabase.from("student_interests").select("label").eq("user_id", userId),
    // select("*") for the same reason as above -- eligible_citizenships is migration 0047.
    supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active"),
    // Counselor Core fix: an opportunity the student already applied to or explicitly
    // dismissed must never resurface as a fresh recommendation — see computeEligibility's
    // savedStatus parameter (lib/opportunities/matching.ts). not_interested_reason is read
    // here too, feeding the avoid-signal computation below — see DismissalAvoidSignals.
    supabase.from("saved_opportunities").select("opportunity_id, status, not_interested_reason").eq("user_id", userId),
    // Read before this call's own upsert overwrites it -- the only way to tell "newly
    // eligible this render" from "already eligible last render too." An empty result here
    // is itself meaningful: it means this student has never had matches computed before,
    // so there is no baseline to diff against (see the notification block below, which
    // treats that case as "skip notifying" rather than "everything is new").
    supabase.from("opportunity_matches").select("opportunity_id, eligible").eq("user_id", userId),
  ]);

  // The check the 2026-09-02 bug needed: every table above is either owned by this exact
  // student (`profiles`, `profile_scores`, `student_interests`, `saved_opportunities`,
  // `opportunity_matches` — all `user_id = auth.uid()`/`id = auth.uid()`) or, for
  // `opportunities`, gated to the `authenticated` role outright. `profiles` is the cheapest
  // reliable signal that `supabase` can actually see this student: `.single()` on a row
  // that genuinely exists but is RLS-invisible comes back with `data: null` the same way a
  // truly missing row would, and every real caller of this function is for an onboarded
  // student whose own profile row unquestionably exists. Treated the same as "admin client
  // unavailable" above -- this refresh could not do its job, not "did its job and found
  // nothing."
  if (!profileRes.data) {
    console.error("[opportunity-matches] profile row not visible to the query client — refusing to compute matches from a partial/empty read", { userId });
    return { refreshed: false };
  }

  const savedOpportunities = readOr("refreshOpportunityMatches.saved", savedRes, [], { userId });
  const savedStatusByOpportunityId = new Map(savedOpportunities.map((s) => [s.opportunity_id, s.status]));

  // A cycle that has closed (or a deadline that has simply passed with no newer one on
  // file — see lifecycle.ts) must stop producing fresh matches, even though `status` stays
  // `active` for these rows (a real, correctly-sourced record, not a bad one). This does not
  // clean up matches computed before a cycle closed; see the defensive re-filter in every
  // surface that reads opportunity_matches back (ForYouView, dashboard preview).
  const opportunities = filterActionableOpportunities(readOr("refreshOpportunityMatches.opportunities", opportunitiesRes, [], { userId }));
  if (opportunities.length === 0) return { refreshed: true };

  const currentYear = new Date().getFullYear();
  const age = profileRes.data?.birth_year ? currentYear - profileRes.data.birth_year : null;

  // Read once, used below both for weakestDimensions and evidenceStateByDimension -- was two
  // separate `scoresRes.data ?? []` reads, which (harmlessly, but redundantly) would have
  // logged the same underlying failure twice.
  const scores = readOr("refreshOpportunityMatches.scores", scoresRes, [], { userId });

  // Counselor Core Phase D — see app/(app)/dashboard/page.tsx's identical usage.
  const weakestDimensions = rankDimensionGaps(toDimensionScoreRows(scores))
    .slice(0, 3)
    .map((g) => g.dimension);

  // Phase 12's "confidence" dimension (spec's 7th, alongside relevance/profile-need):
  // how confidently grounded is a "this addresses your gap" claim, given how much Oryn
  // actually knows about the specific dimension it names. Built from the SAME
  // profile_scores rows weakestDimensions above already reads -- one lookup, reused for
  // every opportunity below, not a per-row refetch. evidenceStateFor is
  // lib/scoring/signal.ts's own function, imported directly rather than reimplemented,
  // per CEO's explicit instruction not to invent a second confidence vocabulary next to
  // the one that already governs how the dashboard talks about evidence depth.
  const evidenceStateByDimension = new Map<ProfileDimension, EvidenceState>(
    scores.map((row) => [
      row.dimension,
      evidenceStateFor(row.score, row.confidence, Array.isArray(row.reason_codes) && row.reason_codes.length > 0),
    ])
  );

  const baseStudentProfile: StudentMatchProfile = {
    age,
    country: profileRes.data?.country ?? null,
    interests: readOr("refreshOpportunityMatches.interests", interestsRes, [], { userId }).map((i) => i.label),
    weakestDimensions,
    citizenshipCountries: profileRes.data?.citizenship_countries ?? [],
    graduationYear: profileRes.data?.graduation_year ?? null,
  };

  // Section 12.1: "Use this signal in recommendations" — read but never acted on until this
  // pass (docs/not-interested-reason-audit-2026-09-02.md has the full audit). A second,
  // targeted query rather than folding into the `saved_opportunities` select above: only
  // the small number of dismissed-with-a-reason rows need their opportunity's own
  // fields/cost/location looked up, not every saved/applied row too.
  const dismissedWithReason = savedOpportunities.filter(
    (s): s is typeof s & { not_interested_reason: string } => s.status === "not_interested" && s.not_interested_reason !== null
  );
  let dismissedSignals;
  if (dismissedWithReason.length > 0) {
    const dismissedOpportunitiesRes = await supabase
      .from("opportunities")
      .select("id, fields, cost, location_mode, country")
      .in(
        "id",
        dismissedWithReason.map((d) => d.opportunity_id)
      );
    const dismissedOpportunities = readOr("refreshOpportunityMatches.dismissedOpportunities", dismissedOpportunitiesRes, [], { userId });
    const dismissedById = new Map(dismissedOpportunities.map((o) => [o.id, o]));
    const signals: DismissedOpportunitySignal[] = dismissedWithReason.flatMap((d) => {
      const dismissed = dismissedById.get(d.opportunity_id);
      if (!dismissed) return [];
      return [
        {
          reason: d.not_interested_reason,
          fields: dismissed.fields ?? [],
          cost: dismissed.cost,
          isDistantInPerson: dismissed.location_mode === "in_person" && !isNearStudent(baseStudentProfile, { country: dismissed.country }),
        },
      ];
    });
    dismissedSignals = computeAvoidSignals(signals);
  }

  const studentProfile: StudentMatchProfile = { ...baseStudentProfile, dismissedSignals };

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
      // Same defensive ?? false as above — migration 0126 may not be applied on this
      // environment yet.
      ageEligibilityConfirmedOpen: opportunity.age_eligibility_confirmed_open ?? false,
      gradeEligibilityConfirmedOpen: opportunity.grade_eligibility_confirmed_open ?? false,
      // Migration 0129 — the third state (checked, not stated). Absent/unapplied reads as
      // null, which is neither 'checked_not_stated' nor anything else meaningful, so the
      // read path correctly falls through to the age_eligibility_unverified branch.
      ageEligibilityBasis: opportunity.age_eligibility_basis ?? null,
      gradeEligibilityBasis: opportunity.grade_eligibility_basis ?? null,
      // Migration 0133 — same reasoning as ageEligibilityBasis/gradeEligibilityBasis above.
      countryEligibilityBasis: opportunity.country_eligibility_basis ?? null,
      lastVerifiedAt: opportunity.last_verified_at ?? null,
      // Package 8 fix: previously reduced to a boolean here (only used to suppress the
      // "not verified yet" note, never to say what the prose actually says). Passing the
      // raw text lets computeEligibility surface the same restriction note
      // lib/counselor/eligibility.ts already does, in the same words.
      citizenshipRestrictions: opportunity.citizenship_restrictions,
      residencyRestrictions: opportunity.residency_restrictions,
      fields: opportunity.fields,
      country: opportunity.country,
      cost: opportunity.cost,
      locationMode: opportunity.location_mode,
    };
    const match = computeOpportunityMatch(studentProfile, forMatching, savedStatusByOpportunityId.get(opportunity.id) ?? null);
    const matchConfidence = resolveMatchConfidence(match.matchedGapDimensions, evidenceStateByDimension);

    return {
      user_id: userId,
      opportunity_id: opportunity.id,
      eligible: match.eligible,
      eligibility_notes: match.eligibilityNotes,
      relevance_score: match.relevanceScore,
      profile_need_score: match.profileNeedScore,
      match_score: match.matchScore,
      effort_estimate: null,
      match_confidence: matchConfidence,
      reason_codes: buildReasonCodes(match, studentProfile, forMatching),
      calculated_at: new Date().toISOString(),
    };
  });

  // Found live 2026-09-02, before this write ever reached a student: this call had no
  // error/data destructure at all -- the exact unchecked-write shape
  // lib/universities/sync-us-universities.ts's university_statistics upsert had (see that
  // file's own history). Every row here always includes match_confidence now, so until
  // migration 0086 is applied on a given environment, this upsert would otherwise reject
  // OUTRIGHT (42703, undefined_column) on its very first call -- not a degraded partial
  // write, a complete failure of opportunity matching for every user, on every page render
  // that touches opportunities, with nothing anywhere reporting it. Degrade-and-retry
  // without match_confidence when that specific column is the reason, same pattern and same
  // reasoning as that file's own fix: the match itself (eligible, scores, reasons) is the
  // thing that must never silently fail to persist; losing only the confidence value until
  // the migration lands is the acceptable, honest degradation.
  const { error: upsertError } = await admin.from("opportunity_matches").upsert(rows, { onConflict: "user_id,opportunity_id" });
  if (upsertError && isUndefinedColumnError(upsertError, "match_confidence")) {
    console.warn("[opportunity-matches] match_confidence column not yet live (migration 0086 unapplied) -- retrying without it", { userId });
    const rowsWithoutConfidence = rows.map((row) => ({
      user_id: row.user_id,
      opportunity_id: row.opportunity_id,
      eligible: row.eligible,
      eligibility_notes: row.eligibility_notes,
      relevance_score: row.relevance_score,
      profile_need_score: row.profile_need_score,
      match_score: row.match_score,
      effort_estimate: row.effort_estimate,
      reason_codes: row.reason_codes,
      calculated_at: row.calculated_at,
    }));
    const { error: retryError } = await admin.from("opportunity_matches").upsert(rowsWithoutConfidence, { onConflict: "user_id,opportunity_id" });
    if (retryError) {
      console.error("[opportunity-matches] upsert failed even without match_confidence", { userId, error: retryError.message });
    }
  } else if (upsertError) {
    console.error("[opportunity-matches] upsert failed", { userId, error: upsertError.message });
  }
  await notifyNewlyEligibleMatches(supabase, userId, profileRes.data?.preferred_language, rows, opportunities, previousMatchesRes.data);
  return { refreshed: true };
}

/**
 * Phase 12's "confidence" dimension: how confidently grounded a "this addresses your
 * gap" claim is, given how much Oryn actually knows about the specific dimension(s) it
 * names. Confidence only qualifies a claim Oryn is actually making -- a relevance/
 * interest/proximity-only match isn't asserting anything about the student's own
 * evidence depth, so it gets no confidence value at all (null) rather than a borrowed
 * one. When a category maps to more than one of the student's own top-3 weakest
 * dimensions, the more cautious (lower-ranked) EvidenceState wins -- not_assessed is
 * the least confident of the five, strong the most, matching evidenceStateFor's own
 * documented ordering (lib/scoring/signal.ts) -- so a well-evidenced dimension never
 * silently papers over a thin one in the same match.
 */
const EVIDENCE_STATE_RANK: Record<EvidenceState, number> = { not_assessed: 0, limited_evidence: 1, emerging: 2, developing: 3, strong: 4 };

export function resolveMatchConfidence(
  matchedGapDimensions: ProfileDimension[],
  evidenceStateByDimension: Map<ProfileDimension, EvidenceState>
): EvidenceState | null {
  if (matchedGapDimensions.length === 0) return null;
  return matchedGapDimensions
    .map((dimension) => evidenceStateByDimension.get(dimension) ?? "not_assessed")
    .reduce((weakest, state) => (EVIDENCE_STATE_RANK[state] < EVIDENCE_STATE_RANK[weakest] ? state : weakest));
}

/**
 * Inline, not routed through the message catalog — same shape as app/(app)/advisor/actions.ts's
 * quotaExhaustedMessage/alreadyGeneratingMessage: this string is produced by a background write
 * path, not a React-tree render, so next-intl's request-scoped getTranslations() has nothing to
 * attach to (it throws outside a real Next.js request regardless of an explicit locale arg).
 * This is the i18n half of the same no-request-context problem refreshOpportunityMatches's own
 * Supabase client was already fixed for on 2026-09-02 (see that function's header comment) — one
 * function later in this same file, closed six weeks apart. Values copied verbatim from
 * messages/en.json / messages/tr.json's real `notifications.newOpportunityMatch` key.
 */
function newOpportunityMatchTitle(locale: Locale, name: string): string {
  return locale === "tr" ? `Yeni eşleşme: ${name}` : `New match: ${name}`;
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
    const existingRes = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("category", "new_opportunity")
      .eq("link", link)
      .limit(1)
      .maybeSingle();
    // Fallback stays `null` -- unchanged from before, so a failed dedup check still sends
    // (never silently swallows a real notification), same as always. This is visibility
    // only: a failure here used to look identical to "genuinely no prior notification,"
    // now it's at least logged, by name, if it ever fires.
    const existing = readOr("notifyNewlyEligibleMatches.existingNotification", existingRes, null, { userId, opportunityId: match.opportunity_id });
    if (existing) continue;

    await createNotification({
      userId,
      category: "new_opportunity",
      title: newOpportunityMatchTitle(locale, opportunity.title),
      link,
    });
  }
}

/**
 * Found live 2026-09-02: 724 of 1,931 opportunity_matches rows had an empty reason_codes
 * array -- eligible, shown to the student with a real match_score, nothing said why (spec
 * Phase 12 forbids exactly this: "do not call this one opaque AI score"). Traced by basis:
 *   - 337 rows: the opportunity has no `fields` recorded at all, so relevance never ran a
 *     real comparison (matching.ts's computeRelevance defaults to 40 with nothing to compare).
 *   - 143 rows: same default, because the STUDENT has no recorded interests instead.
 *   - 165 rows: a real comparison ran on both sides and found zero overlap, the category
 *     doesn't address a weak dimension, and the opportunity isn't in the student's country.
 *   - 79 rows: a real comparison found *some* overlap (1 of N interests), just not enough
 *     to clear the 70-point bar for matches_your_interests.
 * shares_your_interest and the two limited_*_information codes below cover the first three
 * of those honestly. The 165 "no_overlap" rows are deliberately left with nothing added here
 * -- there is no true positive thing to say about them, and CEO's read (correct) is that an
 * eligible match with zero shared interest, no gap-relevance, and no proximity is a finding
 * about the matcher's own inclusion bar, not something a reason sentence should paper over.
 */
export function buildReasonCodes(
  match: ReturnType<typeof computeOpportunityMatch>,
  student: StudentMatchProfile,
  opportunity: OpportunityForMatching
): string[] {
  // An ineligible match's relevance/profile-need/proximity signals are still fully computed
  // above (computeOpportunityMatch never skips them for an ineligible student), but they
  // must never be *stored* alongside "ineligible". Confirmed 2026-09-02: both current
  // readers of this column (opportunity-card.tsx's canClaimMatch, [id]/page.tsx's
  // canGiveTake) already gate the positive text out at render time, so this exact
  // combination doesn't reach a student today -- but that's two call sites independently
  // getting it right, not a guarantee a third one will. Short-circuiting here means the
  // *data* carries the honesty invariant, not just its current readers: nothing that ever
  // reads reason_codes at face value can show "it matches your interests" beside a verdict
  // that says the opposite. `eligible` is only false for a confirmed exclusion (unknown
  // eligibility stays `eligible: true` with a note, per computeEligibility), so this never
  // suppresses a merely-uncertain case, only a definite one.
  if (!match.eligible) return ["ineligible"];

  const codes: string[] = [];
  if (match.relevanceScore >= 70) codes.push("matches_your_interests");
  if (match.profileNeedScore >= 70) codes.push("addresses_a_current_gap");
  if (isNearStudent(student, opportunity)) codes.push("near_you");
  if (match.relevanceScore < 70 && match.matchedInterests.length > 0) codes.push("shares_your_interest");
  // Independent of the four checks above — section 62's explainability requirement applies
  // to a penalty exactly as much as a boost, so this can appear alongside a positive code
  // (still relevant on other grounds, just also similar to something dismissed) rather than
  // only in the no-other-signal fallback below.
  if (match.avoidReasons.length > 0) codes.push("similar_to_dismissed");

  // Fallback of last resort, reached only when none of the four checks above added
  // anything -- never crowds out a real reason when one exists. (eligible is already
  // guaranteed true here -- the early return above handles the false case entirely.)
  if (codes.length === 0) {
    if (match.relevanceBasis === "opportunity_fields_missing") {
      codes.push("limited_opportunity_information");
    } else if (match.relevanceBasis === "student_interests_missing") {
      codes.push("limited_profile_information");
    }
  }

  return codes;
}
