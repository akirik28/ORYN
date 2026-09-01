import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { scanStaleOutlooks } from "@/lib/admissions/scan";

/**
 * Scheduled job. Weekly backstop for admission-outlook staleness — see
 * lib/admissions/scan.ts's own doc comment for why this exists alongside the read-time
 * refresh in lib/universities/queries.ts rather than instead of it.
 *   curl -X POST /api/jobs/refresh-admission-outlooks -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWithTracking("refresh_admission_outlooks", async () => {
    const { checked, refreshed, refused, failed } = await scanStaleOutlooks();
    return { itemsProcessed: refreshed, result: { checked, refreshed, refused, failed } };
  });

  return NextResponse.json(result);
}

/**
 * Vercel Cron invokes scheduled routes with GET, never POST — see deadline-reminders'
 * identical alias for the failure this prevents (a silent 405 that never runs the job).
 */
export const GET = POST;

/** A GET that mutates must never be served from a cache — see deadline-reminders' identical note. */
export const dynamic = "force-dynamic";
