import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/jobs/verify-cron-request";
import { runWithTracking } from "@/lib/jobs/run-with-tracking";
import { scanDeadlines } from "@/lib/deadlines/scan";

/**
 * Scheduled job (Phase 30, Job B). Run daily:
 *   curl -X POST /api/jobs/deadline-reminders -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWithTracking("deadline_reminders", async () => {
    const { notified, checked } = await scanDeadlines();
    return { itemsProcessed: notified, result: { notified, checked } };
  });

  return NextResponse.json(result);
}
