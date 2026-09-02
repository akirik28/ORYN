import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { isJobDisabled } from "@/lib/jobs/job-controls";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanDeadlines } from "@/lib/deadlines/scan";

/**
 * Scheduled job (Phase 24 notification; NOT Phase 30 Job B — this sends notifications
 * about deadlines already stored, it never re-reads a source to validate them. Real Job B
 * is docs/opportunity-reverification-job-design-2026-08-23.md's `opportunity_reverification`
 * design, unbuilt as of this writing. See that doc's §1.3 for why the name moved — and see
 * lib/deadlines/scan.ts's own scanDeadlines() docstring, which already carries this
 * correction; this route's docstring was the one place it hadn't propagated to). Run daily:
 *   curl -X POST /api/jobs/deadline-reminders -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (await isJobDisabled(createAdminClient(), "deadline_reminders")) {
    return NextResponse.json({ skipped: true, reason: "disabled" });
  }

  const result = await runWithTracking("deadline_reminders", async () => {
    const { notified, checked } = await scanDeadlines();
    // No per-item external call in this scan that can fail short of the whole run
    // throwing (it reads already-stored deadlines and writes notifications) — 0 is a real
    // fact here, not a placeholder standing in for a count nobody computed.
    return { itemsProcessed: notified, errorsEncountered: 0, result: { notified, checked } };
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
