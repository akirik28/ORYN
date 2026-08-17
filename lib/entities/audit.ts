/**
 * Deterministic data-quality rules for the canonical entity registry.
 * Pure — no `server-only`, no Supabase — so every rule is unit tested and the script
 * wrapper (scripts/entities-audit.ts) stays a thin IO shell.
 *
 * Never auto-merges anything: the only bucket that authorizes an automatic action is
 * SAFE_EXACT_LINK, which by construction covers cases a constraint could have decided on
 * its own. Everything genuinely uncertain lands in POSSIBLE_DUPLICATE or AMBIGUOUS for a
 * human, matching "Fuzzy matcher hiçbir zaman ... otomatik merge etmemeli".
 */

import { normalizeEntitySearchText } from "./normalize";
import { findPossibleDuplicates, type EntityCandidate } from "./rank";

export type AuditBucket = "SAFE_EXACT_LINK" | "POSSIBLE_DUPLICATE" | "AMBIGUOUS" | "UNRESOLVED" | "INVALID";

export interface AuditFinding {
  bucket: AuditBucket;
  /** Stable machine-readable rule name, e.g. "duplicate_canonical_name". */
  rule: string;
  entityIds: string[];
  detail: string;
}

export interface AuditableEntity extends EntityCandidate {
  entityType?: string | null;
  officialUrl?: string | null;
  verificationState?: string | null;
}

/** Same shape a URL must satisfy anywhere else in this app before being stored or
 * rendered as a link — notably rejects `javascript:` and other non-http schemes. */
function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

/** Two entities are an exact duplicate only when entity type, normalized name, country
 * AND city all match — the same tuple `canonical_entities_identity_uq` uses, so anything
 * this flags is a case the database itself would have rejected had both rows been
 * inserted through it. Deliberately city-scoped: two real "Saint Joseph" schools in
 * different cities are NOT duplicates. That same scoping is why the live registry could
 * accumulate 43 near-duplicate universities whose only difference was how the city was
 * spelled — which findNearDuplicates below, not this rule, is what catches. */
function exactDuplicateKey(entity: AuditableEntity): string {
  return [entity.entityType ?? "", normalizeEntitySearchText(entity.canonicalName), entity.country ?? "", entity.city ?? ""].join("|");
}

export function findExactDuplicates(entities: AuditableEntity[]): AuditFinding[] {
  const byKey = new Map<string, AuditableEntity[]>();
  for (const entity of entities) {
    const key = exactDuplicateKey(entity);
    byKey.set(key, [...(byKey.get(key) ?? []), entity]);
  }

  return [...byKey.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      bucket: "SAFE_EXACT_LINK" as const,
      rule: "duplicate_canonical_name",
      entityIds: group.map((e) => e.id),
      detail: `${group.length} rows share entity type+normalized name+country+city ("${group[0].canonicalName}") — the same tuple canonical_entities_identity_uq enforces.`,
    }));
}

/** An alias that normalizes to the SAME string as another entity's canonical name is a
 * real hazard: searching that name would surface the wrong entity at alias-tier
 * priority. Never auto-resolved — which of the two is "right" is a human call. */
export function findAliasCollisions(entities: AuditableEntity[]): AuditFinding[] {
  const canonicalByNormalized = new Map<string, AuditableEntity[]>();
  for (const entity of entities) {
    const key = normalizeEntitySearchText(entity.canonicalName);
    canonicalByNormalized.set(key, [...(canonicalByNormalized.get(key) ?? []), entity]);
  }

  const findings: AuditFinding[] = [];
  for (const entity of entities) {
    for (const alias of entity.aliases) {
      const normalized = normalizeEntitySearchText(alias);
      const collidesWith = (canonicalByNormalized.get(normalized) ?? []).filter((other) => other.id !== entity.id);
      for (const other of collidesWith) {
        findings.push({
          bucket: "AMBIGUOUS",
          rule: "alias_equals_other_canonical_name",
          entityIds: [entity.id, other.id],
          detail: `"${entity.canonicalName}" carries the alias "${alias}", which is another entity's canonical name ("${other.canonicalName}").`,
        });
      }
    }
  }
  return findings;
}

/** The same alias string attached to two different entities — a search for it can only
 * ever resolve ambiguously. */
export function findDuplicateAliases(entities: AuditableEntity[]): AuditFinding[] {
  const owners = new Map<string, AuditableEntity[]>();
  for (const entity of entities) {
    for (const alias of new Set(entity.aliases.map(normalizeEntitySearchText))) {
      if (!alias) continue;
      owners.set(alias, [...(owners.get(alias) ?? []), entity]);
    }
  }

  return [...owners.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([alias, group]) => ({
      bucket: "AMBIGUOUS" as const,
      rule: "alias_shared_by_multiple_entities",
      entityIds: group.map((e) => e.id),
      detail: `Alias "${alias}" is claimed by ${group.length} entities (${group.map((e) => e.canonicalName).join(", ")}).`,
    }));
}

