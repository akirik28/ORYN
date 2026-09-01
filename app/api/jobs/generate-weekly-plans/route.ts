import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { generateWeeklyPlansForActiveStudents } from "@/lib/plan/generate-for-active-students";

/**
 * Scheduled job (Phase 30, Job D / Phase 9: weekly student plan generation). Proactively
 * generates this week's plan for every onboarded student, rather than only the lazy
 * first-dashboard-visit-of-the-week path in app/(app)/dashboard/page.tsx. Deliberately
 * calls getOrCreateWeeklyPlan without force (see lib/plan/generate-for-active-students.ts
 * and docs/scheduled-jobs-phase30-mapping-2026-09-01.md §4) -- this can only create a plan
 * that doesn't exist yet for the current ISO week, never overwrite one that does, so it
 * cannot reach the destructive delete branch a force:true regenerate can.
 *
 * NOT wired into vercel.json and NOT added to lib/jobs/schedule.ts's JOB_DEFINITIONS --
 * both are deliberately left for whoever turns this on, since scheduling it means paying
 * for an AI call per onboarded student on a recurring cadence (see this package's own
 * cost report for real, ai_usage-grounded per-student numbers at a few candidate scales).
 * Until then this route is real and safe to trigger manually, but inert on its own:
 *   curl -X POST /api/jobs/generate-weekly-plans -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runWithTracking("generate_weekly_plans", async () => {
    const runs = await generateWeeklyPlansForActiveStudents();
    const itemsProcessed = runs.filter((r) => r.status === "generated").length;
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
