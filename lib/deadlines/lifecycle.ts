import type { UniversityDeadline } from "@/types/database";

/**
 * A `dated_specific` university deadline only belongs under a heading that says "Upcoming" if
 * its own date hasn't passed. `verification_state` (NON_ACTIONABLE_VERIFICATION_STATES,
 * lib/deadlines/ingest.ts) answers a different question — whether the cycle itself is closed —
 * and was, for a while, the only filter this page's read path applied. Mirrors
 * lib/deadlines/upcoming.ts's own `.gte("deadline_date", today)` read-path filter: same rule,
 * expressed for an in-memory array instead of a Supabase query builder, so the two paths can't
 * silently re-diverge on what "upcoming" means. `today` is a caller-supplied ISO `YYYY-MM-DD`
 * string (matching upcoming.ts's `new Date().toISOString().slice(0, 10)`) rather than computed
 * inside this function, so a test can pin behavior around a fixed date without depending on
 * the real clock.
 */
export function isDatedDeadlineUpcoming(
  deadline: Pick<UniversityDeadline, "recurrence" | "deadline_date">,
  today: string
): boolean {
  return deadline.recurrence === "dated_specific" && deadline.deadline_date !== null && deadline.deadline_date >= today;
}
