#!/usr/bin/env node
/**
 * Generates lib/universities/duplicate-supersessions.json — see lib/universities/canonical.ts
 * for why this exists (migration 0043 / superseded_by_id is written but not DDL-applicable in
 * this environment; this is the same fix at the application layer).
 *
 * Finds every `canonical_entity_id` shared by more than one live `universities` row — this can
 * only happen for a pair `merge_canonical_entities()` has already confirmed is one real
 * institution (ROR/external-id evidence, not a guess made here) — scores each row with
 * `pickCanonicalWinner()`, and writes the losing → winning id mapping.
 *
 * Safe to re-run any time: idempotent (same input produces the same output), read-only against
 * the database (never writes), and the only thing that changes its output is new merges or new
 * FK data landing on one side.
 *
 * Usage:
 *   npm run resolve:university-duplicates                 # writes the JSON
 *   npm run resolve:university-duplicates -- --check       # exits 1 if regenerating would
 *                                                           # change the committed file (CI use)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { fetchAllRowsVerified } from "../lib/acquisition/paginate";
import { pickCanonicalWinner, type DuplicateCandidate } from "../lib/universities/canonical";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const OUT_PATH = join(__dirname, "..", "lib", "universities", "duplicate-supersessions.json");

// Every table with a `university_id` FK into `universities` (supabase/migrations/0006, 0007,
// 0038) — kept as an explicit list rather than introspected, so a new FK'd table added later
// is a conscious decision to add here, not a silent gap in the reference count.
const FK_TABLES = [
  "university_programs",
  "university_requirements",
  "university_statistics",
  "university_deadlines",
  "university_sources",
  "target_universities",
  "university_rankings",
  "university_profile_metrics",
] as const;

interface Rest {
  url: string;
  key: string;
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const rest: Rest = { url, key };
  const checkOnly = process.argv.includes("--check");

  const { rows: universities } = await fetchAllRowsVerified<{ id: string; name: string; canonical_entity_id: string | null; website_url: string | null; created_at: string }>(
    rest,
    "universities",
    "id,name,canonical_entity_id,website_url,created_at",
    "order=id.asc"
  );

  const byEntity = new Map<string, typeof universities>();
  for (const u of universities) {
    if (!u.canonical_entity_id) continue;
    byEntity.set(u.canonical_entity_id, [...(byEntity.get(u.canonical_entity_id) ?? []), u]);
  }
  const groups = [...byEntity.entries()].filter(([, rows]) => rows.length > 1);

  if (groups.length === 0) {
    console.log("No canonical_entity_id is currently shared by more than one universities row. Nothing to resolve.");
    writeOut({}, checkOnly);
    return;
  }

  console.log(`${groups.length} canonical_entity_id group(s) with >1 universities row (${groups.reduce((n, [, r]) => n + r.length, 0)} rows total).`);

  const allIds = groups.flatMap(([, rows]) => rows.map((r) => r.id));
  const refCounts = new Map<string, number>(allIds.map((id) => [id, 0]));
  for (const table of FK_TABLES) {
    const { rows } = await fetchAllRowsVerified<{ university_id: string }>(
      rest,
      table,
      "university_id",
      `university_id=in.(${allIds.join(",")})&order=university_id.asc`
    );
    for (const row of rows) refCounts.set(row.university_id, (refCounts.get(row.university_id) ?? 0) + 1);
  }

  const supersessions: Record<string, { winnerId: string; winnerName: string; loserName: string; reason: string }> = {};

  for (const [entityId, rows] of groups) {
    const candidates: DuplicateCandidate[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      totalReferences: refCounts.get(r.id) ?? 0,
      hasWebsiteUrl: Boolean(r.website_url),
      createdAt: r.created_at,
    }));
    const winner = pickCanonicalWinner(candidates);
    console.log(`\n  entity ${entityId}:`);
    for (const c of candidates) {
      console.log(`    ${c.id === winner.id ? "WINNER" : "loser "}  "${c.name}"  refs=${c.totalReferences} website=${c.hasWebsiteUrl} created=${c.createdAt}`);
    }
    for (const c of candidates) {
      if (c.id === winner.id) continue;
      const reasonParts: string[] = [];
      if (winner.totalReferences !== c.totalReferences) reasonParts.push(`${winner.totalReferences} vs ${c.totalReferences} FK references`);
      else if (winner.hasWebsiteUrl !== c.hasWebsiteUrl) reasonParts.push("has a website_url, loser doesn't");
      else reasonParts.push("tie-broken by name form / creation order");
      supersessions[c.id] = { winnerId: winner.id, winnerName: winner.name, loserName: c.name, reason: reasonParts.join("; ") };
    }
  }

  writeOut(supersessions, checkOnly);
}

function writeOut(data: Record<string, unknown>, checkOnly: boolean): void {
  // Sort top-level (loser-id) keys for a stable diff on regeneration — JSON.stringify's
  // array-replacer form does NOT do this (it's a recursive key allowlist, so passing UUID
  // keys would strip every nested field's own differently-named keys); building a
  // freshly-ordered object first is the correct way to get a stable top-level key order.
  const sorted = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
  const json = `${JSON.stringify(sorted, null, 2)}\n`;
  if (checkOnly) {
    const existing = (() => {
      try {
        return readFileSync(OUT_PATH, "utf-8");
      } catch {
        return null;
      }
    })();
    if (existing !== json) {
      console.error(`\n${OUT_PATH} is out of date — re-run without --check to regenerate.`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${OUT_PATH} is up to date.`);
    return;
  }
  writeFileSync(OUT_PATH, json);
  console.log(`\nWrote ${Object.keys(data).length} supersession(s) to ${OUT_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
