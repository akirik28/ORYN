import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { checkUndergraduateFieldAvailability } from "./field-availability";
import { computeAdmissionOutlook, dataConfidenceForCompleteness, type AdmissionOutlookResult } from "./outlook";
import { resolveAdmissionSystem } from "./system-shape";
import { hasConfidentSignal, toProfileSignal } from "@/lib/scoring/signal";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

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

  const { data: target } = await supabase
    .from("target_universities")
    .select("id, university_id, program_id")
    .eq("id", targetUniversityId)
    .eq("user_id", userId)
    .single();
  if (!target) return null;

  const [profileRes, scoresRes, statsRes, universityRes, programRes] = await Promise.all([
    // `country` is residence/school location, which is the correct signal for every pathway
    // split in the researched set — never citizenship. See lib/admissions/system-shape.ts's
    // ApplicantPathway doc for the rules that establish this.
    supabase.from("profiles").select("profile_strength_score, completeness_percent, country").eq("id", userId).single(),
    // Same source and same shape the dashboard hero reads (app/(app)/dashboard/page.tsx) —
    // needed for hasConfidentSignal below, not for profileStrength itself.
    supabase.from("profile_scores").select("dimension, score, confidence, reason_codes").eq("user_id", userId),
    supabase
      .from("university_statistics")
      .select("admission_rate, data_confidence")
      .eq("university_id", target.university_id)
      .order("stat_year", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("universities").select("name, country").eq("id", target.university_id).maybeSingle(),
    // Only an explicitly targeted programme counts as a stated field. An interest label is
    // deliberately not used here: suppressing a real, holistically-reviewed undergraduate
    // application because the student once typed "Medicine" as an interest would be a new
    // wrong answer, not a fix. The interest-level case is handled as an advisory instead —
    // see lib/universities/counseling-adapter.ts.
    target.program_id
      ? supabase.from("university_programs").select("subject_taxonomy").eq("id", target.program_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // The gate. Oryn has not read enough of this profile to say anything about it — leaving
  // the row untouched (not writing a "low confidence" guess either) is the honest move,
  // and it's what lets OutlookBadge's own "Not yet assessed" fallback do its job.
  if (!hasConfidentSignal(toProfileSignal(scoresRes.data ?? []))) {
    return null;
  }

  const profileStrength = profileRes.data?.profile_strength_score ?? 0;
  const dataConfidence = dataConfidenceForCompleteness(profileRes.data?.completeness_percent ?? 0);
  const targetCountry = universityRes.data?.country ?? null;
  const targetField = programRes.data?.subject_taxonomy ?? null;

  const admissionSystem = resolveAdmissionSystem(
    {
      targetCountry,
      studentCountry: profileRes.data?.country ?? null,
      targetUniversityName: universityRes.data?.name ?? null,
      targetField,
    },
    locale
  );
  const fieldAvailability = checkUndergraduateFieldAvailability({ country: targetCountry, field: targetField }, locale);

  const outlook = computeAdmissionOutlook(
    {
      profileStrength,
      admissionRate: statsRes.data?.admission_rate ?? null,
      dataConfidence,
      admissionSystem,
      fieldAvailability,
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
  const { error: updateError } = await supabase
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
    .eq("id", targetUniversityId);

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
