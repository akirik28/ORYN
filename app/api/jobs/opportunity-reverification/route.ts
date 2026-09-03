import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { isJobDisabled } from "@/lib/jobs/job-controls";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReverificationPass, DEFAULT_MAX_ROWS, DEFAULT_BUDGET_MS } from "@/lib/opportunities/reverification/run-job";

/**
 * Scheduled job (Phase 30, Job B "upcoming deadline validation" / Job E "stale data
 * detection" — one job does both, design doc §2.4: "the same fetch of the same page
 * differing only in what is compared afterwards"). Not yet added to vercel.json — this
 * design's own §2.4 keeps the scheduler off deliberately ("the job is correct without one"),
 * and §10.4's acceptance gate requires a human-reviewed dry run before anything beyond
 * flag-only (REVERIFY_ALLOW_DEMOTION unset) operation. Trigger manually:
 *   curl -X POST /api/jobs/opportunity-reverification \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"max_rows": 10, "budget_ms": 45000}'
 *
 * Body per design doc §2.3, all optional: max_rows (default 25), budget_ms (default 45000),
 * allow_demotion (can only narrow REVERIFY_ALLOW_DEMOTION off for this one call, never widen
 * it on — see run-job.ts's own comment on why).
 *
 * dry_run (2026-09-03, added for design doc §10's dry run): no writes at all — see
 * run-job.ts's own RunOptions.dryRun doc comment for the exact guarantee. Also supported
 * this way rather than only via §10.2's pictured standalone script: everything under
 * lib/opportunities/reverification/ (like nearly everything server-side in this codebase)
 * is guarded with `import "server-only"`, a Next.js build-time marker not a real
 * standalone npm package — a plain `tsx`/`node` script needs a one-line no-op shim on its
 * module path to resolve it at all (the real package IS a no-op outside a browser; only its
 * *resolvability* is Next-bundler-specific — see scripts/opportunity-reverification-dry-run.ts's
 * own header for the exact mechanism). The route needs no such workaround:
 *   curl -X POST /api/jobs/opportunity-reverification \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{"max_rows": 20, "budget_ms": 240000, "dry_run": true}'
 *
 * A dry run deliberately bypasses runWithTracking entirely rather than passing dryRun
 * through it — that wrapper writes a real external_sync_jobs row on every call (start,
 * finish, status), and "no writes at all" should mean exactly that, not "no writes except
 * the job's own tracking metadata." A dry run therefore leaves no trace in run history at
 * all, which is the honest behaviour for something that isn't a real run.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Same admin-panel "disable future runs" gate every other job route checks first — see
  // lib/jobs/job-controls.ts's own comment for why this must run before any real work.
  if (await isJobDisabled(createAdminClient(), "opportunity_reverification")) {
    return NextResponse.json({ skipped: true, reason: "disabled" });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const params = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const maxRows = typeof params.max_rows === "number" && params.max_rows > 0 ? Math.floor(params.max_rows) : DEFAULT_MAX_ROWS;
  const budgetMs = typeof params.budget_ms === "number" && params.budget_ms > 0 ? Math.floor(params.budget_ms) : DEFAULT_BUDGET_MS;
  const allowDemotion = typeof params.allow_demotion === "boolean" ? params.allow_demotion : undefined;

  if (params.dry_run === true) {
    const runResult = await runReverificationPass({ maxRows, budgetMs, allowDemotion, jobId: null, dryRun: true });
    return NextResponse.json(runResult);
  }

  const result = await runWithTracking("opportunity_reverification", async (jobId) => {
    const runResult = await runReverificationPass({ maxRows, budgetMs, allowDemotion, jobId, dryRun: false });
    // errorsEncountered per run-with-tracking.ts's own contract: attempted-but-not-committed
    // rows, i.e. ones whose per-row pipeline threw before writing any run record at all
    // (JobBudgetExceededError aside, which stops the batch cleanly rather than counting as
    // an error for any one row).
    return { itemsProcessed: runResult.committed, errorsEncountered: Math.max(0, runResult.attempted - runResult.committed), result: runResult };
  });

  return NextResponse.json(result);
}

/**
 * Vercel Cron invokes scheduled routes with GET and no body — same alias every other job
 * route uses (see e.g. discover-opportunities/route.ts). `request.json()` above already
 * falls back to `{}` on a bodyless GET, so every option simply takes its default.
 */
export const GET = POST;

export const dynamic = "force-dynamic";
