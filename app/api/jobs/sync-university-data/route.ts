import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
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

  const customSchool = request.nextUrl.searchParams.get("school");
  const schools = customSchool ? [customSchool] : DEFAULT_US_UNIVERSITIES;

  const results = await runWithTracking("sync_us_universities", async () => {
    const runs = await syncUsUniversities(schools);
    const itemsProcessed = runs.filter((r) => r.status === "created" || r.status === "updated").length;
    return { itemsProcessed, result: runs };
  });

  return NextResponse.json({ results });
}
