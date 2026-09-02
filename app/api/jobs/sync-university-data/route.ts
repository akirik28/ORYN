import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { isJobDisabled } from "@/lib/jobs/job-controls";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUsUniversities, DEFAULT_US_UNIVERSITIES } from "@/lib/universities/sync-us-universities";

/**
 * Scheduled job (Phase 30, Job C: university data freshness). Trigger with:
 *   curl -X POST /api/jobs/sync-university-data -H "Authorization: Bearer $CRON_SECRET"
 * Pass ?school=Some+University to sync a single institution instead of the default list.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (await isJobDisabled(createAdminClient(), "sync_us_universities")) {
    return NextResponse.json({ skipped: true, reason: "disabled" });
  }

  const customSchool = request.nextUrl.searchParams.get("school");
  const schools = customSchool ? [customSchool] : DEFAULT_US_UNIVERSITIES;

  const results = await runWithTracking("sync_us_universities", async () => {
    const runs = await syncUsUniversities(schools);
    const itemsProcessed = runs.filter((r) => r.status === "created" || r.status === "updated").length;
    const errorsEncountered = runs.filter((r) => r.status === "error").length;
    return { itemsProcessed, errorsEncountered, result: runs };
  });

  return NextResponse.json({ results });
}

/**
 * Vercel Cron invokes scheduled routes with GET — never POST — and supplies
 * `Authorization: Bearer $CRON_SECRET` itself, which is exactly what verifyCronRequest
 * already checks. Without this alias the cron entry in vercel.json would get a 405 on
 * every run and the job would silently never execute. POST stays the documented manual
 * trigger (see the curl line above); both share one implementation deliberately.
 */
export const GET = POST;

/**
 * A GET that mutates must never be served from a cache: a cached 200 would make the cron
 * look healthy in the Vercel dashboard while the job body never ran. Reading the
 * Authorization header already forces dynamic handling here — this makes it explicit
 * rather than a side effect that a future refactor could quietly remove.
 */
export const dynamic = "force-dynamic";
