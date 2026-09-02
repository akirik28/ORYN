import "server-only";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { toLocale } from "@/lib/i18n/config";
import { assembleScoringFacts } from "./assemble-facts";
import { computeCareerProfile } from "./index";
import { computeCounselingCompleteness } from "./completeness";
import { buildProfileChange } from "./change";
import { detectNotifiableProfileUpdate, buildProfileUpdateNotification, NOTIFIABLE_DIMENSION_DELTA } from "./profile-update-notification";

/**
 * Recomputes a student's full career profile and persists it: upserts the current
 * per-dimension scores, refreshes the denormalized `profiles.profile_strength_score` /
 * `completeness_percent` cache columns used for fast dashboard/sidebar reads, appends a
 * history snapshot when the overall score (or a single dimension — see
 * `changedMeaningfully` below) meaningfully changed (Phase 41) so the monthly review has
 * real before/after data instead of noise from every trivial edit, and (2026-09-02) sends
 * a `profile_update` notification for the same "meaningful" movement plus any newly-reached
 * completeness milestone — see lib/scoring/profile-update-notification.ts for what counts.
 *
 * Called only from Server Actions that follow a student's own edit (achievement CRUD, CV
 * import, skills/languages, onboarding completion) — never from a page-render path, which
 * is exactly what makes the notification below safe to send unconditionally on a
 * meaningful diff: nothing here can fire from a student merely viewing a page. EVERY READ
 * except the notification's own translation catalog stays on
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
 *
 * `opts.supabaseClient`/`opts.adminClient` (2026-09-02, scheduled review job) default to
 * the request-scoped client and tryCreateAdminClient() -- correct for every existing,
 * real-user-session caller, unchanged. A scheduled job has no session to scope reads to
 * (it isn't acting as any one student), so it passes its own already-created admin client
 * for both -- the identical fix lib/plan/persist.ts's getOrCreateWeeklyPlan already needed
 * for the same reason (its own comment: "every read/write RLS-filtered to nothing" when a
 * job called it without threading a client through). Overriding `supabaseClient` alone
 * (without `adminClient`) would leave the three writes still going through this function's
 * own tryCreateAdminClient() call -- fine, just redundant, since a job already has one.
 */
