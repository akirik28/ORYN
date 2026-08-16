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
 *
 * NOT RUN as part of this change — this environment has no applied migrations (0038
 * included) and no SUPABASE_SECRET_KEY, so there is no live `institutions` table to read.
 */

import { auditEntities, findDenormalizedNameDrift, summarizeFindings, type AuditableEntity, type DenormalizedNameRow } from "../lib/entities/audit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

/** Every table + column pair whose text is kept in sync with a linked institution's
 * canonical name (mirrors app/(app)/profile/actions.ts's ENTITY_LINK_FIELDS). */
const DENORMALIZED_LINKS: { table: string; idColumn: string; textColumn: string }[] = [
  { table: "profiles", idColumn: "school_id", textColumn: "school_name" },
  { table: "education_records", idColumn: "school_id", textColumn: "school_name" },
  { table: "work_experiences", idColumn: "organization_id", textColumn: "organization" },
  { table: "volunteering_experiences", idColumn: "organization_id", textColumn: "organization" },
  { table: "activities", idColumn: "organization_id", textColumn: "organization" },
  { table: "research_experiences", idColumn: "organization_id", textColumn: "organization" },
  { table: "awards", idColumn: "organization_id", textColumn: "organization" },
  { table: "certifications", idColumn: "organization_id", textColumn: "organization" },
  { table: "projects", idColumn: "organization_id", textColumn: "organization" },
  { table: "sports_experiences", idColumn: "team_organization_id", textColumn: "team_name" },
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

  const { data: institutionRows, error } = await admin
    .from("institutions")
    .select("id, category, canonical_name, aliases, country, city, website_url, status");
  if (error) {
    console.error(`Couldn't read institutions: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const entities: AuditableEntity[] = (institutionRows ?? []).map((row) => ({
    id: row.id,
    canonicalName: row.canonical_name,
    aliases: row.aliases,
    country: row.country,
    city: row.city,
    category: row.category,
    websiteUrl: row.website_url,
    status: row.status,
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

  console.log(`Entity registry audit — ${entities.length} institutions, ${driftRows.length} linked rows checked for name drift.`);
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
