/**
 * Which of two competing versions of the same fact wins — and, just as importantly, when
 * neither does.
 *
 * This is the module that enforces "a failed or older refresh never overwrites good data".
 * It is pure and separately tested because the failure mode it prevents is silent: an
 * importer that blindly upserts will happily replace a hand-verified 2026 tuition figure
 * with a 2019 one scraped from an archived page, and nothing about the resulting row looks
 * wrong afterwards. There is no way to notice that later, so it has to be impossible now.
 *
 * A same-tier disagreement resolves to `conflict`, never to a winner. Picking one silently
 * is how a product ends up asserting a number it cannot defend; the audit's verification
 * policy requires showing both values with both sources instead.
 */

import type { AuthorityTier } from "./source-authority";

export interface FactVersion {
  /** Normalised value. Compared with `Object.is` after normalisation, so callers must
   * normalise (trim, currency-convert-free, same units) before handing values in. */
  value: string | number | null;
  /** The year the source states the value is for. Null when the source gives no year. */
  sourceYear: number | null;
  tier: AuthorityTier;
  /** ISO timestamp of when this version was read from its source. */
  retrievedAt: string;
  /** True when a human confirmed this value against a primary source. Machine pipelines
   * may never overwrite one of these — they can only raise a conflict for review. */
  humanVerified?: boolean;
}

export type WriteAction =
  /** No existing row — write it. */
  | "insert"
  /** Incoming genuinely supersedes existing — write it. */
  | "update"
  /** Same value already stored; only freshness metadata needs touching. */
  | "touch_only"
  /** Existing is newer. Left alone. */
  | "skip_older"
  /** Existing came from a stronger source at the same date. Left alone. */
  | "skip_lower_authority"
  /** Existing was human-verified. Never machine-overwritten. */
  | "skip_human_verified"
  /** Equal-strength disagreement — store as conflicting, surface both, pick neither. */
  | "conflict";

export interface WriteDecision {
  action: WriteAction;
  /** Human-readable justification, written into the import report so every skip is
   * accountable rather than invisible. */
  reason: string;
}

const TIER_RANK: Record<AuthorityTier, number> = { HIGH: 2, MEDIUM: 1 };

function sameValue(a: FactVersion["value"], b: FactVersion["value"]): boolean {
  if (typeof a === "string" && typeof b === "string") return a.trim() === b.trim();
  return Object.is(a, b);
}

/**
 * Decide what to do with `incoming` given `existing`.
 *
 * `existing === null` means the fact is not stored yet. Everything else follows the
 * precedence order documented in the audit: newer source date beats older; at equal date,
 * stronger source tier beats weaker; at equal date and equal tier, a disagreement is a
 * conflict rather than a winner. A human-verified existing value outranks all of it.
 */
export function decideWrite(incoming: FactVersion, existing: FactVersion | null): WriteDecision {
  if (!existing) return { action: "insert", reason: "No existing value stored." };

  if (sameValue(incoming.value, existing.value)) {
    return { action: "touch_only", reason: "Stored value already matches the source; only freshness metadata changes." };
  }

  if (existing.humanVerified) {
    return {
      action: "skip_human_verified",
      reason: "Existing value was verified by a human against a primary source; a machine pipeline may not overwrite it.",
    };
  }

  // Date first. A source that states a more recent year wins regardless of tier, because a
  // current secondary figure is more useful than a stale primary one — and crucially, an
  // older figure must never replace a newer one.
  if (incoming.sourceYear !== null && existing.sourceYear !== null) {
    if (existing.sourceYear > incoming.sourceYear) {
      return {
        action: "skip_older",
        reason: `Stored value is for ${existing.sourceYear}; incoming source states ${incoming.sourceYear}. Older data never overwrites newer.`,
      };
    }
    if (incoming.sourceYear > existing.sourceYear) {
      return {
        action: "update",
        reason: `Incoming source states ${incoming.sourceYear}, superseding the stored ${existing.sourceYear} value.`,
      };
    }
  } else if (existing.sourceYear !== null && incoming.sourceYear === null) {
    // An undated figure cannot be shown to supersede a dated one.
    return {
      action: "skip_older",
      reason: `Stored value is dated (${existing.sourceYear}); incoming source states no year, so it cannot be shown to supersede it.`,
    };
  } else if (incoming.sourceYear !== null && existing.sourceYear === null) {
    return { action: "update", reason: `Incoming source is dated (${incoming.sourceYear}); stored value is undated.` };
  }

  // Same stated date (or both undated): let source strength decide.
  const incomingRank = TIER_RANK[incoming.tier];
  const existingRank = TIER_RANK[existing.tier];
  if (incomingRank > existingRank) {
    return { action: "update", reason: `Same date, stronger source (${incoming.tier} over ${existing.tier}).` };
  }
  if (existingRank > incomingRank) {
    return { action: "skip_lower_authority", reason: `Same date, weaker source (${incoming.tier} against stored ${existing.tier}).` };
  }

  return {
    action: "conflict",
    reason: `Two ${incoming.tier} sources with the same date disagree (${String(existing.value)} vs ${String(incoming.value)}). Recorded as conflicting; neither is published as fact.`,
  };
}

/** Actions that change a stored value. Everything else leaves the value untouched. */
export function mutatesValue(action: WriteAction): boolean {
  return action === "insert" || action === "update";
}
