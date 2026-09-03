import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { isJobDisabled } from "@/lib/jobs/job-controls";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRetentionPass, DEFAULT_MAX_ROWS } from "@/lib/advisor/retention";

/**
 * The 24-hour inactivity retention job (docs/ozellesme-spec-2026-09-03.md §3). NOT added to
 * vercel.json — this is deliberate and load-bearing, not an oversight: the spec itself says
 * this feature "cannot be implemented before the privacy notice says so," and
 * LEGAL_REVIEW.md §3 item 5 lists retention as an open policy question with no answer today.
 * Whoever arms this route also needs `ADVISOR_RETENTION_ALLOW_DELETE=true` for the delete
 * step specifically to do anything (see lib/advisor/retention.ts's own header on the two
 * independent gates) — both are unset by default, matching REVERIFY_ALLOW_DEMOTION's own
 * "ships off" posture in the closest analog to this job. Trigger manually once those
 * preconditions are actually met:
 *   curl -X POST /api/jobs/advisor-conversation-retention \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{"max_rows": 10}'
 *
 * dry_run (default false in the body, but runRetentionPass itself defaults dryRun to true —
 * this route must pass an explicit `dryRun: false` to ever write anything, same
 * belt-and-suspenders shape as REVERIFY_ALLOW_DEMOTION defaulting off): real reads and a
 * real, budgeted AI summarization call still happen on a dry run — see retention.ts's own
 * doc comment for why that's the correct contract, not a bug.
 *   curl -X POST /api/jobs/advisor-conversation-retention \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{"max_rows": 10, "dry_run": true}'
 *
 * A dry run bypasses runWithTracking entirely, same reasoning as opportunity-reverification's
 * own route: "no writes at all" should mean exactly that, not "no writes except the job's own
 * tracking metadata."
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (await isJobDisabled(createAdminClient(), "advisor_conversation_retention")) {
    return NextResponse.json({ skipped: true, reason: "disabled" });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const params = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const maxRows = typeof params.max_rows === "number" && params.max_rows > 0 ? Math.floor(params.max_rows) : DEFAULT_MAX_ROWS;

  if (params.dry_run === true) {
    const runResult = await runRetentionPass({ maxRows, jobId: null, dryRun: true });
    return NextResponse.json(runResult);
  }

  const result = await runWithTracking("advisor_conversation_retention", async (jobId) => {
    const runResult = await runRetentionPass({ maxRows, jobId, dryRun: false });
    return { itemsProcessed: runResult.summarized + runResult.messagesDeleted, errorsEncountered: runResult.degraded ? 1 : 0, result: runResult };
  });

  return NextResponse.json(result);
}

export const GET = POST;
export const dynamic = "force-dynamic";
