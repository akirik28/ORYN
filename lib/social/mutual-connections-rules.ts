/**
 * Pure rules for mutual connections — no `server-only` import (unlike
 * lib/social/mutual-connections.ts, which re-exports everything here), same split as
 * lib/social/skills.ts vs. its DB-touching callers, so this stays unit-testable.
 */

/** Accepted-connection intersection between two users' id sets — the entire "mutual
 * connections" computation, before any exclusion is applied. */
export function intersectAcceptedConnections(acceptedA: Iterable<string>, acceptedB: Iterable<string>): string[] {
  const setB = new Set(acceptedB);
  return [...new Set(acceptedA)].filter((id) => setB.has(id));
}

/**
 * Excludes any candidate blocked with the viewer, either direction — same symmetric
 * "blocked relative to the viewer" exclusion lib/social/people-you-may-know.ts's
 * isExcludedFromPeopleYouMayKnow already uses, applied here so a blocked user's identity
 * (and the private fact that a block exists) never surfaces through a "mutual
 * connections" list either.
 */
export function excludeBlockedIds(ids: string[], blockedIds: Iterable<string>): string[] {
  const blockedSet = new Set(blockedIds);
  return ids.filter((id) => !blockedSet.has(id));
}
