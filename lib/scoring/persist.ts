import "server-only";

import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { assembleScoringFacts } from "./assemble-facts";
import { computeCareerProfile } from "./index";
import { computeCounselingCompleteness } from "./completeness";

/**
 * Recomputes a student's full career profile and persists it: upserts the current
 * per-dimension scores, refreshes the denormalized `profiles.profile_strength_score` /
 * `completeness_percent` cache columns used for fast dashboard/sidebar reads, and appends
 * a history snapshot when the overall score meaningfully changed (Phase 41) so the
 * monthly review has real before/after data instead of noise from every trivial edit.
 *
 * Called after achievement CRUD and from the dashboard's initial load. EVERY READ stays on
 * `supabase`, the caller's own RLS-scoped client -- this function reads exactly what the
 * caller is already allowed to see, and widening a client to fix a write must never widen
 * what it reads too. The THREE WRITES below (`profile_scores`, `profiles`'
 * `profile_strength_score`/`completeness_percent`, `profile_score_snapshots`) go through
 * `admin`, the service-role client, added 2026-08-22 (BUG-1's RLS verification package,
 * migration 0063 -- see that migration's own comment). Not a privilege widening for the
 * student: the values being written are already fully computed above, server-side, before
 * either client is touched; this only changes which connection carries them the last few
 * lines to the database, so that migration 0063's guard trigger on these exact columns can
 * tell a real recompute apart from a forged direct write. Before this change all three
 * writes ran on `supabase` too, which is exactly what let a student overwrite them
 * directly -- see docs/research/verification/rls-live-verification-2026-08-22.md.
 *
 * USES `tryCreateAdminClient()`, not `createAdminClient()` -- unlike this function's two
 * siblings (lib/opportunities/persist-matches.ts, lib/requirements/persist.ts), this one
 * was NOT actually crashing anything: all four of its call sites (app/(app)/profile/
 * actions.ts, professional-actions.ts, skills-actions.ts, app/(onboarding)/onboarding/
 * actions.ts) already wrap it in their own try/catch, logging and continuing on any
 * thrown error. Fixed here anyway, for the same reason the other two needed it: relying
 * on every current AND FUTURE caller remembering to wrap this in try/catch is exactly
 * the kind of convention-only safety this same day already showed can't be trusted
 * (migration 0062's own self-correction, then this exact regression, both from the
 * identical "the legitimate path assumed something about who's calling it" root cause).
 * If the admin client isn't configured, the score/completeness are still computed and
 * returned (harmless -- computing them needs no admin client at all), but none of the
 * three writes happen; logged once, not silently.
 */
export async function recomputeCareerProfile(userId: string, opts?: { snapshotReason?: string }) {
  const supabase = await createClient();
  const admin = tryCreateAdminClient();
  const facts = await assembleScoringFacts(supabase, userId);

  const [profileResult, skillsResult, featuredResult, contactResult] = await Promise.all([
    supabase.from("profiles").select("country, school_name, graduation_year, curriculum, profile_strength_score, headline, about").eq("id", userId).single(),
    supabase.from("skills").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("featured_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("contact_info").select("phone, email, linkedin_url, instagram_handle, github_url, website_url, twitter_handle, discord_handle").eq("user_id", userId).maybeSingle(),
  ]);
  const { data: profileRow, error: profileError } = profileResult;

  if (profileError || !profileRow) {
    throw new Error(`Cannot recompute career profile: profile not found (${profileError?.message ?? "no data"})`);
  }

  const hasContactInfo = Boolean(
    contactResult.data &&
      (contactResult.data.phone ||
        contactResult.data.email ||
        contactResult.data.linkedin_url ||
        contactResult.data.instagram_handle ||
        contactResult.data.github_url ||
        contactResult.data.website_url ||
        contactResult.data.twitter_handle ||
        contactResult.data.discord_handle)
  );

  const careerProfile = computeCareerProfile(facts);
  const completeness = computeCounselingCompleteness({
    ...facts,
    profile: profileRow,
    skillCount: skillsResult.count ?? 0,
    featuredCount: featuredResult.count ?? 0,
    hasContactInfo,
  });

  if (!admin) {
    console.error("[scoring] SUPABASE_SECRET_KEY not configured — computed career profile but skipped persisting it");
    return { careerProfile, completeness };
  }

  const calculatedAt = new Date().toISOString();
  const { error: scoresError } = await admin.from("profile_scores").upsert(
    careerProfile.dimensions.map((d) => ({
      user_id: userId,
      dimension: d.dimension,
      score: d.score,
      confidence: d.confidence,
      calculation_version: careerProfile.version,
      reason_codes: d.reasonCodes,
      calculated_at: calculatedAt,
    })),
    { onConflict: "user_id,dimension,calculation_version" }
  );
  if (scoresError) throw new Error(`Failed to persist dimension scores: ${scoresError.message}`);

  const previousScore = profileRow.profile_strength_score;
  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({ profile_strength_score: careerProfile.overallScore, completeness_percent: completeness })
    .eq("id", userId);
  if (profileUpdateError) throw new Error(`Failed to update profile cache: ${profileUpdateError.message}`);

  const changedMeaningfully = previousScore === null || Math.abs(previousScore - careerProfile.overallScore) >= 1;
  if (changedMeaningfully || opts?.snapshotReason) {
    const { error: snapshotError } = await admin.from("profile_score_snapshots").insert({
      user_id: userId,
      score_version: careerProfile.version,
      overall_score: careerProfile.overallScore,
      dimension_scores: Object.fromEntries(careerProfile.dimensions.map((d) => [d.dimension, d.score])),
      snapshot_reason: opts?.snapshotReason ?? "profile_updated",
    });
    if (snapshotError) throw new Error(`Failed to write score snapshot: ${snapshotError.message}`);
  }

  return { careerProfile, completeness };
}
