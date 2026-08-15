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
import type { MessageReportStatus } from "@/types/database";

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
      return { itemsProcessed: runs.reduce((sum, r) => sum + r.opportunitiesStored, 0), result: runs };
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
      return { itemsProcessed: runs.filter((r) => r.status === "created" || r.status === "updated").length, result: runs };
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
      return { itemsProcessed: notified, result: { notified, checked } };
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
      return { itemsProcessed: runs.reduce((sum, r) => sum + r.requirementsStored, 0), result: runs };
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
