#!/usr/bin/env node
/**
 * Non-destructive backfill report for the Canonical Entity Autocomplete System (spec
 * section 14). Reads every existing free-text school/organization value across the nine
 * audited tables, classifies each against the current `institutions` registry using the
 * exact same pure engine the live app uses (lib/entities/backfill.ts), and writes a
 * report — it never writes a `*_id` column itself. Applying `auto_linked` rows (and
 * deciding what to do with `possible_duplicate` ones) is a deliberate, separate,
 * reviewed step; this script's only job is to make that review possible.
 *
 * Run with: npm run entities:backfill-report
 *
 * Deliberately does NOT import anything under lib/ that has `import "server-only"` at
 * the top — that guard throws outside Next.js's bundler, which this plain Node/tsx
 * script is (same constraint scripts/check-integrations.ts documents). Talks to
 * Supabase directly via the admin client instead.
 *
 * NOT RUN as part of this change — this environment has no applied migrations (this
 * pack's own 0038 included) and no `SUPABASE_SECRET_KEY`, so there is no live
 * `institutions` table or any free-text data to read yet. Ready to run once both exist
 * (see docs/founder-blocked-backlog.md).
 */

import { classifyForBackfill, summarizeBackfillResults, type BackfillResult } from "../lib/entities/backfill";
import type { EntityCandidate } from "../lib/entities/rank";
import type { InstitutionCategory } from "../types/database";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

interface SourceTableSpec {
  table: string;
  column: string;
  idColumn: string;
  category: InstitutionCategory;
  /** Optional country-context column, if the table has one — improves ranking, never
   * required. */
  countryColumn?: string;
}

/** Every table the Phase 1 audit (docs/entity-canonicalization-audit.md) flagged as
 * CANONICAL + CUSTOM FALLBACK. profiles.school_name is deliberately excluded — it's the
 * onboarding "quick profile" mirror of education_records.school_name, not linked this
 * pass (see the audit doc's own note on that decision). */
const SOURCE_TABLES: SourceTableSpec[] = [
  { table: "education_records", column: "school_name", idColumn: "id", category: "school", countryColumn: "country" },
  { table: "work_experiences", column: "organization", idColumn: "id", category: "organization" },
  { table: "volunteering_experiences", column: "organization", idColumn: "id", category: "organization" },
  { table: "activities", column: "organization", idColumn: "id", category: "organization" },
  { table: "research_experiences", column: "organization", idColumn: "id", category: "organization" },
  { table: "awards", column: "organization", idColumn: "id", category: "organization" },
  { table: "certifications", column: "organization", idColumn: "id", category: "organization" },
  { table: "projects", column: "organization", idColumn: "id", category: "organization" },
  { table: "sports_experiences", column: "team_name", idColumn: "id", category: "organization" },
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

  const { data: institutionRows, error: institutionsError } = await admin
    .from("institutions")
    .select("id, category, canonical_name, aliases, country, city");
  if (institutionsError) {
    console.error(`Couldn't read institutions: ${institutionsError.message}`);
    process.exitCode = 1;
    return;
  }

  const bySchoolCategory: EntityCandidate[] = (institutionRows ?? [])
    .filter((r) => r.category === "school")
    .map((r) => ({ id: r.id, canonicalName: r.canonical_name, aliases: r.aliases, country: r.country, city: r.city }));
  const byOrgCategory: EntityCandidate[] = (institutionRows ?? [])
    .filter((r) => r.category === "organization")
    .map((r) => ({ id: r.id, canonicalName: r.canonical_name, aliases: r.aliases, country: r.country, city: r.city }));

  const allResults: (BackfillResult & { table: string })[] = [];

  for (const spec of SOURCE_TABLES) {
    const selectColumns = spec.countryColumn ? `${spec.idColumn}, ${spec.column}, ${spec.countryColumn}` : `${spec.idColumn}, ${spec.column}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per spec; each row's shape is read dynamically below, not statically typed.
    const { data: rows, error } = await (admin.from(spec.table as any) as any).select(selectColumns).not(spec.column, "is", null);
    if (error) {
      console.error(`Skipping ${spec.table}.${spec.column}: ${error.message}`);
      continue;
    }

    const candidates = spec.category === "school" ? bySchoolCategory : byOrgCategory;
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
