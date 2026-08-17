#!/usr/bin/env node
/**
 * Apply an acquisition fixture to the database — identity-resolved, precedence-checked,
 * idempotent.
 *
 * Split from acquisition on purpose. Acquisition talks to the outside world and produces a
 * reviewable artefact; this script is the only thing that writes, so all the rules that
 * protect existing data live in exactly one place:
 *
 *   1. Every fact must attach to an *existing* university. This script never inserts into
 *      `universities` and never creates a canonical entity. A fixture entry it cannot place
 *      confidently is reported UNRESOLVED and skipped — because the alternative, creating a
 *      row to hold the fact, is how a registry ends up with the same institution twice.
 *   2. Resolution goes through the canonical entity registry first (`entity_external_ids`,
 *      then `entity_aliases` via the same search path the app's own university search uses),
 *      falling back to name+country. One identity system, not two.
 *   3. No write happens without consulting what is already stored. Each fact's declared
 *      `writePolicy` is honoured before dates are even considered, then
 *      lib/acquisition/precedence.ts decides. Older data never overwrites newer; a same-tier
 *      disagreement is recorded as CONFLICTING rather than resolved by import order.
 *   4. Re-running the same fixture is a no-op.
 *
 * Usage:
 *   npm run import:universities -- --file <fixture.json>            # validate only, no DB needed
 *   npm run import:universities -- --file <fixture.json> --plan     # + resolve identity, show the plan
 *   npm run import:universities -- --file <fixture.json> --apply    # write
 *
 * `--plan` and `--apply` need SUPABASE_SECRET_KEY: the global reference tables are
 * authenticated-read only, so the anon key sees nothing at all (an anon count returns 0 rows
 * for every table, which is RLS working — never read that as an empty database).
 *
 * Imports nothing carrying `import "server-only"`, same constraint as the other scripts.
 */

import { readFileSync } from "node:fs";

import { validateFixture, type AcquiredFact, type AcquiredUniversity } from "../lib/acquisition/fixture";
import { decideWrite, mutatesValue, type FactVersion, type WriteAction } from "../lib/acquisition/precedence";
import { nameKey, nameVariants, sameCountry } from "../lib/acquisition/normalize";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — validation mode still works.
}

/** Columns on `universities` this importer is allowed to touch. Anything not listed is not
 * writable by an automated fixture, which keeps a malformed `field` from reaching a column
 * it should never reach (name, country, canonical_entity_id are deliberately absent). */
const WRITABLE_UNIVERSITY_COLUMNS = new Set(["website_url", "admissions_url", "application_system", "logo_url", "description"]);

/** Fields that are stored as dated metric rows rather than columns. */
const METRIC_FIELDS = new Set(["research_topics_top5", "total_students", "international_students_share", "established_year"]);

interface PlanEntry {
  declaredName: string;
  field: string;
  action: WriteAction | "unresolved" | "cross_check_ok" | "cross_check_disagrees" | "not_writable";
  reason: string;
}

interface Rest {
  url: string;
  key: string;
}

async function restGet(rest: Rest, path: string): Promise<unknown[]> {
  const response = await fetch(`${rest.url}/rest/v1/${path}`, {
    headers: { apikey: rest.key, Authorization: `Bearer ${rest.key}` },
  });
  if (!response.ok) throw new Error(`GET ${path} failed: HTTP ${response.status} ${await response.text().catch(() => "")}`);
  const body = await response.json();
  return Array.isArray(body) ? body : [];
}

