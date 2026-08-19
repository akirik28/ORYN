#!/usr/bin/env node
/**
 * Applies the 273 pre-researched, sourced opportunity records that have been sitting unapplied
 * in `supabase/seed_drive_batch1.sql` since 2026-08-15 — a real corpus (title, description,
 * category, official_url, source attribution, confidence, status, verified date), never
 * fabricated here, originally blocked only by `SUPABASE_SECRET_KEY` being a placeholder at
 * generation time (see PHASE_STATUS.md / docs/data-readiness.md). That's no longer true.
 *
 * `opportunities` is live, populated, and under active, separate, concurrent development (a
 * parallel session/branch — see docs/handoffs/claude-a-university-spine.md's ownership note)
 * that is inserting its own rows into the SAME table during the same window this script runs
 * in. This script is pure DML against the existing schema (no migration, no new table, no
 * column change) and re-checks the live table for a title collision immediately before every
 * single write, not just once at the start — a snapshot taken at start is not safe to insert
 * against 250+ writes later when another process is concurrently adding rows to the exact same
 * table.
 *
 * Dedup: reuses this codebase's own lib/opportunities/dedup.ts (URL-exact-match, or
 * same-organization-and-similar-title) plus a title-similarity-only fallback specific to this
 * corpus, which has no `organization` value to combine with (see loadSeedOpportunities) — a
 * bare Jaccard title-similarity threshold on its own, without the organization qualifier the
 * library normally requires.
 *
 * Usage:
 *   npm run import:opportunity-corpus                # dry run
 *   npm run import:opportunity-corpus -- --apply
 *   npm run import:opportunity-corpus -- --apply --limit 50
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isDuplicateOpportunity, titleSimilarity } from "../lib/opportunities/dedup";

interface SeedOpportunity {
  title: string;
  description: string;
  category: string;
  official_url: string;
  source: string;
  source_url: string;
  source_confidence: string;
  status: string;
  last_verified_at: string;
  normalized_title: string;
}

/**
 * Minimal quote-aware SQL tuple parser for exactly this file's `VALUES (...), (...), ...`
 * shape — handles `''`-escaped quotes and an optional `timestamptz '...'` cast prefix on a
 * field, both of which a naive comma-split would get wrong given how much raw scraped text
 * (commas, parentheses, apostrophes) sits inside these description strings.
 */
function parseSqlTuples(sql: string): string[][] {
  const tuples: string[][] = [];
  let i = 0;
  const n = sql.length;

  while (i < n) {
    while (i < n && /[\s,;]/.test(sql[i])) i++;
    if (i >= n || sql[i] !== "(") break;
    i++;

    const fields: string[] = [];
    for (;;) {
      while (i < n && /\s/.test(sql[i])) i++;
      if (sql.slice(i, i + 11) === "timestamptz") {
        i += 11;
        while (i < n && /\s/.test(sql[i])) i++;
      }
      if (sql[i] === "'") {
        i++;
        let value = "";
        while (i < n) {
          if (sql[i] === "'" && sql[i + 1] === "'") {
            value += "'";
            i += 2;
            continue;
          }
          if (sql[i] === "'") {
            i++;
            break;
          }
          value += sql[i];
          i++;
        }
        fields.push(value);
      } else {
        const start = i;
        while (i < n && sql[i] !== "," && sql[i] !== ")") i++;
        fields.push(sql.slice(start, i).trim());
      }
      while (i < n && /\s/.test(sql[i])) i++;
      if (sql[i] === ",") {
        i++;
        continue;
      }
      if (sql[i] === ")") {
        i++;
        break;
      }
      throw new Error(`SQL tuple parse error at index ${i}: ...${sql.slice(Math.max(0, i - 30), i + 30)}...`);
    }
    tuples.push(fields);
  }
  return tuples;
}

function loadSeedOpportunities(): SeedOpportunity[] {
  const filePath = fileURLToPath(new URL("../supabase/seed_drive_batch1.sql", import.meta.url));
  const content = readFileSync(filePath, "utf-8");

  const header =
    "insert into public.opportunities (title, description, category, official_url, source, source_url, source_confidence, status, last_verified_at, normalized_title)\nvalues\n";
  const startIdx = content.indexOf(header);
  if (startIdx === -1) throw new Error("Could not find the opportunities INSERT header in seed_drive_batch1.sql — has the file changed shape?");
  const blockStart = startIdx + header.length;
  const endIdx = content.indexOf("\ninsert into public.opportunity_sources", blockStart);
  if (endIdx === -1) throw new Error("Could not find the end of the opportunities INSERT block.");

  const tuples = parseSqlTuples(content.slice(blockStart, endIdx));
  return tuples.map((f) => {
    if (f.length !== 10) throw new Error(`Expected 10 fields, got ${f.length}: ${f[0]?.slice(0, 60)}`);
    const [title, description, category, official_url, source, source_url, source_confidence, status, last_verified_at, normalized_title] = f;
    return { title, description, category, official_url, source, source_url, source_confidence, status, last_verified_at, normalized_title };
  });
}

