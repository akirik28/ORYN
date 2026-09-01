import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { detectStaleData } from "@/lib/jobs/detect-stale-data";

/**
 * Scheduled job (Phase 30, Job E — stale data detection). Not wired into vercel.json;
 * scheduling this is a deployment decision for the founder, not something this route
 * assumes. Safely inert without CRON_SECRET regardless (verifyCronRequest refuses
 * everything when it's unset). Run manually or on whatever cadence is chosen:
 *   curl -X POST /api/jobs/detect-stale-data -H "Authorization: Bearer $CRON_SECRET"
 *
 * Stored-data-only: recomputes `data_status` on universities and university_requirements
 * from existing timestamps, no source re-fetch. Does not cover opportunities (no
 * data_status column there; see docs/opportunity-reverification-job-design-2026-08-23.md
 * for that table's own, larger, unbuilt job) or university_deadlines (migration 0074 adds
 * the columns but is not yet applied live). Full reasoning, including what this job
 * structurally cannot detect, is in lib/jobs/detect-stale-data.ts's own top comment.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWithTracking("detect_stale_data", async () => detectStaleData());

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