async function restWrite(rest: Rest, method: "POST" | "PATCH", path: string, payload: unknown, extraHeaders: Record<string, string> = {}): Promise<void> {
  const response = await fetch(`${rest.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: rest.key,
      Authorization: `Bearer ${rest.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${method} ${path} failed: HTTP ${response.status} ${await response.text().catch(() => "")}`);
}

interface LocalUniRow {
  id: string;
  name: string;
  country: string;
  city: string | null;
  website_url: string | null;
  canonical_entity_id: string | null;
  /** Alias strings from `entity_aliases` for this row's canonical entity, loaded once up front. */
  aliases?: string[];
  /** Optional because their existence depends on migration 0042 being applied. */
  admissions_url?: string | null;
  application_system?: string | null;
}

/** Columns added by migration 0042. The importer must run before that migration is applied —
 * otherwise the only way to import anything is to apply a migration first, which is a worse
 * coupling than degrading gracefully and refusing just the facts that need the new columns. */
const MIGRATION_0042_COLUMNS = ["admissions_url", "application_system"] as const;

/**
 * Resolve one fixture entry to a university id.
 *
 * Tried in strength order: a cross-registry external id already stored against the canonical
 * entity, then exact name+country, then name-variant+country. Country must always agree —
 * a name match across countries is not a match. Anything ambiguous returns null with a
 * reason, and the caller reports it rather than picking.
 */
async function resolveUniversity(
  rest: Rest,
  entry: AcquiredUniversity,
  rows: LocalUniRow[]
): Promise<{ id: string; method: string } | { id: null; reason: string }> {
  // 1. External ids via the canonical registry. This is the strongest signal and the reason
  //    the registry exists — it survives renames and translations that break name matching.
  const idPairs = Object.entries(entry.externalIds);
  if (idPairs.length > 0) {
    const orFilter = idPairs.map(([type, value]) => `and(id_type.eq.${type},id_value.eq.${encodeURIComponent(value)})`).join(",");
    const hits = (await restGet(rest, `entity_external_ids?select=entity_id,id_type,id_value&or=(${orFilter})`).catch(() => [])) as {
      entity_id: string;
      id_type: string;
      id_value: string;
    }[];
    const entityIds = [...new Set(hits.map((h) => h.entity_id))];
    if (entityIds.length === 1) {
      const match = rows.find((r) => r.canonical_entity_id === entityIds[0]);
      if (match) return { id: match.id, method: `external_id (${hits[0].id_type})` };
    }
    if (entityIds.length > 1) {
      return { id: null, reason: `Fixture external ids resolve to ${entityIds.length} different canonical entities; needs a human merge decision.` };
    }
  }

  // 2. Name + country.
  const target = nameKey(entry.declaredName);
  const rorTarget = nameKey(entry.rorDisplayName);
  const inCountry = rows.filter((r) => sameCountry(r.country, entry.declaredCountry));
  if (inCountry.length === 0) {
    return { id: null, reason: `No university row in ${entry.declaredCountry} to match "${entry.declaredName}" against.` };
  }

  // Match against every name form ROR publishes, not just the display name. Those forms are
  // authoritative identity data (localised labels, official alternates, acronyms), and our own
  // rows carry ranking-table spellings that often differ — "University of Michigan" here vs
  // "University of Michigan-Ann Arbor" in the QS-derived name. Country agreement is still
  // required, so widening the name evidence does not widen what counts as a match.
  const candidateKeys = new Set(
    [entry.declaredName, entry.rorDisplayName, ...entry.aliases, ...entry.acronyms].flatMap((n) => nameVariants(n)).map(nameKey).filter(Boolean)
  );
  void target;
  void rorTarget;

  const exact = inCountry.filter((r) => nameVariants(r.name).map(nameKey).some((k) => candidateKeys.has(k)));
  if (exact.length === 1) return { id: exact[0].id, method: "name+country" };
  if (exact.length === 0) {
    // Fall back to the canonical registry's own aliases. This is the designed remedy for a
    // name our row spells differently from every form the registry publishes — a human
    // confirms it once, stores the alias, and every later import resolves automatically
    // instead of the matcher being loosened for everyone.
    const byAlias = inCountry.filter((r) => (r.aliases ?? []).flatMap((a) => nameVariants(a)).map(nameKey).some((k) => candidateKeys.has(k)));
    if (byAlias.length === 1) return { id: byAlias[0].id, method: "entity_aliases" };
    if (byAlias.length > 1) {
      return { id: null, reason: `"${entry.declaredName}" matches ${byAlias.length} rows in ${entry.declaredCountry} via stored aliases; ambiguous.` };
    }
  }
  if (exact.length > 1) {
    return {
      id: null,
      reason: `"${entry.declaredName}" matches ${exact.length} rows in ${entry.declaredCountry} (${exact.map((r) => r.id).join(", ")}); duplicates must be merged first.`,
    };
  }

  return { id: null, reason: `No name match for "${entry.declaredName}" (or ROR name "${entry.rorDisplayName}") among ${inCountry.length} rows in ${entry.declaredCountry}.` };
}

/** Existing stored version of a fact, for precedence comparison. `rowId` is set for metric
 * rows so an update can PATCH that exact row rather than relying on an upsert arbiter — the
 * natural-key unique index lives in migration 0042, which may not be applied yet, and without
 * it an insert-with-merge-duplicates silently appends a duplicate instead of updating. */
async function existingVersion(rest: Rest, uni: LocalUniRow, fact: AcquiredFact): Promise<(FactVersion & { rowId?: string }) | null> {
  if (METRIC_FIELDS.has(fact.field)) {
    const rows = (await restGet(
      rest,
      `university_profile_metrics?select=id,value_numeric,value_text,stats_as_of,source_type,verified_at,notes&university_id=eq.${uni.id}&metric_code=eq.${encodeURIComponent(fact.field)}&scope=eq.${encodeURIComponent(fact.scope)}`
    )) as {
      id: string;
      value_numeric: number | null;
      value_text: string | null;
      stats_as_of: string | null;
      source_type: string;
      verified_at: string;
      notes: string | null;
    }[];
    if (rows.length === 0) return null;
    const row = rows[0];
    const year = row.stats_as_of ? Number(row.stats_as_of.match(/20\d\d/)?.[0] ?? Number.NaN) : Number.NaN;
    return {
      rowId: row.id,
      value: row.value_numeric ?? row.value_text,
      sourceYear: Number.isFinite(year) ? year : null,
      tier: row.source_type === "official_primary" || row.source_type === "open_registry" ? "HIGH" : "MEDIUM",
      retrievedAt: row.verified_at,
      // Rows this pipeline wrote say so in `notes`; anything else predates it and was put
      // there by hand research, so it is treated as human-verified and never overwritten.
      humanVerified: !(row.notes ?? "").includes("acquisition-pipeline"),
    };
  }

  const current = (uni as unknown as Record<string, unknown>)[fact.field];
  if (current === null || current === undefined || current === "") return null;
  return {
    value: typeof current === "number" ? current : String(current),
    sourceYear: null,
    tier: "HIGH",
    retrievedAt: new Date(0).toISOString(),
    // A column value already present came from earlier hand research (there is no other
    // writer yet), so a machine may fill a gap but must not replace it.
    humanVerified: true,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--file");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
  const wantsPlan = args.includes("--plan") || args.includes("--apply");
  const apply = args.includes("--apply");

  if (!file) {
    console.error("Usage: npm run import:universities -- --file <fixture.json> [--plan|--apply]");
    process.exitCode = 1;
    return;
  }

  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  const validation = validateFixture(raw);

  console.log(`Fixture: ${file}`);
  console.log(`  universities ${validation.stats.universities} | facts ${validation.stats.facts} | unresolved-at-acquisition ${validation.stats.unresolved}`);
  console.log(`  by field:              ${JSON.stringify(validation.stats.byField)}`);
  console.log(`  by verification state: ${JSON.stringify(validation.stats.byVerificationState)}`);
  for (const warning of validation.warnings) console.log(`  WARN  ${warning}`);
  for (const error of validation.errors) console.log(`  ERROR ${error}`);

  if (!validation.ok) {
    console.error(`\nFixture is invalid (${validation.errors.length} errors). Nothing was read from or written to the database.`);
    process.exitCode = 1;
    return;
  }
  console.log("\nFixture validation: PASS");

  if (!wantsPlan) {
    console.log("Validation-only mode. Re-run with --plan to resolve identity against the database, or --apply to write.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error(
      "\n--plan/--apply need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.\n" +
        "The global reference tables are authenticated-read only, so the publishable key cannot substitute:\n" +
        "it returns zero rows for every table, which is RLS working correctly, not an empty database.\n" +
        "See docs/founder-blocked-backlog.md item 2."
    );
    process.exitCode = 1;
    return;
  }

  const rest: Rest = { url, key };
  const fixture = raw as { universities: AcquiredUniversity[] };

  const BASE_SELECT = "id,name,country,city,website_url,canonical_entity_id";
  const probe = await fetch(`${url}/rest/v1/universities?select=${BASE_SELECT},${MIGRATION_0042_COLUMNS.join(",")}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const missingColumns = probe.ok ? [] : [...MIGRATION_0042_COLUMNS];
  const selectList = missingColumns.length > 0 ? BASE_SELECT : `${BASE_SELECT},${MIGRATION_0042_COLUMNS.join(",")}`;

  const rows = (await restGet(rest, `universities?select=${selectList}`)) as LocalUniRow[];

  // Load the registry's aliases in one pass and attach them, rather than a query per entry.
  const aliasRows = (await restGet(rest, "entity_aliases?select=entity_id,alias")) as { entity_id: string; alias: string }[];
  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliasRows) {
    const list = aliasesByEntity.get(a.entity_id) ?? [];
    list.push(a.alias);
    aliasesByEntity.set(a.entity_id, list);
  }
  for (const row of rows) {
    row.aliases = row.canonical_entity_id ? (aliasesByEntity.get(row.canonical_entity_id) ?? []) : [];
  }

  console.log(`Loaded ${rows.length} existing universities and ${aliasRows.length} registry aliases.`);
  if (missingColumns.length > 0) {
    console.log(`Migration 0042 is NOT applied — ${missingColumns.join(", ")} absent. Facts targeting them will be skipped, not guessed.`);
  }
  console.log("");

  const plan: PlanEntry[] = [];
  let applied = 0;

  for (const entry of fixture.universities) {
    const resolution = await resolveUniversity(rest, entry, rows);
    if (resolution.id === null) {
      plan.push({ declaredName: entry.declaredName, field: "(identity)", action: "unresolved", reason: resolution.reason });
      continue;
    }
    const uni = rows.find((r) => r.id === resolution.id)!;

    for (const fact of entry.facts) {
      // cross_check_only never writes — it exists to surface disagreement.
      if (fact.writePolicy === "cross_check_only") {
        const stored = (uni as unknown as Record<string, unknown>)[fact.field];
        const agrees = stored == null ? null : nameKey(String(stored)) === nameKey(String(fact.value));
        plan.push({
          declaredName: entry.declaredName,
          field: fact.field,
          action: agrees === false ? "cross_check_disagrees" : "cross_check_ok",
          reason:
            agrees === false
              ? `Stored "${String(stored)}" vs registry "${String(fact.value)}" — reported, not written (${fact.sourceUrl}).`
              : `Registry agrees or nothing stored to compare (stored: ${stored == null ? "null" : String(stored)}).`,
        });
        continue;
      }

      const isMetric = METRIC_FIELDS.has(fact.field);
      if (!isMetric && (missingColumns as string[]).includes(fact.field)) {
        plan.push({
          declaredName: entry.declaredName,
          field: fact.field,
          action: "not_writable",
          reason: "Target column does not exist yet — migration 0042 is not applied. Skipped rather than guessed.",
        });
        continue;
      }
      if (!isMetric && !WRITABLE_UNIVERSITY_COLUMNS.has(fact.field)) {
        plan.push({ declaredName: entry.declaredName, field: fact.field, action: "not_writable", reason: "Field is not in the importer's writable allow-list." });
        continue;
      }

      const existing = await existingVersion(rest, uni, fact);

      // fill_if_null is stricter than precedence and is applied first: if anything is
      // stored, we stop, regardless of how new the incoming source is.
      if (fact.writePolicy === "fill_if_null" && existing !== null) {
        plan.push({
          declaredName: entry.declaredName,
          field: fact.field,
          action: "skip_human_verified",
          reason: `Declared fill_if_null and a value is already stored ("${String(existing.value)}"); left untouched.`,
        });
        continue;
      }

      const incoming: FactVersion = {
        value: fact.value,
        sourceYear: fact.sourceAsOf ? Number(fact.sourceAsOf.match(/\d{4}/)?.[0] ?? Number.NaN) || null : null,
        tier: fact.sourceTier,
        retrievedAt: fact.retrievedAt,
      };
      const decision = decideWrite(incoming, existing);
      plan.push({ declaredName: entry.declaredName, field: fact.field, action: decision.action, reason: decision.reason });

      if (!apply || !mutatesValue(decision.action)) continue;

      if (isMetric) {
        const isNumeric = typeof fact.value === "number";
        const payload = {
          university_id: uni.id,
          metric_code: fact.field,
          value_numeric: isNumeric ? fact.value : null,
          value_text: isNumeric ? null : String(fact.value),
          unit: isNumeric ? "count" : "text",
          stats_as_of: fact.sourceAsOf,
          scope: fact.scope,
          precision_state: isNumeric ? "exact" : "category_only",
          source_url: fact.sourceUrl,
          source_type: fact.sourceType,
          data_quality_flag: fact.verificationState,
          notes: `acquisition-pipeline; ${fact.notes ?? ""}`.trim(),
        };
        // Explicit PATCH-or-POST rather than an upsert: the natural-key unique index that
        // would make `resolution=merge-duplicates` work is in migration 0042, and until that
        // is applied an upsert has no arbiter and appends a duplicate row instead of updating.
        // Doing it this way is correct with or without the index.
        if (existing?.rowId) {
          await restWrite(rest, "PATCH", `university_profile_metrics?id=eq.${existing.rowId}`, payload);
        } else {
          await restWrite(rest, "POST", "university_profile_metrics", payload);
        }
      } else {
        await restWrite(rest, "PATCH", `universities?id=eq.${uni.id}`, {
          [fact.field]: fact.value,
          last_checked_at: fact.retrievedAt,
          last_changed_at: fact.retrievedAt,
        });
      }
      applied += 1;
    }
  }

  const byAction = new Map<string, number>();
  for (const p of plan) byAction.set(p.action, (byAction.get(p.action) ?? 0) + 1);

  console.log("Plan summary:");
  for (const [action, count] of [...byAction.entries()].sort()) console.log(`  ${action.padEnd(24)} ${count}`);

  const notable = plan.filter((p) => p.action === "unresolved" || p.action === "conflict" || p.action === "cross_check_disagrees");
  if (notable.length > 0) {
    console.log("\nNeeds attention:");
    for (const p of notable) console.log(`  [${p.action}] ${p.declaredName} / ${p.field}: ${p.reason}`);
  }

  console.log(apply ? `\nApplied ${applied} writes.` : "\nDry run — nothing was written. Re-run with --apply.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
