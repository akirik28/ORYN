#!/usr/bin/env node
/**
 * Canonical entity registry data-quality audit (spec Phase 2) plus denormalized-name
 * drift detection (Phase 1E).
 *
 * Read-only by default: reports findings bucketed SAFE_EXACT_LINK / POSSIBLE_DUPLICATE /
 * AMBIGUOUS / UNRESOLVED / INVALID and changes nothing. Never merges entities — the
 * rules live in lib/entities/audit.ts and are unit tested there; only the one
 * unambiguous case (a linked row whose denormalized text no longer matches its entity's
 * current canonical name) is fixable, and only when explicitly asked:
 *
 *   npm run entities:audit              # report only
 *   npm run entities:audit -- --fix-drift   # additionally re-sync stale denormalized names
 *
 * Deliberately does NOT import anything under lib/ with `import "server-only"` — that
 * guard throws outside Next.js's bundler, which this plain Node/tsx script is (same
 * constraint scripts/check-integrations.ts documents). Uses the Supabase admin client
 * directly.
 */

import { auditEntities, findDenormalizedNameDrift, summarizeFindings, type AuditableEntity, type DenormalizedNameRow } from "../lib/entities/audit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

/** Every table + column pair whose text is kept in sync with a linked entity's display
 * name (mirrors app/(app)/profile/actions.ts's ENTITY_LINK_FIELDS). */
const DENORMALIZED_LINKS: { table: string; idColumn: string; textColumn: string }[] = [
  { table: "profiles", idColumn: "school_entity_id", textColumn: "school_name" },
  { table: "education_records", idColumn: "school_entity_id", textColumn: "school_name" },
  { table: "work_experiences", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "volunteering_experiences", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "activities", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "research_experiences", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "awards", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "certifications", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "projects", idColumn: "organization_entity_id", textColumn: "organization" },
  { table: "sports_experiences", idColumn: "team_entity_id", textColumn: "team_name" },
];

async function main() {
  const fixDrift = process.argv.includes("--fix-drift");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  /**
   * PostgREST caps an unpaginated read at 1000 rows with a 200 status and no error —
   * confirmed live here: this function's caller was previously a plain `.select()` with no
   * `.range()`, and the registry has grown past 1000 canonical_entities. The audit was
   * silently running over an arbitrary 1000-row slice, not the full registry (same bug
   * class documented in lib/acquisition/paginate.ts and university-data-report.ts's own
   * `selectAll`, whose approach this mirrors).
   */
  async function selectAll<T>(table: string, columns: string): Promise<T[]> {
    const out: T[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error: pageError } = await admin
        .from(table)
        .select(columns)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (pageError) throw new Error(`${table}: ${pageError.message}`);
      const page = (data ?? []) as unknown as T[];
      out.push(...page);
      if (page.length < PAGE) break;
    }
    return out;
  }

  interface EntityRow {
    id: string;
    entity_type: string;
    display_name: string;
    country_code: string | null;
    city: string | null;
    official_url: string | null;
    verification_state: string;
  }
  interface AliasRow {
    entity_id: string;
    alias: string;
  }

  const [entityRows, aliasRows] = await Promise.all([
    selectAll<EntityRow>("canonical_entities", "id, entity_type, display_name, country_code, city, official_url, verification_state").catch((e: unknown) => {
      console.error(`Couldn't read the canonical registry: ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
      return null;
    }),
    selectAll<AliasRow>("entity_aliases", "entity_id, alias").catch((e: unknown) => {
      console.error(`Couldn't read entity_aliases: ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
      return null;
    }),
  ]);
  if (entityRows === null || aliasRows === null) return;

  const aliasesByEntity = new Map<string, string[]>();
  for (const row of aliasRows) {
    aliasesByEntity.set(row.entity_id, [...(aliasesByEntity.get(row.entity_id) ?? []), row.alias]);
  }

  const entities: AuditableEntity[] = entityRows.map((row) => ({
    id: row.id,
    canonicalName: row.display_name,
    aliases: aliasesByEntity.get(row.id) ?? [],
    country: row.country_code,
    city: row.city,
    entityType: row.entity_type,
    officialUrl: row.official_url,
    verificationState: row.verification_state,
  }));
  const nameById = new Map(entities.map((e) => [e.id, e.canonicalName]));

  const registryFindings = auditEntities(entities);

  // ---- Denormalized-name drift across every linked table ----
  const driftRows: DenormalizedNameRow[] = [];
  for (const link of DENORMALIZED_LINKS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per link; rows are read dynamically below.
    const { data: rows, error: linkError } = await (admin.from(link.table as any) as any)
      .select(`id, ${link.idColumn}, ${link.textColumn}`)
      .not(link.idColumn, "is", null);
    if (linkError) {
      console.error(`Skipping ${link.table}.${link.textColumn}: ${linkError.message}`);
      continue;
    }
    for (const row of rows ?? []) {
      const canonicalName = nameById.get(row[link.idColumn]);
      if (!canonicalName) continue; // dangling FK is impossible (ON DELETE SET NULL), but never assume
      driftRows.push({ table: link.table, rowId: row.id, storedText: row[link.textColumn], canonicalName });
    }
  }
  const driftFindings = findDenormalizedNameDrift(driftRows);

  const allFindings = [...registryFindings, ...driftFindings];
  const summary = summarizeFindings(allFindings);

  console.log(`Entity registry audit — ${entities.length} canonical entities, ${driftRows.length} linked rows checked for name drift.`);
  for (const [bucket, count] of Object.entries(summary)) console.log(`  ${bucket.padEnd(19)} ${count}`);
  console.log("");

  if (allFindings.length > 0) {
    console.log("Findings (nothing is merged automatically — review before acting):");
    console.log(JSON.stringify(allFindings, null, 2));
  } else {
    console.log("No findings. Registry is clean.");
  }

  if (!fixDrift) {
    if (driftFindings.length > 0) console.log(`\n${driftFindings.length} stale denormalized name(s). Re-run with --fix-drift to re-sync them.`);
    return;
  }

  // The one auto-fixable case: the correct value is unambiguous (the linked entity's
  // current canonical name). Never touches any other finding.
  let fixed = 0;
  for (const link of DENORMALIZED_LINKS) {
    const rowsForTable = driftRows.filter((r) => r.table === link.table && (r.storedText ?? "") !== r.canonicalName);
    for (const row of rowsForTable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above.
      const { error: updateError } = await (admin.from(link.table as any) as any)
        .update({ [link.textColumn]: row.canonicalName })
        .eq("id", row.rowId);
      if (updateError) console.error(`  failed ${link.table}.${row.rowId}: ${updateError.message}`);
      else fixed += 1;
    }
  }
  console.log(`\nRe-synced ${fixed} denormalized name(s) to their linked entity's current canonical name.`);
}

main();
