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
