import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Wraps a background job body with an external_sync_jobs row (Phase 30) so the admin panel can see run history without digging through platform logs. */
export async function runWithTracking<T>(jobName: string, fn: () => Promise<{ itemsProcessed: number; result: T }>): Promise<T> {
  const supabase = createAdminClient();
  const { data: job } = await supabase
    .from("external_sync_jobs")
    .insert({ job_name: jobName, status: "running" })
    .select()
    .single();

  try {
    const { itemsProcessed, result } = await fn();
    if (job) {
      await supabase
        .from("external_sync_jobs")
        .update({ status: "succeeded", finished_at: new Date().toISOString(), items_processed: itemsProcessed })
        .eq("id", job.id);
    }
    return result;
  } catch (error) {
    if (job) {
      await supabase
        .from("external_sync_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", job.id);
    }
    throw error;
  }
}
