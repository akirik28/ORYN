import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { discoverRequirementsForUncoveredUniversities } from "@/lib/requirements/discover";

/**
 * Scheduled job (Phase 69 follow-up to Phase 30's Job A pattern): finds official
 * requirement pages for universities with no university_requirements rows yet and
 * populates them. Bounded batch (default 5 universities/run — see
 * lib/requirements/discover.ts) so cost per invocation stays predictable; schedule this to
 * run as often as your Tavily/Anthropic budget allows. Trigger with:
 *   curl -X POST /api/jobs/discover-requirements -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runWithTracking("discover_requirements", async () => {
    const runs = await discoverRequirementsForUncoveredUniversities();
    const itemsProcessed = runs.reduce((sum, r) => sum + r.requirementsStored, 0);
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
