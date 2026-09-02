import "server-only";

import type { PlanTier } from "@/types/database";

/**
 * A development-only way to LOOK at the Ultra skin before any real signal can produce it.
 *
 * What this is: migration 0089 (profiles.plan_tier) is written, not applied — confirmed
 * live against the real database, the column genuinely does not exist. `resolvePlanTier`
 * therefore returns "standard" for every account, including the founder's, with no code
 * path able to produce anything else. Everything built on this foundation tonight — the
 * ambient layer, the ember canvas, every Ultra-aware component — is real and correct but
 * currently unreachable and unverifiable by looking at the running app. This file exists
 * to make it reachable in development only, so it can actually be seen.
 *
 * What this is NOT: a second way to set a student's real tier, a way to fake profile data,
 * or a route that exists in production. `resolvePlanTier` (lib/tier/plan-tier.ts) remains
 * the single decision point for what the data says — this module supplies an override that
 * the caller (app/(app)/layout.tsx) applies AFTER that decision, at the edge, never inside
 * it. Nothing here ever writes to `profiles` or any other table; the override lives only in
 * a cookie, scoped to this browser, for as long as a developer chooses to keep it set.
 *
 * Hard-gated on `NODE_ENV`, not a flag someone could flip at runtime — every function below
 * checks it directly and independently, so there is no single toggle whose removal would
 * silently re-enable this in a production build. Same gate as every /design-preview/* route
 * already uses in this codebase (`if (process.env.NODE_ENV === "production") notFound()`).
 */
export const DEV_TIER_PREVIEW_COOKIE = "oryn_dev_tier_preview";

export function isDevTierPreviewAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Reads a raw cookie value into a real override, or null. Returns null unconditionally in
 * production — even if a cookie with this name somehow existed (it never will, since
 * nothing in a production build can set it), it would never be honored.
 */
export function resolveDevTierPreviewOverride(cookieValue: string | undefined): PlanTier | null {
  if (!isDevTierPreviewAllowed()) return null;
  if (cookieValue === "ultra" || cookieValue === "standard") return cookieValue;
  return null;
}
