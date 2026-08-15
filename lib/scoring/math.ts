import { differenceInCalendarMonths, differenceInCalendarDays, addMonths } from "date-fns";

/** Rounds to the nearest integer and clamps into the 0-100 range every score must live in. */
export function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Fractional months between two dates using exact calendar-month boundaries (not a
 * 30-day average), so whole-month spans come back as exact integers. `end: null` means
 * an ongoing commitment — it's measured up to `referenceDate` (defaults to now). A start
 * date after the reference date (bad data, or a typo) returns 0 rather than a negative
 * duration.
 */
export function monthsBetween(
  start: string | Date,
  end: string | Date | null,
  referenceDate: Date = new Date()
): number {
  const startDate = toDate(start);
  const endDate = end ? toDate(end) : referenceDate;

  if (endDate <= startDate) return 0;

  const wholeMonths = differenceInCalendarMonths(endDate, startDate);
  const anchor = addMonths(startDate, wholeMonths);
  const remainderDays = differenceInCalendarDays(endDate, anchor);
  const daysInPartialMonth = differenceInCalendarDays(addMonths(anchor, 1), anchor) || 30;

  return wholeMonths + remainderDays / daysInPartialMonth;
}

export interface CommitmentItem {
  label: string;
  basePoints: number;
}

export interface CommitmentOptions {
  /** Ceiling on any single commitment's contribution, applied before diminishing returns. */
  perItemCap: number;
  /** How many (strongest-first) commitments count in full. */
  diminishingAfter: number;
  /** Multiplier applied to every commitment beyond diminishingAfter. */
  diminishingFactor: number;
}

export interface CommitmentBreakdownEntry {
  label: string;
  cappedPoints: number;
  weightedPoints: number;
  diminished: boolean;
}

export interface CommitmentResult {
  points: number;
  breakdown: CommitmentBreakdownEntry[];
}

/**
 * Aggregates a list of commitments (activities, projects, research experiences, ...)
 * into a single point total that rewards depth over sheer quantity: the strongest
 * `diminishingAfter` items count in full, everything past that counts at
 * `diminishingFactor` — directly encoding the product's "don't reward activity
 * inflation" principle in the scoring math itself, not just in advisor copy.
 */
export function scoreCommitments(items: CommitmentItem[], opts: CommitmentOptions): CommitmentResult {
  const capped = items
    .map((item) => ({ label: item.label, cappedPoints: Math.min(item.basePoints, opts.perItemCap) }))
    .sort((a, b) => b.cappedPoints - a.cappedPoints);

  const breakdown: CommitmentBreakdownEntry[] = capped.map((item, index) => {
    const diminished = index >= opts.diminishingAfter;
    const weightedPoints = diminished ? item.cappedPoints * opts.diminishingFactor : item.cappedPoints;
    return { ...item, weightedPoints, diminished };
  });

  const points = breakdown.reduce((sum, item) => sum + item.weightedPoints, 0);
  return { points, breakdown };
}