/** Structural problems a row shouldn't have at all — safe to report as INVALID because
 * each is decidable without judgment. */
export function findInvalidEntities(entities: AuditableEntity[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const entity of entities) {
    if (!entity.canonicalName.trim()) {
      findings.push({ bucket: "INVALID", rule: "empty_canonical_name", entityIds: [entity.id], detail: "canonical_name is empty or whitespace only." });
    }
    if (entity.canonicalName !== entity.canonicalName.trim()) {
      findings.push({
        bucket: "INVALID",
        rule: "canonical_name_untrimmed",
        entityIds: [entity.id],
        detail: `canonical_name has leading/trailing whitespace: ${JSON.stringify(entity.canonicalName)}.`,
      });
    }
    if (entity.officialUrl && !isValidHttpUrl(entity.officialUrl)) {
      findings.push({
        bucket: "INVALID",
        rule: "malformed_official_url",
        entityIds: [entity.id],
        detail: `official_url is not an http(s) URL: ${JSON.stringify(entity.officialUrl)}.`,
      });
    }
    for (const alias of entity.aliases) {
      if (!alias.trim()) {
        findings.push({ bucket: "INVALID", rule: "empty_alias", entityIds: [entity.id], detail: `"${entity.canonicalName}" has an empty alias entry.` });
      }
      if (normalizeEntitySearchText(alias) === normalizeEntitySearchText(entity.canonicalName)) {
        findings.push({
          bucket: "INVALID",
          rule: "alias_equals_own_canonical_name",
          entityIds: [entity.id],
          detail: `"${entity.canonicalName}" lists its own name as an alias ("${alias}") — redundant, and it inflates alias-tier ranking.`,
        });
      }
    }
  }
  return findings;
}

/** Near-duplicates that are NOT exact — surfaced for review, never merged. Uses the same
 * deliberately-high-confidence bar the "did you mean X?" custom-entity flow uses. */
export function findNearDuplicates(entities: AuditableEntity[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const seenPairs = new Set<string>();

  for (const entity of entities) {
    const others = entities.filter((o) => o.id !== entity.id && (o.entityType ?? null) === (entity.entityType ?? null));
    for (const candidate of findPossibleDuplicates(entity.canonicalName, others, { country: entity.country, city: entity.city })) {
      // Exact duplicates are already reported by findExactDuplicates at a bucket that
      // authorizes action — don't double-report them here as merely "possible".
      if (exactDuplicateKey(candidate as AuditableEntity) === exactDuplicateKey(entity)) continue;
      const pairKey = [entity.id, candidate.id].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      findings.push({
        bucket: "POSSIBLE_DUPLICATE",
        rule: "near_duplicate_name",
        entityIds: [entity.id, candidate.id],
        detail: `"${entity.canonicalName}" (${entity.city ?? "?"}, ${entity.country ?? "?"}) closely resembles "${candidate.canonicalName}" (${candidate.city ?? "?"}, ${candidate.country ?? "?"}). Review — do not merge on name similarity alone.`,
      });
    }
  }
  return findings;
}

export interface DenormalizedNameRow {
  table: string;
  rowId: string;
  storedText: string | null;
  canonicalName: string;
}

/**
 * Post-rename drift: a row linked to a canonical entity whose denormalized text column
 * no longer matches that entity's current name. Writes keep these in sync
 * (app/(app)/profile/actions.ts's resolveEntityLinkage), so this only ever appears after
 * a registry row is renamed — rare, but the one way a linked row can display a stale
 * spelling. SAFE_EXACT_LINK: the correct value is unambiguous (the entity's current
 * name), so this is the one finding an --apply mode may act on.
 */
export function findDenormalizedNameDrift(rows: DenormalizedNameRow[]): AuditFinding[] {
  return rows
    .filter((row) => (row.storedText ?? "") !== row.canonicalName)
    .map((row) => ({
      bucket: "SAFE_EXACT_LINK" as const,
      rule: "stale_denormalized_name",
      entityIds: [row.rowId],
      detail: `${row.table}.${row.rowId} displays ${JSON.stringify(row.storedText)} but its linked entity is now "${row.canonicalName}".`,
    }));
}

export function auditEntities(entities: AuditableEntity[]): AuditFinding[] {
  return [
    ...findInvalidEntities(entities),
    ...findExactDuplicates(entities),
    ...findDuplicateAliases(entities),
    ...findAliasCollisions(entities),
    ...findNearDuplicates(entities),
  ];
}

export function summarizeFindings(findings: AuditFinding[]): Record<AuditBucket, number> {
  const summary: Record<AuditBucket, number> = {
    SAFE_EXACT_LINK: 0,
    POSSIBLE_DUPLICATE: 0,
    AMBIGUOUS: 0,
    UNRESOLVED: 0,
    INVALID: 0,
  };
  for (const finding of findings) summary[finding.bucket] += 1;
  return summary;
}