const VALID_CATEGORIES = new Set([
  "competition",
  "research",
  "internship",
  "summer_program",
  "fellowship",
  "scholarship",
  "volunteering",
  "entrepreneurship",
  "hackathon",
  "academic_program",
  "conference",
  "student_program",
  "online_program",
]);
const VALID_STATUSES = new Set(["active", "expired", "under_review", "disabled"]);

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const limitIndex = argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md.");
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const seedRows = loadSeedOpportunities();
  console.log(`Parsed ${seedRows.length} candidate rows from the seed corpus.`);

  const { data: liveRows, error: liveError } = await admin.from("opportunities").select("title, organization, official_url, normalized_title");
  if (liveError) throw new Error(`Couldn't read live opportunities: ${liveError.message}`);
  const live = liveRows ?? [];
  console.log(`${live.length} opportunities currently live.`);

  const toInsert: SeedOpportunity[] = [];
  const skippedDuplicate: string[] = [];
  const skippedInvalid: string[] = [];
  const seenThisBatch = new Set<string>();

  for (const row of seedRows) {
    if (!VALID_CATEGORIES.has(row.category) || !VALID_STATUSES.has(row.status)) {
      skippedInvalid.push(`${row.title} (category=${row.category}, status=${row.status})`);
      continue;
    }

    const dupeAgainstLive = live.find(
      (existing) =>
        isDuplicateOpportunity(
          { title: row.title, organization: null, officialUrl: row.official_url },
          { title: existing.title, organization: existing.organization, officialUrl: existing.official_url }
        ) || titleSimilarity(row.title, existing.title) >= 0.75
    );
    if (dupeAgainstLive) {
      skippedDuplicate.push(`${row.title} ~= ${dupeAgainstLive.title}`);
      continue;
    }
    if (seenThisBatch.has(row.normalized_title)) {
      skippedDuplicate.push(`${row.title} (duplicate within this corpus)`);
      continue;
    }
    seenThisBatch.add(row.normalized_title);
    toInsert.push(row);
  }

  const limited = limit && Number.isFinite(limit) ? toInsert.slice(0, limit) : toInsert;

  console.log(
    `${toInsert.length} new (${limited.length} this run after --limit), ${skippedDuplicate.length} skipped as duplicate, ` +
      `${skippedInvalid.length} skipped for an unrecognized category/status.\n`
  );
  if (skippedInvalid.length > 0) {
    console.log("Skipped (invalid category/status):");
    for (const s of skippedInvalid) console.log(`  ${s}`);
    console.log("");
  }

  if (!apply) {
    console.log("Dry run — nothing written. Re-run with --apply.");
    for (const row of limited) console.log(`  would insert [${row.category}/${row.status}] ${row.title}`);
    return;
  }

  let written = 0;
  const categoryTally = new Map<string, number>();
  for (const row of limited) {
    // Re-checked immediately before THIS write, not just at the batch's start — see the file
    // header: another process is concurrently inserting into this exact table.
    const { data: fresh } = await admin.from("opportunities").select("id").eq("normalized_title", row.normalized_title).maybeSingle();
    if (fresh) {
      console.log(`  skip (appeared live since the dry-run check): ${row.title}`);
      continue;
    }

    const { data: inserted, error } = await admin
      .from("opportunities")
      .insert({
        title: row.title,
        description: row.description,
        category: row.category,
        official_url: row.official_url,
        source: row.source,
        source_url: row.source_url,
        source_confidence: row.source_confidence,
        status: row.status,
        last_verified_at: row.last_verified_at,
        normalized_title: row.normalized_title,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error(`  FAILED ${row.title}: ${error?.message ?? "no row returned"}`);
      continue;
    }

    const { error: sourceError } = await admin.from("opportunity_sources").insert({
      opportunity_id: inserted.id,
      source_url: row.source_url,
      source_domain: safeHostname(row.source_url),
      source_type: "founder_corpus",
      confidence: row.source_confidence,
      raw_excerpt: row.description.slice(0, 500),
    });
    if (sourceError) console.error(`  (opportunity written, but its source row failed: ${sourceError.message})`);

    written++;
    categoryTally.set(row.category, (categoryTally.get(row.category) ?? 0) + 1);
  }

  console.log(`\nWrote ${written}/${limited.length}.`);
  console.log("By category:");
  for (const [category, count] of [...categoryTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
