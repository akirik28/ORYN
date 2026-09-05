import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { scanUniversityDataChanges } from "@/lib/universities/data-change-scan";

/**
 * Scheduled job (Phase 24 notification). Armed in vercel.json (0 7 * * *, 2026-09-03) — see
 * docs/job-dry-run-audit-2026-09-03.md for the pre-arm dry run of this job specifically,
 * including a live-data finding worth reading before its first real run: right now, every
 * candidate notification traces to this project's own catalogue-research backfill landing
 * after a student started tracking a university, not to a genuine external change. This
 * route is also safely inert without CRON_SECRET regardless (verifyCronRequest refuses
 * everything when it's unset). Run manually or on whatever cadence is chosen:
 *   curl -X POST /api/jobs/notify-university-changes -H "Authorization: Bearer $CRON_SECRET"
 *
 * Aggregates every changed tracked university into one notification per student per run —
 * see lib/universities/data-change-scan.ts's own top comment for the full reasoning,
 * including what this job can and cannot detect (only U.S. universities Job C has
 * re-synced with a genuine field difference; not university_requirements or
 * university_deadlines, which have their own or no coverage respectively).
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWithTracking("notify_university_changes", async () => {
    const { notified, checked, failed } = await scanUniversityDataChanges();
    // `failed` (2026-09-05 fix) counts only genuine createNotification write errors, never a
    // student's own muted-category preference — see that function's own updated docstring
    // for why those two used to collapse into the same reported 0 here.
    return { itemsProcessed: notified, errorsEncountered: failed, result: { notified, checked, failed } };
  });

  return NextResponse.json(result);
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
