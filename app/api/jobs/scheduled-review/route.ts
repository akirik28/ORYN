import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { runScheduledReview } from "@/lib/scoring/scheduled-review";

/**
 * Scheduled job (Phase 41's "or scheduled review" half — see
 * docs/scheduled-review-audit-2026-09-02.md for why this needs to exist, and
 * lib/scoring/scheduled-review.ts for the full reasoning). Recomputes every onboarded
 * student's career profile on a monthly cadence, so a dormant student's displayed score
 * and monthly-review baseline don't silently go stale even when nothing they did
 * triggered a recompute.
 *
 * NOT wired into vercel.json and NOT added to lib/jobs/schedule.ts's JOB_DEFINITIONS —
 * both deliberately left for whoever turns this on, matching generate-weekly-plans'
 * (Job D) own precedent: anything that changes production behavior on deploy is
 * founder-gated. Unlike Job D this has no AI cost (scoring is pure arithmetic), but the
 * gating rule doesn't carve out an exception for a cheap job. Real and safe to trigger
 * manually in the meantime:
 *   curl -X POST /api/jobs/scheduled-review -H "Authorization: Bearer $CRON_SECRET"
 *
 * Intended cadence: monthly — matching lib/scoring/monthly-review.ts's own
 * REVIEW_WINDOW_DAYS (30), so getMonthlyReview's "baseline from 30+ days ago" lookup
 * reliably finds a recent snapshot even for a student who never edits their profile.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runWithTracking("scheduled_review", async () => {
    const runs = await runScheduledReview();
    const itemsProcessed = runs.filter((r) => r.status === "snapshot_written").length;
    const errorsEncountered = runs.filter((r) => r.status === "error").length;
    return { itemsProcessed, errorsEncountered, result: runs };
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
