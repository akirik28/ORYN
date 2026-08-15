import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { discoverOpportunitiesForQuery, DEFAULT_DISCOVERY_QUERIES } from "@/lib/opportunities/discover";

/**
 * Scheduled job (Phase 30, Job A): runs the opportunity discovery pipeline across a
 * handful of search queries. Trigger with:
 *   curl -X POST /api/jobs/discover-opportunities -H "Authorization: Bearer $CRON_SECRET"
 * Optionally pass ?query=... to run a single custom query instead of the default set.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customQuery = request.nextUrl.searchParams.get("query");
  const queries = customQuery ? [customQuery] : DEFAULT_DISCOVERY_QUERIES;

  const results = await runWithTracking("discover_opportunities", async () => {
    const runs = [];
    for (const query of queries) {
      runs.push(await discoverOpportunitiesForQuery(query));
    }
    const itemsProcessed = runs.reduce((sum, r) => sum + r.opportunitiesStored, 0);
    return { itemsProcessed, result: runs };
  });

  return NextResponse.json({ runs: results });
}
