/**
 * Pure backfill classification — no `server-only` import, so it's
 * unit-testable and reusable by both scripts/entities-backfill-report.ts (a real,
 * live-DB script) and a future admin-triggered version, without duplicating the rule.
 *
 * Never auto-links a row directly to a "possible duplicate" or "unresolved" match —
 * only `auto_linked` is confident enough to actually set a `*_id` column; the other two
 * classifications exist purely for a human-reviewed report (spec: "Exact/high-confidence
 * olmayan kayıtları otomatik yanlış entity'ye bağlama").
 */

import { rankEntityCandidates, MATCH_TIER, type EntityCandidate } from "./rank";

export type BackfillClassification = "auto_linked" | "possible_duplicate" | "unresolved";

export interface BackfillSourceRow {
  /** The achievement/education row's own id — for the report only, never written to. */
  rowId: string;
  freeText: string;
  country?: string | null;
  city?: string | null;
}

export interface BackfillResult {
  rowId: string;
  freeText: string;
  classification: BackfillClassification;
  matchedEntityId: string | null;
  matchedCanonicalName: string | null;
}

/** A fuzzy top match still needs a much higher bar than general search's floor (0.6)
 * before a backfill script should even suggest it as a "possible duplicate" for human
 * review — same reasoning as rank.ts's own DUPLICATE_SUGGESTION_THRESHOLD, applied here
 * independently since this module must stay decidable on its own. */
const POSSIBLE_DUPLICATE_FUZZY_THRESHOLD = 0.85;

export function classifyForBackfill(row: BackfillSourceRow, entities: EntityCandidate[]): BackfillResult {
  const text = row.freeText.trim();
  if (!text) {
    return { rowId: row.rowId, freeText: row.freeText, classification: "unresolved", matchedEntityId: null, matchedCanonicalName: null };
  }

  const ranked = rankEntityCandidates(text, entities, { country: row.country, city: row.city });
  const top = ranked[0];

  if (top && (top.tier === MATCH_TIER.exactCanonical || top.tier === MATCH_TIER.exactAlias)) {
    return {
      rowId: row.rowId,
      freeText: row.freeText,
      classification: "auto_linked",
      matchedEntityId: top.candidate.id,
      matchedCanonicalName: top.candidate.canonicalName,
    };
  }

  if (top && (top.tier <= MATCH_TIER.tokenMatch || top.fuzzyScore >= POSSIBLE_DUPLICATE_FUZZY_THRESHOLD)) {
    return {
      rowId: row.rowId,
      freeText: row.freeText,
      classification: "possible_duplicate",
      matchedEntityId: top.candidate.id,
      matchedCanonicalName: top.candidate.canonicalName,
    };
  }

  return { rowId: row.rowId, freeText: row.freeText, classification: "unresolved", matchedEntityId: null, matchedCanonicalName: null };
}

export interface BackfillSummary {
  total: number;
  autoLinked: number;
  possibleDuplicate: number;
  unresolved: number;
}

export function summarizeBackfillResults(results: BackfillResult[]): BackfillSummary {
  return {
    total: results.length,
    autoLinked: results.filter((r) => r.classification === "auto_linked").length,
    possibleDuplicate: results.filter((r) => r.classification === "possible_duplicate").length,
    unresolved: results.filter((r) => r.classification === "unresolved").length,
  };
}
