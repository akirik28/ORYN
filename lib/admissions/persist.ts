import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, ProfileScore, University, UniversityStatistic } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getProfileScores } from "@/lib/security/dal";
import { CAREER_PROFILE_SCORE_VERSION } from "@/lib/scoring/types";
import { getUniversity, getUniversityStatistics } from "@/lib/universities/detail-reads";
import { checkUndergraduateFieldAvailability } from "./field-availability";
import { checkUndergraduatePathwayAvailability } from "./pathway-availability";
import { computeAdmissionOutlook, dataConfidenceForCompleteness, type AdmissionOutlookResult } from "./outlook";
import { resolveAdmissionSystem } from "./system-shape";
import { hasConfidentSignal, toProfileSignal } from "@/lib/scoring/signal";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { readOr } from "@/lib/supabase/safe-read";

/**
 * Computes and caches the admission outlook onto a target_universities row. Cheap
 * (deterministic math and table lookups, no AI/network call) — safe to call whenever a
 * target university page is viewed, unlike AI-backed features.
 *
 * Gate 1 (`resolveAdmissionSystem`) is applied here, which is the fix for the defect the
 * rules-vs-implementation audit ranked first: `computeAdmissionOutlook` has accepted an
 * admissions-system input since migration 0049, but this function never passed one, so a
 * student targeting a Turkish or German university got the same US-style
 * reach/competitive/likely framing as one targeting Yale.
 *
 * `locale` defaults to English; see lib/counselor/evidence.ts's buildRecommendation for the
 * reasoning shared across this codebase's i18n work. Only affects the returned result's
 * `notApplicableReason`/`admissionSystemMechanism` — nothing written to the database, which
 * has no locale-specific columns (see this function's own note below on why explanatory
 * copy isn't persisted at all).
 *
 * FIXED 2026-09-01 (fresh-install audit): this used to compute and persist a real outlook
 * — including a numeric percentage range — for a profile with zero scored dimensions,
 * because `profile_strength_score ?? 0` is indistinguishable from a genuinely-assessed
 * zero. A brand-new student's first target university read "Extreme Reach, 1-11%" before
 * they had entered a single course or activity: a confident, specific-looking answer
 * about a student Oryn has not read anything about. `hasConfidentSignal` — the same
 * predicate `lib/scoring/dashboard-hero.ts` already uses to avoid the equivalent failure
 * on the dashboard — is the fix: no confident signal, no outlook. `target_universities`
 * keeps whatever it already had (null for a fresh row), and `OutlookBadge`'s existing
 * `!outlook -> "Not yet assessed"` fallback — which could never actually fire before,
 * because this function always wrote a real value first — now does its job.
 *
 * `client` is optional and defaults to the request-scoped, cookie-bound client this function
 * has always used — every existing caller (the save action, the university detail page) is a
 * logged-in user's own request and is unaffected. It exists so a context with no
 * request/cookies to read — a scheduled job sweeping many users' rows — can pass an admin
 * client instead. See lib/admissions/scan.ts's `scanStaleOutlooks`, the one caller that does.
 */
