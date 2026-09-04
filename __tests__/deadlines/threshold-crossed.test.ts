import { describe, expect, test } from "vitest";
import { thresholdCrossed } from "@/lib/deadlines/scan";

/**
 * Pure date-arithmetic coverage for the reminder-threshold check every deadline source in
 * lib/deadlines/scan.ts shares. Replaces __tests__/deadlines/notify-if-threshold-crossed.test.ts's
 * threshold-matching half after this package split "does this cross a threshold" (this
 * function) from "has it already fired" (deadline_notification_log — see
 * dedupe-and-aggregation.test.ts) and "what does the notification say"
 * (build-digest-notification.test.ts) — the old function did all three inline, which is
 * exactly what made per-item, unaggregated notifications the only option. Dedup/aggregation
 * behavior itself is intentionally NOT re-tested here; this file is scoped to date math only.
 *
 * 30 is included below because it's new: REMINDER_THRESHOLDS was [14, 7, 3, 1] until this
 * package, silently missing Phase 23's own outermost bucket. 1 is kept even though it isn't
 * literally in the spec's 3/7/14/30 list — a same-day-tomorrow alert is a deliberate,
 * pre-existing addition, not something this package is removing.
 *
 * CORRECTED 2026-09-04: every "in-between" case below used to expect `null` — the function
 * required EXACT equality against REMINDER_THRESHOLDS, so a deadline 6 days out (between the
 * 7- and 3-day buckets) matched nothing, ever. That was the actual bug this fix addresses
 * (see docs/application-tracker-notification-audit-2026-09-04.md and thresholdCrossed's own
 * updated comment in lib/deadlines/scan.ts) — these cases now expect the NEAREST bucket the
 * deadline has already reached, not null. Only two things still return null: more than 30
 * days out (nothing applies yet) and already past (nothing to remind about any more).
 */

const TODAY = new Date("2026-09-02T00:00:00");

/** Builds the "YYYY-MM-DD" a deadline column would actually hold, N calendar days after
 * TODAY — entirely via UTC arithmetic on TODAY's own (host-timezone-local) Y/M/D parts,
 * deliberately never through a local-Date-then-toISOString() round trip, which is
 * timezone-dependent and produced false failures the first time this exact fixture pattern
 * was written for __tests__/deadlines/notify-if-threshold-crossed.test.ts. Confirmed
 * directly against date-fns's own differenceInCalendarDays. */
function dateStringDaysFromToday(daysOut: number): string {
  const utcToday = Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  return new Date(utcToday + daysOut * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("thresholdCrossed", () => {
  const cases: { daysOut: number; expected: number | null }[] = [
    { daysOut: 30, expected: 30 },
    { daysOut: 14, expected: 14 },
    { daysOut: 7, expected: 7 },
    { daysOut: 3, expected: 3 },
    { daysOut: 1, expected: 1 },
    { daysOut: 0, expected: 1 }, // due today — already inside every bucket, nearest is 1
    { daysOut: 2, expected: 3 },
    { daysOut: 4, expected: 7 },
    { daysOut: 6, expected: 7 }, // the live shape this fix was written for (Oxford, 2026-09-04)
    { daysOut: 8, expected: 14 },
    { daysOut: 13, expected: 14 },
    { daysOut: 15, expected: 30 },
    { daysOut: 29, expected: 30 },
    { daysOut: 31, expected: null }, // still more than 30 days out — nothing applies yet
    { daysOut: -1, expected: null },
    { daysOut: -14, expected: null },
  ];

  for (const { daysOut, expected } of cases) {
    test(`${daysOut} day(s) out ${expected === null ? "does NOT cross a threshold" : `is caught by the ${expected}-day bucket`}`, () => {
      expect(thresholdCrossed(dateStringDaysFromToday(daysOut), TODAY)).toBe(expected);
    });
  }

  test("a past deadline never crosses a threshold, however far past", () => {
    expect(thresholdCrossed("2020-01-01", TODAY)).toBeNull();
  });
});
