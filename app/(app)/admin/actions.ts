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
import { ADMIN_FINANCE_SETTINGS_ID } from "@/lib/admin/queries";
import { isValidExchangeRate, isValidPrice } from "@/lib/admin/finance";
import { isUndefinedTableError } from "@/lib/supabase/errors";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { logAdminAction } from "@/lib/admin/log";
import { getAdminOpportunityList, type AdminOpportunityRow } from "@/lib/admin/queries";
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

/**
 * The finance dashboard's editable settings (migration 0094, CEO's course correction —
 * "the founder can set it here", not an env var needing a deploy). Either field is optional
 * so the settings form can save just the rate, just the price, or both in one submit;
 * `undefined` means "leave this one alone", genuinely distinct from "clear it to null" (the
 * rate has no clear-to-null affordance in the UI this pairs with — there's no legitimate
 * reason to un-set a once-known rate back to "unconfigured").
 *
 * `.upsert()`, not `.update()` — the row may not exist yet (first-ever save) or the whole
 * table may not exist yet (migration unapplied), and this project's standing discipline is
 * that a write naming an unmigrated target degrades rather than throwing an unhandled
 * exception up through the Server Action boundary.
 */
export async function updateFinanceSettings(input: { usdTryRate?: number; ultraPriceTry?: number }): Promise<{ error?: string }> {
  const adminProfile = await requireAdmin();
  if (input.usdTryRate === undefined && input.ultraPriceTry === undefined) return {};
  if (input.usdTryRate !== undefined && !isValidExchangeRate(input.usdTryRate)) return { error: "Enter a positive exchange rate." };
  if (input.ultraPriceTry !== undefined && !isValidPrice(input.ultraPriceTry)) return { error: "Enter a positive price." };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("admin_finance_settings").upsert({
    id: ADMIN_FINANCE_SETTINGS_ID,
    ...(input.usdTryRate !== undefined ? { usd_try_rate: input.usdTryRate, usd_try_rate_updated_at: now } : {}),
    ...(input.ultraPriceTry !== undefined ? { ultra_price_try: input.ultraPriceTry, ultra_price_try_updated_at: now } : {}),
    updated_by: adminProfile.id,
    updated_at: now,
  });

  if (error) {
    if (isUndefinedTableError(error, "admin_finance_settings")) {
      return { error: "Finance settings aren't set up in the database yet — migration 0094 needs to be applied first." };
    }
    console.error("[admin] failed to update finance settings", { code: error.code, message: error.message });
    return { error: "Couldn't save that. Please try again." };
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

export interface SetOpportunityDisabledResult {
  error?: string;
  changed?: boolean;
}

/**
 * oryn-a7's own named example, personally hit tonight: their own attempt to disable a bad
 * opportunity record was blocked by the RLS permission layer (migration 0014 gives
 * `opportunities` a select-only policy for authenticated users -- no write policy for any
 * normal role, by design, same as every other global reference table), and the founder had
 * to run raw SQL again. No new migration -- `status` already has `"disabled"` as a real
 * value (types/database.ts) and every student-facing read already filters
 * `.eq("status", "active")` (lib/opportunities/browse.ts, app/(app)/opportunities/page.tsx),
 * so writing this column is already sufficient to hide a bad record everywhere a student
 * would see it. This is that write path, through the one client that can actually make it
 * (createAdminClient(), same as removeReportedPost/restoreReportedPost above).
 *
 * A reason is required to disable, same rule post-removal-control.tsx already enforces for
 * posts -- the reason is the audit trail (logged to admin_action_log's `detail`, not a new
 * column: unlike a post, an opportunity has no "author" who needs to keep seeing their own
 * disabled content with a notice, so the lighter posts-lack-that-half version is enough
 * here). No reason required to reactivate.
 *
 * Reactivating always restores to `"active"`, never to whatever status (e.g. "expired",
 * "under_review") the row held before being disabled -- a deliberate simplification, not an
 * oversight: nothing student-facing distinguishes those two statuses from "disabled" (only
 * "active" is ever shown), so which one a reactivated row lands on has no visible effect.
 * Flag if a case needs the distinction restored.
 */
export async function setOpportunityDisabled(opportunityId: string, disabled: boolean, reason?: string): Promise<SetOpportunityDisabledResult> {
  const adminProfile = await requireAdmin();
  if (!isUuidLike(opportunityId)) return { error: "Invalid opportunity." };
  const trimmedReason = reason?.trim();
  if (disabled && !trimmedReason) return { error: "A reason is required to disable an opportunity." };

  const admin = createAdminClient();
  const { data: before, error: readError } = await admin.from("opportunities").select("status, title").eq("id", opportunityId).maybeSingle();
  if (readError || !before) {
    console.error("[admin] failed to read opportunity before setting disabled state", { opportunityId, error: readError });
    return { error: "Couldn't find that opportunity." };
  }

  const targetStatus = disabled ? "disabled" : "active";
  if (before.status === targetStatus) return { changed: false };

  const { data: updated, error } = await admin.from("opportunities").update({ status: targetStatus }).eq("id", opportunityId).select("id");
  if (error) {
    console.error("[admin] failed to set opportunity disabled state", { opportunityId, targetStatus, error });
    return { error: "Couldn't save that. Please try again." };
  }
  if (!updated || updated.length === 0) {
    console.error("[admin] opportunity disabled-state update matched zero rows", { opportunityId, targetStatus });
    return { error: "That saved nothing — 0 rows were updated. The record may have just been deleted." };
  }

  await logAdminAction(admin, {
    adminProfile,
    action: disabled ? "disable_opportunity" : "reactivate_opportunity",
    targetLabel: before.title,
    detail: { from: before.status, to: targetStatus, reason: trimmedReason ?? null, opportunityId },
  });

  revalidatePath("/admin");
  return { changed: true };
}

/**
 * The moderation list's own search, called from OpportunityModerationList (a client
 * component — search-as-you-type needs client state, unlike every other section on this
 * page, which fetches once server-side and re-renders via router.refresh()). Thin wrapper:
 * getAdminOpportunityList already does the real work, this just adds the requireAdmin()
 * gate a Server Action needs regardless of what the page-level check already did.
 */
export async function searchAdminOpportunities(q?: string): Promise<{ rows: AdminOpportunityRow[]; error?: string }> {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    return { rows: await getAdminOpportunityList(admin, q) };
  } catch (error) {
    console.error("[admin] opportunity search failed", { q, error });
    return { rows: [], error: "Couldn't search opportunities. Please try again." };
  }
}
