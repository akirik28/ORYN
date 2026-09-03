import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserList } from "@/lib/admin/queries";
import { buildCohortCsv } from "@/lib/admin/cohort-csv";

/**
 * Cohort export — the one action from docs/admin-growth-panel-2026-09-02.md's list with no
 * UI action of its own beyond "download": every signed-up student, one CSV row each, same
 * fields the People tab's user list already shows (getAdminUserList). A route handler
 * rather than a Server Action, since a Server Action can't hand the browser a real
 * file-download response — same reasoning as app/api/export-data/route.ts, the student's
 * own equivalent for this shape.
 */
export async function GET() {
  await requireAdmin();

  const admin = createAdminClient();
  const users = await getAdminUserList(admin);
  const csv = buildCohortCsv(users);
  const filename = `oryn-cohort-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
