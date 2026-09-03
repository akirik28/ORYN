import type { ReverificationCandidate } from "./types";

/**
 * Design doc §3.1, by lifecycle state only — §3.2's opportunity-type dimension is explicitly
 * NOT implemented ("ship with state TTLs only. The type dimension activates when
 * `deadline_mode` lands" — that column doesn't exist; see lib/opportunities/lifecycle.ts's
 * own DEADLINE_MODES_WITHOUT_A_FIXED_DATE comment for the same standing gap). Every number
 * here answers "how long can this row's claim be wrong before a student is harmed by it?",
 * argued at length in §3.1 — not reproduced per-bucket here since the design doc is the
 * source of truth for the reasoning; this file only encodes the resulting numbers.
 */
export const TTL_DAYS = {
  OPEN_NO_DEADLINE: 7,
  OPEN_WITH_DEADLINE: 7,
  /** Inside T-14 of a stated deadline — tied to `REMINDER_THRESHOLDS` in
   * lib/deadlines/scan.ts starting to notify students at 14 days out, per §3.1's own
   * reasoning: data behind an active outbound push should be days old, not weeks. */
  OPEN_WITH_DEADLINE_INSIDE_T14: 3,
  UPCOMING_NO_DEADLINE: 7,
  UPCOMING_WITH_DEADLINE: 14,
  DATE_NOT_ANNOUNCED: 21,
  UNVERIFIED: 30,
  CLOSED_OR_HISTORICAL: 45,
  DISCONTINUED: 180,
} as const;

function daysUntil(referenceDate: Date, isoDate: string): number {
  const deadlineMs = Date.parse(`${isoDate}T23:59:59`);
  // A malformed date string can't be reasoned about — treat as "far away" so it falls back
  // to the baseline (non-tightened) TTL rather than accidentally triggering the T-14 rush
  // window on bad data.
  if (Number.isNaN(deadlineMs)) return Infinity;
  return (deadlineMs - referenceDate.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * The TTL a row is due against right now. `deadline` is read directly (not through
 * lib/opportunities/lifecycle.ts's `hasDeadlineCommitment`, which also considers the
 * unimplemented `deadline_mode`) — for TTL purposes only a real stored date changes the
 * number, matching §3.1's own table, which is keyed on "future deadline" / "no deadline",
 * not on the rolling-programme concept `deadline_mode` would eventually add.
 */
export function effectiveTtlDays(candidate: Pick<ReverificationCandidate, "cycleStatus" | "deadline">, referenceDate: Date = new Date()): number {
  switch (candidate.cycleStatus) {
    case "open": {
      if (!candidate.deadline) return TTL_DAYS.OPEN_NO_DEADLINE;
      const remaining = daysUntil(referenceDate, candidate.deadline);
      // Only a genuinely upcoming deadline (0-14 days out) rushes the cadence — a deadline
      // already in the past gets the baseline, not the tightened, TTL: lib/opportunities/
      // lifecycle.ts already excludes a past-deadline row from recommendation, so there is
      // no active outbound push to protect the way §3.1's T-14 reasoning is about.
      if (remaining >= 0 && remaining <= 14) return TTL_DAYS.OPEN_WITH_DEADLINE_INSIDE_T14;
      return TTL_DAYS.OPEN_WITH_DEADLINE;
    }
    case "upcoming":
      return candidate.deadline ? TTL_DAYS.UPCOMING_WITH_DEADLINE : TTL_DAYS.UPCOMING_NO_DEADLINE;
    case "date_not_announced":
      return TTL_DAYS.DATE_NOT_ANNOUNCED;
    case "unverified":
      return TTL_DAYS.UNVERIFIED;
    case "closed":
    case "historical":
      return TTL_DAYS.CLOSED_OR_HISTORICAL;
    case "discontinued":
      return TTL_DAYS.DISCONTINUED;
  }
}
