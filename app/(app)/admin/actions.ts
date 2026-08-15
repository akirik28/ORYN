"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/require-admin";
import { discoverOpportunitiesForQuery, DEFAULT_DISCOVERY_QUERIES } from "@/lib/opportunities/discover";
import { syncUsUniversities, DEFAULT_US_UNIVERSITIES } from "@/lib/universities/sync-us-universities";
import { scanDeadlines } from "@/lib/deadlines/scan";
import { discoverRequirementsForUncoveredUniversities } from "@/lib/requirements/discover";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";

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
