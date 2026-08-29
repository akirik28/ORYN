import "server-only";

import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { checkUndergraduateFieldAvailability } from "./field-availability";
import { computeAdmissionOutlook, type AdmissionOutlookResult } from "./outlook";
import { resolveAdmissionSystem } from "./system-shape";

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
 * THE FINAL WRITE below (the 8 cached columns) goes through `admin`, the service-role
 * client — added as part of Security Gate 1 (2026-08-29), migration
 * 0066_guard_target_university_outlook_columns.sql. Before this change the write ran on
 * `supabase`, the caller's own RLS-scoped session, which is exactly what let a direct
 * client call (bypassing this function entirely) set these columns to an arbitrary value —
 * see that migration's own comment. EVERY READ above stays on `supabase`, unchanged: this
 * function reads exactly what the caller is already allowed to see, and widening a client
 * to fix a write must never widen what it reads too. Not a privilege widening for the
 * student — every value written here is already fully computed, server-side, above, before
 * either client is touched; this only changes which connection carries them the last few
 * lines to the database, so migration 0066's guard trigger can tell a real recompute apart
 * from a forged direct write. If the admin client isn't configured, the outlook is still
 * computed and returned to the caller (harmless — computing it needs no admin client), but
 * the cache columns are not updated; logged once, not silently, matching
 * `lib/scoring/persist.ts::recomputeCareerProfile`'s identical, already-established pattern.
 */
export async function refreshAdmissionOutlook(targetUniversityId: string, userId: string): Promise<AdmissionOutlookResult | null> {
  const supabase = await createClient();
  const admin = tryCreateAdminClient();

  const { data: target } = await supabase
    .from("target_universities")
    .select("id, university_id, program_id")
    .eq("id", targetUniversityId)
    .eq("user_id", userId)
    .single();
  if (!target) return null;

  const [profileRes, statsRes, universityRes, programRes] = await Promise.all([
    // `country` is residence/school location, which is the correct signal for every pathway
    // split in the researched set — never citizenship. See lib/admissions/system-shape.ts's
    // ApplicantPathway doc for the rules that establish this.
    supabase.from("profiles").select("profile_strength_score, completeness_percent, country").eq("id", userId).single(),
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

  const profileStrength = profileRes.data?.profile_strength_score ?? 0;
  const dataConfidence = profileRes.data && profileRes.data.completeness_percent >= 60 ? "high" : "medium";
  const targetCountry = universityRes.data?.country ?? null;
  const targetField = programRes.data?.subject_taxonomy ?? null;

  const admissionSystem = resolveAdmissionSystem({
    targetCountry,
    studentCountry: profileRes.data?.country ?? null,
    targetUniversityName: universityRes.data?.name ?? null,
    targetField,
  });
  const fieldAvailability = checkUndergraduateFieldAvailability({ country: targetCountry, field: targetField });

  const outlook = computeAdmissionOutlook({
    profileStrength,
    admissionRate: statsRes.data?.admission_rate ?? null,
    dataConfidence,
    admissionSystem,
    fieldAvailability,
  });

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
  if (!admin) {
    console.error("[admissions] SUPABASE_SECRET_KEY not configured — computed outlook but skipped persisting it");
    return outlook;
  }

  const { error: cacheError } = await admin
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
  if (cacheError) console.error(`[admissions] failed to persist outlook cache: ${cacheError.message}`);

  return outlook;
}
