import type { PortfolioItem } from "./types";

const DEFAULT_WINDOW_DAYS = 45;
const DEFAULT_LIMIT = 4;

/**
 * "Recently added" for a public profile (spec: give a visitor a reason to check back —
 * "I wonder what Murat has done recently" — without a feed/DMs/comments/likes). Pure and
 * unit-tested: takes whatever `getPublicPortfolio` already fetched and privacy-filtered,
 * so this never re-implements or risks weakening that gate. `createdAt` (when the row was
 * added to Oryn), not `startDate` (when the activity happened) — a student backdating an
 * achievement they just logged shouldn't make it look old, and one they logged the day it
 * started shouldn't look "recent" forever.
 */
export function getRecentPortfolioItems(
  items: PortfolioItem[],
  { now = new Date(), windowDays = DEFAULT_WINDOW_DAYS, limit = DEFAULT_LIMIT }: { now?: Date; windowDays?: number; limit?: number } = {}
): PortfolioItem[] {
  const cutoff = new Date(now).getTime() - windowDays * 24 * 60 * 60 * 1000;
  return items
    .filter((item) => new Date(item.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
