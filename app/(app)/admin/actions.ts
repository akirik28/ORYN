"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { discoverOpportunitiesForQuery, DEFAULT_DISCOVERY_QUERIES } from "@/lib/opportunities/discover";
import { syncUsUniversities, DEFAULT_US_UNIVERSITIES } from "@/lib/universities/sync-us-universities";
import { scanDeadlines } from "@/lib/deadlines/scan";
import { discoverRequirementsForUncoveredUniversities } from "@/lib/requirements/discover";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { isUuidLike } from "@/lib/validation/uuid";
import { buildPostRemovalUpdate, buildPostRestoreUpdate, ModerationInputError } from "@/lib/social/posts-moderation";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { logAdminAction } from "@/lib/admin/log";
import type { MessageReportStatus, PlanTier } from "@/types/database";

/**
 * Manual "run now" triggers for the admin panel — call the same underlying job logic the
 * scheduled HTTP routes use, directly (no HTTP round-trip, no need to hand the
 * server-only CRON_SECRET to client code). Every export here re-checks requireAdmin()
 * itself; never assume the page-level check is enough for a Server Action.
 */

export async function triggerOpportunityDiscovery(): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await runWithTracking("discover_opportunities", async () => {
      const runs = [];
      for (const query of DEFAULT_DISCOVERY_QUERIES) runs.push(await discoverOpportunitiesForQuery(query));
      return {
        itemsProcessed: runs.reduce((sum, r) => sum + r.opportunitiesStored, 0),
        errorsEncountered: runs.reduce((sum, r) => sum + r.errors.length, 0),
        result: runs,
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return {};
}

export async function triggerUniversitySync(): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await runWithTracking("sync_us_universities", async () => {
      const runs = await syncUsUniversities(DEFAULT_US_UNIVERSITIES);
      return {
        itemsProcessed: runs.filter((r) => r.status === "created" || r.status === "updated").length,
        errorsEncountered: runs.filter((r) => r.status === "error").length,
        result: runs,
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return {};
}

export async function triggerDeadlineScan(): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await runWithTracking("deadline_reminders", async () => {
      const { notified, checked } = await scanDeadlines();
      return { itemsProcessed: notified, errorsEncountered: 0, result: { notified, checked } };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return {};
}

export async function triggerRequirementDiscovery(): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await runWithTracking("discover_requirements", async () => {
      const runs = await discoverRequirementsForUncoveredUniversities();
      return {
        itemsProcessed: runs.reduce((sum, r) => sum + r.requirementsStored, 0),
        errorsEncountered: runs.reduce((sum, r) => sum + r.errors.length, 0),
        result: runs,
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Job failed." };
  }
  revalidatePath("/admin");
  return {};
}

/**
 * Minimum viable moderation (migration 0030): move a message_reports row through the
 * review state, and/or record a resolution note. Touching either field marks the report
 * reviewed by the acting admin, now — this is the audit trail, not a separate table.
 * Goes through the admin client because no RLS policy grants a normal client write access
 * to message_reports at all (reporter is insert-only) — same trust boundary as every
 * other admin-only write on this page.
 */
export async function updateReportReview(
  reportId: string,
  input: { status?: MessageReportStatus; resolutionNote?: string }
): Promise<{ error?: string }> {
  const admin_profile = await requireAdmin();
  if (!isUuidLike(reportId)) return { error: "Invalid report." };
  if (input.status === undefined && input.resolutionNote === undefined) return {};

  const admin = createAdminClient();
  const { error } = await admin
    .from("message_reports")
    .update({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.resolutionNote !== undefined ? { resolution_note: input.resolutionNote.trim().slice(0, 2000) } : {}),
      reviewed_by: admin_profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("[admin] failed to update report review", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/**
 * Content removal for a reported post (migration 0058's social layer).
 *
 * This is the half the report flow has never had. Migration 0030 gave `message_reports`
 * review states so a report could be triaged; nothing could actually take content down,
 * so "resolved" meant "an admin read it". For a product whose users are 14-18 that is not
 * a moderation path, and shipping the social layer without it would repeat exactly the
 * failure that migration's own header describes.
 *
 * Admin-only, and admin-only in the sense that matters: `requireAdmin()` 404s rather than
 * redirects, so a student poking at URLs learns nothing. This action is reachable only
 * from /admin — the social layer itself remains switched off and unreachable, which is why
 * these two functions live here rather than in lib/social/post-actions.ts.
 *
 * MUST go through the admin (service-role) client. `posts_guard_system_columns` restores
 * `removed_at`/`removed_by`/`removal_reason` on any UPDATE that is neither nested inside
 * another trigger nor from `service_role` — the same guard that stops an author clearing
 * their own removal through PostgREST.
 *
 * A removed post stays readable by its own author (the author branch of the read policy
 * is the only one not gated on `removed_at is null`), so removal is never silent. Every
 * other viewer, including anyone who reposted it, gets the neutral unavailable
 * placeholder.
 */
export async function removeReportedPost(postId: string, reason: string): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(postId)) return { error: "Invalid post." };

  let update;
  try {
    update = buildPostRemovalUpdate({ moderatorId: adminProfile.id, reason });
  } catch (error) {
    if (error instanceof ModerationInputError) return { error: error.message };
    throw error;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("posts").update(update).eq("id", postId);
  if (error) {
    console.error("[admin] failed to remove reported post", { code: error.code, message: error.message });
    return { error: "Couldn't remove that post. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

/** Undoes a removal. Clears all three moderation columns together — migration 0058's
 * `posts_removal_shape` check enforces that they are set or null as a group. */
export async function restoreReportedPost(postId: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isUuidLike(postId)) return { error: "Invalid post." };

  const admin = createAdminClient();
  const { error } = await admin.from("posts").update(buildPostRestoreUpdate()).eq("id", postId);
  if (error) {
    console.error("[admin] failed to restore post", { code: error.code, message: error.message });
    return { error: "Couldn't restore that post. Please try again." };
  }

  revalidatePath("/admin");
  return {};
}

export interface SetUserPlanTierResult {
  error?: string;
  /** true once a write actually happened; false when the target was already on the
   * requested tier (a real outcome, not an error — the UI renders it as "already Ultra",
   * not a failure). Absent (undefined) only alongside `error`. */
  changed?: boolean;
  fromTier?: PlanTier;
}

/**
 * The founder's own example of what this whole package exists to fix: they asked oryn-a7 to
 * run raw SQL twice to set their own plan_tier to 'ultra', and once it silently affected
 * zero rows with neither of them knowing why. The fix isn't "run the same UPDATE from a
 * button" — it's making a no-op impossible to mistake for a success.
 *
 * Three distinguishable outcomes, not two: an error (the write failed), a genuine no-op
 * (`changed: false` — the user was already on that tier, nothing to do, not a failure), and
 * a confirmed change (`changed: true`). The no-op/change distinction is only knowable
 * because this reads the row first rather than firing the UPDATE blind — the same blindness
 * that let the founder's SQL affect zero rows without either of them noticing.
 *
 * `.update(...).select("id")` (not a bare `.update(...)`, which returns no data at all) is
 * what makes an actually-zero-rows-affected UPDATE detectable here even in the case this
 * function's own pre-read doesn't anticipate (a row deleted between the read and the write,
 * a race this codebase has no transaction wrapping either side against) — `updated` coming
 * back empty is reported as a real error, not swallowed as if `error === null` were the
 * whole story, which is exactly the gap the founder's raw SQL fell into.
 */
export async function setUserPlanTier(userId: string, tier: PlanTier): Promise<SetUserPlanTierResult> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(userId)) return { error: "Invalid user." };
  if (tier !== "standard" && tier !== "ultra") return { error: "Invalid tier." };

  const admin = createAdminClient();
  const { data: before, error: readError } = await admin.from("profiles").select("plan_tier, display_name").eq("id", userId).maybeSingle();
  if (readError || !before) {
    console.error("[admin] failed to read profile before setting plan tier", { userId, error: readError });
    return { error: "Couldn't find that user." };
  }

  const fromTier = resolvePlanTier(before);
  if (fromTier === tier) {
    return { changed: false, fromTier };
  }

  const { data: updated, error } = await admin.from("profiles").update({ plan_tier: tier }).eq("id", userId).select("id");
  if (error) {
    console.error("[admin] failed to set plan tier", { userId, tier, error });
    return { error: "Couldn't save that. Please try again." };
  }
  if (!updated || updated.length === 0) {
    console.error("[admin] plan tier update matched zero rows", { userId, tier });
    return { error: "That saved nothing — 0 rows were updated. The account may have just been deleted." };
  }

  await logAdminAction(admin, {
    adminProfile,
    action: "set_plan_tier",
    targetUserId: userId,
    targetLabel: before.display_name,
    detail: { from: fromTier, to: tier },
  });

  revalidatePath("/admin");
  return { changed: true, fromTier };
}
