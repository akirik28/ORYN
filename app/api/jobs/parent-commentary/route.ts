import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { runParentMonthlyCommentaryPass } from "@/lib/digest/parent-commentary-run";

/**
 * B3b's missing connection (2026-09-05) — lib/digest/parent-commentary-run.ts was BUILT,
 * TESTED, and MERGED (f656db2a) with no route calling it at all: not in vercel.json, not in
 * lib/jobs/schedule.ts's JOB_DEFINITIONS, not in any admin "run now" list. Logic correct,
 * dead.
 *
 * NOT wired into vercel.json and NOT added to lib/jobs/schedule.ts's JOB_DEFINITIONS —
 * matching generate-weekly-plans' (Job D) and scheduled-review's own precedent exactly (see
 * schedule.ts's own comment above JOB_DEFINITIONS, and docs/job-dry-run-audit-2026-09-03.md):
 * scheduled-review was briefly added to both, without the founder-sign-off gate having been
 * checked first, and pulled back out the same day. Adding either here would repeat that
 * exact mistake for a second job. Both stay out until the founder arms this one specifically.
 *
 * Hardcoded to `dryRun: true`, not threaded from the request body — CEO's explicit
 * instruction (2026-09-05): the real-send key belongs to the founder, and this route must
 * not offer a way to flip it, not even via a query param nobody's supposed to use. A dry run
 * still exercises every real read and every real AI call there's signal for; the only thing
 * it suppresses is the one write parent-commentary-run.ts makes
 * (parent_links.last_commentary_sent_at) — see that file's own ParentCommentaryRunOptions
 * comment. This route sends no email to anyone under any input, because no email-sending
 * infrastructure exists anywhere in this codebase yet (that file's own header, same
 * reasoning as lib/digest/run.ts's student digest).
 *
 * Real and safe to trigger manually in the meantime, same as scheduled-review:
 *   curl -X POST /api/jobs/parent-commentary -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWithTracking("parent_monthly_commentary", async () => {
    const run = await runParentMonthlyCommentaryPass({ dryRun: true });
    // wouldSend + skippedNotPremium + skippedNotDue always equals attempted here (dryRun is
    // hardcoded true above, so `sent` is structurally always 0) — items_processed counts
    // links that actually got as far as content assembly, matching runWithTracking's own
    // "0 must mean nothing had signal, not nothing was tried" contract.
    return { itemsProcessed: run.wouldSend, errorsEncountered: 0, result: run };
  });

  return NextResponse.json(result);
}

/**
 * Vercel Cron invokes scheduled routes with GET — never POST — and supplies
 * `Authorization: Bearer $CRON_SECRET` itself, which is exactly what verifyCronRequest
 * already checks. Both share one implementation deliberately; POST stays the documented
 * manual trigger. Irrelevant while this route isn't in vercel.json at all, kept for the
 * moment the founder arms it — that step shouldn't also require remembering this alias.
 */
export const GET = POST;

/**
 * A GET must never be served from a cache here: a cached 200 would make a future cron look
 * healthy without the body ever running. Reading the Authorization header already forces
 * dynamic handling; this makes it explicit rather than a side effect a future refactor could
 * quietly remove.
 */
export const dynamic = "force-dynamic";
