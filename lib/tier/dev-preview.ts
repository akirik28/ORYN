import "server-only";

import type { PlanTier } from "@/types/database";

/**
 * A development-only way to LOOK at the Ultra skin before any real signal can produce it.
 *
 * What this is: migration 0089 (profiles.plan_tier) was written, not applied, when this
 * file was written — the column genuinely didn't exist yet, so `resolvePlanTier` returned
 * "standard" for every account with no code path able to produce anything else.
 *
 * STATUS, corrected 2026-09-02 (docs/present-case-verify-2026-09-02.md): the founder has
 * since applied 0089/0090/0091 by hand. `plan_tier` is real and live now — every account
 * still reads "standard" today only because nothing has set any of them to "ultra" yet, not
 * because the column is absent. The paragraph above is accurate history for why this
 * override tool was built, but is no longer an accurate description of why "ultra" is
 * unreachable today. This file's actual mechanism (a cookie applied at the edge, after
 * resolvePlanTier decides, never touching `profiles`) is unaffected either way — only this
 * comment's account of *why* was stale. Everything built on this foundation tonight — the
 * ambient layer, the ember canvas, every Ultra-aware component — is real and correct. This
 * file exists to make it reachable in development only, so it can actually be seen without
 * a real "ultra" row.
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
export const DEV_TIER_PREVIEW_COOKIE = "proxola_dev_tier_preview";

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