export async function refreshAdmissionOutlook(
  targetUniversityId: string,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
  client?: SupabaseClient<Database>
): Promise<AdmissionOutlookResult | null> {
  const supabase = client ?? (await createClient());

  const targetRes = await supabase
    .from("target_universities")
    .select("id, university_id, program_id")
    .eq("id", targetUniversityId)
    .eq("user_id", userId)
    .single();
  const target = readOr("refreshAdmissionOutlook.target", targetRes, null, { userId, targetUniversityId });
  if (!target) return null;

  // Shared, cache()'d helpers (docs/performance.md §2/§5) only on the normal,
  // request-scoped path — each constructs its own createClient() internally, which reads
  // cookies via next/headers, so none are meaningful for the background-sweep path (an
  // explicit `client` was passed, meaning there's no request/session to read cookies from).
  // That path keeps its own direct queries via the passed admin client, unchanged.
  //
  // getCurrentProfile() is session-implicit (no userId argument — always "whoever this
  // request is logged in as"), unlike getProfileScores(userId)/getUniversity(id) below,
  // which take an explicit key. Safe here specifically because every request-scoped caller
  // of this function passes its own session's userId (the university detail page calls
  // this with session.userId!, per this function's own doc comment above) — the two are
  // guaranteed to agree on that path, not merely expected to. A future caller must keep
  // that guarantee (or pass an explicit `client` instead, which skips this branch entirely)
  // rather than call this function with a request-scoped client and a different user's id.
  const profilePromise: PromiseLike<{ data: Pick<Profile, "profile_strength_score" | "completeness_percent" | "country"> | null }> = client
    ? supabase.from("profiles").select("profile_strength_score, completeness_percent, country").eq("id", userId).single()
    : getCurrentProfile().then((data) => ({ data }));
  // .eq("calculation_version", ...) matches getProfileScores' own filter (lib/security/
  // dal.ts) -- this branch bypasses that helper for the no-session job path.
  const scoresPromise: PromiseLike<{ data: ProfileScore[] | null }> = client
    ? supabase.from("profile_scores").select("*").eq("user_id", userId).eq("calculation_version", CAREER_PROFILE_SCORE_VERSION)
    : getProfileScores(userId).then((data) => ({ data }));
  const statsPromise: PromiseLike<{ data: Pick<UniversityStatistic, "admission_rate" | "data_confidence"> | null }> = client
    ? supabase
        .from("university_statistics")
        .select("admission_rate, data_confidence")
        .eq("university_id", target.university_id)
        .order("stat_year", { ascending: false })
        .limit(1)
        .maybeSingle()
    : getUniversityStatistics(target.university_id).then((data) => ({ data }));
  const universityPromise: PromiseLike<{ data: Pick<University, "name" | "country"> | null }> = client
    ? supabase.from("universities").select("name, country").eq("id", target.university_id).maybeSingle()
    : getUniversity(target.university_id).then((data) => ({ data }));

  const [profileRes, scoresRes, statsRes, universityRes, programRes] = await Promise.all([
    // `country` is residence/school location, which is the correct signal for every pathway
    // split in the researched set — never citizenship. See lib/admissions/system-shape.ts's
    // ApplicantPathway doc for the rules that establish this.
    profilePromise,
    // Same source and same shape the dashboard hero reads (app/(app)/dashboard/page.tsx) —
    // needed for hasConfidentSignal below, not for profileStrength itself.
    scoresPromise,
    statsPromise,
    universityPromise,
    // Only an explicitly targeted programme counts as a stated field. An interest label is
    // deliberately not used here: suppressing a real, holistically-reviewed undergraduate
    // application because the student once typed "Medicine" as an interest would be a new
    // wrong answer, not a fix. The interest-level case is handled as an advisory instead —
    // see lib/universities/counseling-adapter.ts.
    target.program_id
      ? supabase.from("university_programs").select("subject_taxonomy").eq("id", target.program_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Read once each, reused below -- was several separate `xRes.data?.field` reads per
  // result, which would have logged the same underlying failure multiple times.
  const logContext = { userId, targetUniversityId };
  const profile = readOr("refreshAdmissionOutlook.profile", profileRes, null, logContext);
  const scores = readOr("refreshAdmissionOutlook.scores", scoresRes, [], logContext);
  const stats = readOr("refreshAdmissionOutlook.stats", statsRes, null, logContext);
  const university = readOr("refreshAdmissionOutlook.university", universityRes, null, logContext);
  const program = readOr("refreshAdmissionOutlook.program", programRes, null, logContext);

  // The gate. Oryn has not read enough of this profile to say anything about it — leaving
  // the row untouched (not writing a "low confidence" guess either) is the honest move,
  // and it's what lets OutlookBadge's own "Not yet assessed" fallback do its job. A failed
  // scores read lands here too now (same as a genuinely-empty one always did) -- the
  // conservative, safe direction (withhold judgment) either way, just visible now via
  // readOr's own log above rather than indistinguishable from "not enough data yet."
  if (!hasConfidentSignal(toProfileSignal(scores))) {
    return null;
  }

  const profileStrength = profile?.profile_strength_score ?? 0;
  const dataConfidence = dataConfidenceForCompleteness(profile?.completeness_percent ?? 0);
  const targetCountry = university?.country ?? null;
  const targetField = program?.subject_taxonomy ?? null;

  const admissionSystem = resolveAdmissionSystem(
    {
      targetCountry,
      studentCountry: profile?.country ?? null,
      targetUniversityName: university?.name ?? null,
      targetField,
    },
    locale
  );
  const fieldAvailability = checkUndergraduateFieldAvailability({ country: targetCountry, field: targetField }, locale);
  // Keyed by university, not by the resolved program/field above — see
  // lib/admissions/pathway-availability.ts's own note on why (every entry currently has zero
  // university_programs rows to key a per-program check against; the fact itself is
  // university-level, not program-level).
  const pathwayAvailability = checkUndergraduatePathwayAvailability({ universityId: target.university_id }, locale);

  const outlook = computeAdmissionOutlook(
    {
      profileStrength,
      admissionRate: stats?.admission_rate ?? null,
      dataConfidence,
      admissionSystem,
      fieldAvailability,
      pathwayAvailability,
    },
    locale
  );

  // `notApplicableReason`/`notApplicableKind`/`admissionSystemMechanism` are deliberately not
  // written: `target_universities` has no column for them, and adding one is the same
  // already-flagged follow-up docs/handoffs/geography-migration-report.md named when
  // `notApplicableReason` first shipped. The label itself is what stops the false-precision
  // problem; the explanatory copy reaches the UI through
  // lib/universities/counseling-adapter.ts, which returns it in memory rather than persisting
  // — and, for the caller that just triggered this refresh, through this function's own
  // return value, which is why it returns the result rather than void: `not_applicable` is
  // one enum member covering several unrelated reasons, and a badge that renders the label
  // without the kind can only describe one of them correctly (see OutlookBadge).
  // Service-role, not `supabase` (the request-scoped client every normal caller reads
  // with above): this pairs with the new target_universities RLS guard (docs/permissive-
  // update-policy-sweep-2026-09-04.md §1). Every read above stays on whichever client was
  // passed in — nothing here widens what a student can see, since `outlook` was already
  // fully computed, server-side, before this line — only the write of the already-decided
  // cache moves to service-role, the same shape migration 0063 already established for
  // profile_scores/opportunity_matches. The background-sweep caller (scanStaleOutlooks)
  // already passes an admin client as `client`; reuse it instead of opening a second one.
  const writeClient = client ?? tryCreateAdminClient();
  if (!writeClient) {
    console.error(`[admission-outlook] cannot persist for target_universities.id=${targetUniversityId}: admin client unavailable`);
    return outlook;
  }

  const { error: updateError } = await writeClient
    .from("target_universities")
    .update({
      academic_fit_score: outlook.compositeScore,
      profile_fit_score: profileStrength,
      outlook: outlook.outlook,
      estimate_range_low: outlook.estimateRangeLow !== null ? outlook.estimateRangeLow / 100 : null,
      estimate_range_high: outlook.estimateRangeHigh !== null ? outlook.estimateRangeHigh / 100 : null,
      outlook_confidence: outlook.estimateConfidence,
      outlook_model_version: outlook.modelVersion,
      outlook_calculated_at: new Date().toISOString(),
    })
    // `.eq("user_id", userId)` here, not just `.eq("id", ...)`, is load-bearing now that
    // `writeClient` can be the admin client (CEO's own catch, 2026-09-05): the
    // `target_universities` SELECT above already re-confirms `targetUniversityId` belongs
    // to `userId` before any of this runs, so this line is redundant *today* -- but with
    // RLS bypassed for this specific write, that earlier check is no longer a structural
    // guarantee the write itself carries, only a guarantee this one call path currently
    // happens to uphold. A future edit to this file that reorders these two queries, or a
    // new caller that skips the read, would silently reopen exactly the same class of gap
    // named in the still-open findings list (#10, createApplication's target_university_id
    // has no ownership check of its own either) -- scoping the write's own WHERE clause is
    // what makes this call safe on its own terms, not dependent on a different query
    // upstream staying correct forever.
    .eq("id", targetUniversityId)
    .eq("user_id", userId);

  // Computed successfully but not persisted is worse than either step failing cleanly: both
  // call sites discard this function's return value, so nothing surfaces the failure, and the
  // row is left exactly as it was — indistinguishable from "never refreshed" to anyone reading
  // the table later. Logged, not thrown: a page render or a save should not fail because the
  // cached outlook column didn't update.
  if (updateError) {
    console.error(`[admission-outlook] update failed for target_universities.id=${targetUniversityId}: ${updateError.message}`);
  }

  return outlook;
}
