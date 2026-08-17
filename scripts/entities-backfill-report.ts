#!/usr/bin/env node
/**
 * Non-destructive backfill report for the Canonical Entity Autocomplete System. Reads
 * every existing free-text school/organization value across the nine linkable tables,
 * classifies each against the canonical registry using the exact same pure engine the
 * live app uses (lib/entities/backfill.ts), and writes a report — it never writes an
 * `*_entity_id` column itself. Applying `auto_linked` rows (and deciding what to do with
 * `possible_duplicate` ones) is a deliberate, separate, reviewed step; this script's only
 * job is to make that review possible.
 *
 * Run with: npm run entities:backfill-report
 *
 * Deliberately does NOT import anything under lib/ that has `import "server-only"` at
 * the top — that guard throws outside Next.js's bundler, which this plain Node/tsx
 * script is (same constraint scripts/check-integrations.ts documents). Talks to
 * Supabase directly via the admin client instead.
 */

import { classifyForBackfill, summarizeBackfillResults, type BackfillResult } from "../lib/entities/backfill";
import type { EntityCandidate } from "../lib/entities/rank";
import { ENTITY_SCOPES, type EntityScope } from "../lib/entities/field-policy";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

interface SourceTableSpec {
  table: string;
  column: string;
  idColumn: string;
  /** Same scope the app binds to this column, so the candidate pool this classifies
   * against is exactly the set of entity types the column would actually accept. */
  scope: EntityScope;
  /** Optional country-context column, if the table has one — improves ranking, never
   * required. */
  countryColumn?: string;
}

/** Every table whose free-text column has a canonical linkage column next to it.
 * profiles.school_name is deliberately excluded — it is the onboarding "quick profile"
 * mirror of education_records.school_name, linked at onboarding time instead. */
const SOURCE_TABLES: SourceTableSpec[] = [
  { table: "education_records", column: "school_name", idColumn: "id", scope: "school", countryColumn: "country" },
  { table: "work_experiences", column: "organization", idColumn: "id", scope: "work_organization" },
  { table: "volunteering_experiences", column: "organization", idColumn: "id", scope: "volunteering_organization" },
  { table: "activities", column: "organization", idColumn: "id", scope: "activity_organization" },
  { table: "research_experiences", column: "organization", idColumn: "id", scope: "research_organization" },
  { table: "awards", column: "organization", idColumn: "id", scope: "award_organization" },
  { table: "certifications", column: "organization", idColumn: "id", scope: "certification_organization" },
  { table: "projects", column: "organization", idColumn: "id", scope: "project_organization" },
  { table: "sports_experiences", column: "team_name", idColumn: "id", scope: "sports_team" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // The whole registry plus its aliases is loaded once and partitioned per scope in
  // memory — nine scoped queries would re-fetch the same overlapping rows nine times.
  const [{ data: entityRows, error: entitiesError }, { data: aliasRows, error: aliasesError }] = await Promise.all([
    admin.from("canonical_entities").select("id, entity_type, display_name, country_code, city, verification_state"),
    admin.from("entity_aliases").select("entity_id, alias"),
  ]);
  if (entitiesError || aliasesError) {
    console.error(`Couldn't read the canonical registry: ${entitiesError?.message ?? aliasesError?.message}`);
    process.exitCode = 1;
    return;
  }

  const aliasesByEntity = new Map<string, string[]>();
  for (const row of aliasRows ?? []) {
    aliasesByEntity.set(row.entity_id, [...(aliasesByEntity.get(row.entity_id) ?? []), row.alias]);
  }

  // A merged entity is a tombstone; suggesting a link to one would be wrong even for a
  // human reviewer to accept.
  const liveEntities = (entityRows ?? []).filter((r) => r.verification_state !== "merged" && r.verification_state !== "inactive");

  function candidatesForScope(scope: EntityScope): EntityCandidate[] {
    const allowed = new Set<string>(ENTITY_SCOPES[scope].allowedTypes);
    return liveEntities
      .filter((r) => allowed.has(r.entity_type))
      .map((r) => ({
        id: r.id,
        canonicalName: r.display_name,
        aliases: aliasesByEntity.get(r.id) ?? [],
        country: r.country_code,
        city: r.city,
      }));
  }

  const allResults: (BackfillResult & { table: string })[] = [];

  for (const spec of SOURCE_TABLES) {
    const selectColumns = spec.countryColumn ? `${spec.idColumn}, ${spec.column}, ${spec.countryColumn}` : `${spec.idColumn}, ${spec.column}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per spec; each row's shape is read dynamically below, not statically typed.
    const { data: rows, error } = await (admin.from(spec.table as any) as any).select(selectColumns).not(spec.column, "is", null);
    if (error) {
      console.error(`Skipping ${spec.table}.${spec.column}: ${error.message}`);
      continue;
    }

    const candidates = candidatesForScope(spec.scope);
    for (const row of rows ?? []) {
      const freeText: string = row[spec.column];
      if (!freeText || !freeText.trim()) continue;
      const country = spec.countryColumn ? (row[spec.countryColumn] ?? null) : null;
      const result = classifyForBackfill({ rowId: row[spec.idColumn], freeText, country }, candidates);
      allResults.push({ ...result, table: spec.table });
    }
  }

  const summary = summarizeBackfillResults(allResults);
  console.log(`Backfill report — ${summary.total} free-text values examined across ${SOURCE_TABLES.length} tables.`);
  console.log(`  auto_linked:        ${summary.autoLinked}`);
  console.log(`  possible_duplicate: ${summary.possibleDuplicate}`);
  console.log(`  unresolved:         ${summary.unresolved}`);
  console.log("");
  console.log("Full detail (never applied automatically — review before linking anything):");
  console.log(JSON.stringify(allResults, null, 2));
}

main();
