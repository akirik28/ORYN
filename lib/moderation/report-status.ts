import type { MessageReportStatus } from "@/types/database";

/** Single source of truth for the four review states a message_reports row can be in
 * (migration 0030) — matches the Postgres enum exactly. Kept as a plain, pure module so
 * the admin UI (features/admin/report-review-control.tsx) and a test can both import it
 * without pulling in React or Supabase. */
export const REPORT_STATUS_OPTIONS: { value: MessageReportStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];
