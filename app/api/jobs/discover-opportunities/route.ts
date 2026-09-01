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
      const run = await discoverOpportunitiesForQuery(query);
      runs.push(run);
      // Once one query's run stops for budget (lib/ai/limits/job-budget.ts), every
      // remaining query this batch would hit the same check on its very first candidate —
      // stop starting new ones rather than spend Tavily searches on runs that can't do any
      // AI work anyway.
      if (run.stoppedForBudget) break;
    }
    const itemsProcessed = runs.reduce((sum, r) => sum + r.opportunitiesStored, 0);
    return { itemsProcessed, result: runs };
  });

  return NextResponse.json({ runs: results });
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
