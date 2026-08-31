#!/usr/bin/env node
/**
 * Refreshes retrieved_at/last_checked_at/research_record_id on the 7 Dutch numerus-fixus
 * requirement rows that were live re-verified on 2026-09-01 (an 8th, Tilburg TIL0045, was
 * unreachable — Cloudflare bot-protection, confirmed via both browser and curl — and is
 * deliberately left untouched here).
 *
 * This is an UPDATE, not an INSERT, and deliberately does not go through
 * scripts/ingest-requirements-deadlines.ts: that pipeline only inserts new rows (see
 * scripts/ingest-requirements-deadlines.ts:268, a plain .insert()), and re-running it with
 * content that is byte-identical to what's already live would create duplicate rows on the
 * university detail page rather than refresh the existing one. The corresponding corpus
 * file (data/research/university-requirements/de_nl_requirements_refresh_2026-09-01.jsonl)
 * still exists as the audit trail of what was re-checked and found unchanged; this script is
 * the mechanism that actually touches the DB for a "confirmed still accurate" pass.
 *
 * Safety: before writing anything, re-fetches each target row and requires its LIVE
 * requirement_detail to still match the text this pass verified — if a row has drifted
 * since the browser check (e.g. another lane wrote to it in the meantime), that row is
 * skipped and flagged rather than silently touched.
 *
 * Dry-run by default; writes only with --apply. Pre-image backed up to data/audit/ before
 * any write (matching scripts/backfill-requirement-verification-state.ts's convention).
 *
 * Usage:
 *   npx tsx scripts/refresh-dutch-numerus-fixus-freshness.ts
 *   npx tsx scripts/refresh-dutch-numerus-fixus-freshness.ts --apply
 */
import { readFileSync, writeFileSync } from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fine
}

interface ConfirmationRecord {
  research_requirement_id: string;
  requirement_text: string;
  retrieved_at: string;
  supersedes: string;
}

interface ReqRow {
  id: string;
  research_record_id: string | null;
  requirement_detail: string;
  retrieved_at: string;
  last_checked_at: string | null;
}

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  const records: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    records.push(JSON.parse(trimmed));
  }
  return records;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }

  const confirmations = parseJsonl<ConfirmationRecord>(
    "data/research/university-requirements/de_nl_requirements_refresh_2026-09-01.jsonl"
  );
  console.log(`Loaded ${confirmations.length} confirmation record(s).`);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: rows, error: fetchError } = await admin
    .from("university_requirements")
    .select("id,research_record_id,requirement_detail,retrieved_at,last_checked_at")
    .in(
      "research_record_id",
      confirmations.map((c) => c.supersedes)
    );
  if (fetchError) {
    console.error(`Failed to fetch rows: ${fetchError.message}`);
    process.exitCode = 1;
    return;
  }

  const byOldId = new Map<string, ReqRow>();
  for (const r of (rows ?? []) as ReqRow[]) {
    if (r.research_record_id) byOldId.set(r.research_record_id, r);
  }

  const toUpdate: { row: ReqRow; confirmation: ConfirmationRecord }[] = [];
  const drifted: { row: ReqRow; confirmation: ConfirmationRecord }[] = [];
  const missing: ConfirmationRecord[] = [];

  for (const c of confirmations) {
    const row = byOldId.get(c.supersedes);
    if (!row) {
      missing.push(c);
      continue;
    }
    if (row.requirement_detail !== c.requirement_text) {
      drifted.push({ row, confirmation: c });
      continue;
    }
    toUpdate.push({ row, confirmation: c });
  }

  console.log(`Matched and content-verified (safe to refresh): ${toUpdate.length}`);
  if (missing.length > 0) {
    console.log(`No DB row found for research_record_id: ${missing.length}`);
    for (const c of missing) console.log(`  ${c.supersedes}`);
  }
  if (drifted.length > 0) {
    console.log(`SKIPPED — live DB text no longer matches what this pass verified: ${drifted.length}`);
    for (const d of drifted) console.log(`  ${d.row.id} (${d.confirmation.supersedes})`);
  }

  if (toUpdate.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  const backupPath = `data/audit/dutch-numerus-fixus-freshness-refresh-backup-${Date.now()}.json`;
  writeFileSync(backupPath, JSON.stringify(toUpdate.map((t) => t.row), null, 2));
  console.log(`Pre-image backed up to ${backupPath}`);

  let succeeded = 0;
  let failed = 0;
  const nowIso = new Date().toISOString();
  for (const { row, confirmation } of toUpdate) {
    const { error } = await admin
      .from("university_requirements")
      .update({
        retrieved_at: confirmation.retrieved_at,
        last_checked_at: nowIso,
        research_record_id: confirmation.research_requirement_id,
      })
      .eq("id", row.id);
    if (error) {
      failed++;
      console.error(`  FAILED ${row.id}: ${error.message}`);
    } else {
      succeeded++;
    }
  }
  console.log(`\nRefreshed ${succeeded}/${toUpdate.length} row(s). ${failed} failure(s).`);
}

main();