export async function recomputeCareerProfile(
  userId: string,
  opts?: { snapshotReason?: string; supabaseClient?: Awaited<ReturnType<typeof createClient>>; adminClient?: ReturnType<typeof tryCreateAdminClient> }
) {
  const supabase = opts?.supabaseClient ?? (await createClient());
  const admin = opts?.adminClient ?? tryCreateAdminClient();
  const facts = await assembleScoringFacts(supabase, userId);

  const [profileResult, skillsResult, featuredResult, contactResult, previousSnapshotResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("country, school_name, graduation_year, curriculum, profile_strength_score, completeness_percent, preferred_language, headline, about")
      .eq("id", userId)
      .single(),
    supabase.from("skills").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("featured_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("contact_info").select("phone, email, linkedin_url, instagram_handle, github_url, website_url, twitter_handle, discord_handle").eq("user_id", userId).maybeSingle(),
    // For the profile_update notification's diff (lib/scoring/profile-update-notification.ts)
    // — the most recent snapshot BEFORE this call writes anything, so "what changed" compares
    // against the last real before-state, not against whatever this same call is about to
    // write. Read via `supabase` like every other read in this function, not `admin`: a
    // student's own score history is exactly the kind of thing their own RLS-scoped session
    // is already allowed to see (the dashboard reads this same table the same way).
    supabase.from("profile_score_snapshots").select("dimension_scores").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
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

  // Per-dimension movement since the last real snapshot, for the profile_update
  // notification below (lib/scoring/profile-update-notification.ts) — reuses
  // lib/scoring/change.ts's own diff, the same one Home/Progress already show a student,
  // rather than a second copy of "compare two dimension_scores objects".
  // previousSnapshotResult.data is null both when this is the very first computation ever
  // (onboarding) and when Supabase simply found no row — buildProfileChange treats both
  // identically ("no history, say nothing"), which is the correct behavior for both cases.
  const dimensionChange = buildProfileChange(careerProfile.dimensions, (previousSnapshotResult.data?.dimension_scores as Record<string, number> | undefined) ?? null);

  if (!admin) {
    console.error("[scoring] SUPABASE_SECRET_KEY not configured — computed career profile but skipped persisting it");
    return { careerProfile, completeness, snapshotWritten: false };
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

  // Widened 2026-09-02 (profile_update notifications) to also cover a single dimension
  // moving by NOTIFIABLE_DIMENSION_DELTA or more even when the OVERALL (a 9-dimension mean)
  // doesn't tick over a full point — a +5 on one dimension alone shifts the mean by 5/9
  // ≈ 0.56, which can round away to nothing. Real, structural reason this matters beyond
  // "make the notification below correct": without this OR-clause, a snapshot could go
  // unwritten for an edit big enough to notify about, leaving the NEXT recompute's "previous
  // snapshot" stale — it would still be the one from before THIS edit, so the next call could
  // detect (and notify about) the same already-reported movement a second time. Requiring a
  // snapshot to exist exactly when a notification fires is what keeps every future diff
  // comparing against an up-to-date baseline, not a structural coincidence.
  const changedMeaningfully =
    previousScore === null ||
    Math.abs(previousScore - careerProfile.overallScore) >= 1 ||
    dimensionChange.improved.some((d) => d.delta >= NOTIFIABLE_DIMENSION_DELTA) ||
    dimensionChange.declined.some((d) => Math.abs(d.delta) >= NOTIFIABLE_DIMENSION_DELTA);
  // 2026-09-02 progress/history audit: this used to be `changedMeaningfully ||
  // opts?.snapshotReason`, which wrote a snapshot on EVERY call that passed an explicit
  // reason (onboarding_completed, cv_import) regardless of whether the score moved at
  // all -- exactly the "noise from every trivial edit" this function's own header comment
  // says the Phase-41 design exists to avoid. Live data showed the result: one account had
  // five identical score-0 "onboarding_completed" snapshots minutes apart. The bypass
  // turned out to be unnecessary for its own apparent purpose too -- `changedMeaningfully`
  // already covers the genuine first-ever computation via `previousScore === null`
  // (profiles.profile_strength_score defaults to null, confirmed live), so a real baseline
  // snapshot still gets written without it. Dropping the reason-based bypass entirely, not
  // narrowing it to "first snapshot only": that condition was already redundant with
  // `changedMeaningfully`'s own first-call branch, not a second distinct case to preserve.
  if (changedMeaningfully) {
    const { error: snapshotError } = await admin.from("profile_score_snapshots").insert({
      user_id: userId,
      score_version: careerProfile.version,
      overall_score: careerProfile.overallScore,
      dimension_scores: Object.fromEntries(careerProfile.dimensions.map((d) => [d.dimension, d.score])),
      snapshot_reason: opts?.snapshotReason ?? "profile_updated",
    });
    if (snapshotError) throw new Error(`Failed to write score snapshot: ${snapshotError.message}`);
  }
  // 2026-09-02, scheduled review job: lets a caller iterating many students (which has no
  // other cheap way to tell "moved" from "didn't") report real work done, matching every
  // other Phase 30 job's own itemsProcessed convention (lib/plan/generate-for-active-
  // students.ts's own comment: "real work done, not rows merely looked at").
  const snapshotWritten = changedMeaningfully;

  // profile_update notification (Phase 24's "değişen şeyler" — the founder's own words for
  // this category): skipped only for onboarding_completed specifically, not for every
  // first-ever computation in general (buildProfileChange already handles "no history" on
  // its own, correctly, for a student's genuine first real edit after onboarding) — a
  // student mid-onboarding-flow, about to land straight on the dashboard where this exact
  // information is already the first thing they see, gets nothing new from being told about
  // it a second time in a notification bell.
  if (opts?.snapshotReason !== "onboarding_completed") {
    const event = detectNotifiableProfileUpdate(dimensionChange, profileRow.completeness_percent, completeness);
    if (event) {
      const locale = toLocale(profileRow.preferred_language);
      const translate = await getTranslations({ locale, namespace: "notifications" });
      const { title, body, link } = buildProfileUpdateNotification(event, translate, locale);
      await createNotification({ userId, category: "profile_update", title, body, link });
    }
  }

  return { careerProfile, completeness, snapshotWritten };
}
