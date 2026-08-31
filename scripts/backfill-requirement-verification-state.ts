#!/usr/bin/env node
/**
 * Backfills verification_state on the 1,241 live university_requirements rows whose
 * research_record_id matches a research_requirement_id still present in
 * data/research/university-requirements/ — everything AcceptedRequirementRow would have
 * written had this field existed when the row was first ingested (see
 * lib/requirements/ingest.ts's mapToRequirementVerificationState and
 * docs/handoffs/requirement-verification-state-filter-2026-08-31.md).
 *
 * Deliberately excludes the 84 rows with no research_record_id at all — see
 * docs/handoffs/requirement-84-unresolved-rows-2026-08-31.md: they predate the column
 * entirely and stay 'unverified', the honest state for unreconstructable provenance. This
 * script's own matching logic still can't resolve them (research_record_id is null), so
 * they are naturally excluded rather than needing a separate guard.
 *
 * Dry-run by default. Backs up the full pre-image (id, verification_state,
 * research_record_id, university_id, requirement_type) of every row this run WOULD touch
 * to a timestamped JSON file before writing anything, so the exact prior state is
 * recoverable without re-deriving it.
 *
 * Usage:
 *   npx tsx scripts/backfill-requirement-verification-state.ts
 *   npx tsx scripts/backfill-requirement-verification-state.ts --apply
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { mapToRequirementVerificationState } from "../lib/requirements/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fine
}

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  const records: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // skip malformed line
    }
  }
  return records;
}

interface ReqRow {
  id: string;
  university_id: string;
  research_record_id: string | null;
  requirement_type: string;
  verification_state: string;
  title: string | null;
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

  const dir = "data/research/university-requirements";
  const byResearchId = new Map<string, string>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
    for (const rec of parseJsonl<{ research_requirement_id?: string; verification_state?: string }>(`${dir}/${f}`)) {
      if (rec.research_requirement_id && rec.verification_state) {
        byResearchId.set(rec.research_requirement_id, rec.verification_state);
      }
    }
  }

  const target: PostgrestTarget = { url, key };
  const { rows } = await fetchAllRowsVerified<ReqRow>(
    target,
    "university_requirements",
    "id,university_id,research_record_id,requirement_type,verification_state,title",
    "order=id"
  );
  console.log(`Live rows: ${rows.length}`);

  const toUpdate: { id: string; from: string; to: string; university_id: string; requirement_type: string; title: string | null; researchState: string }[] = [];
  for (const row of rows) {
    const researchState = row.research_record_id ? byResearchId.get(row.research_record_id) : undefined;
    if (!researchState) continue; // the 84 unresolved rows, or anything genuinely new — left untouched
    const newState = mapToRequirementVerificationState(researchState);
    if (newState !== row.verification_state) {
      toUpdate.push({ id: row.id, from: row.verification_state, to: newState, university_id: row.university_id, requirement_type: row.requirement_type, title: row.title, researchState });
    }
  }

  const beforeCounts: Record<string, number> = {};
  for (const row of rows) beforeCounts[row.verification_state] = (beforeCounts[row.verification_state] ?? 0) + 1;
  console.log("\nBEFORE (live, all rows):", beforeCounts);

  const afterCounts: Record<string, number> = { ...beforeCounts };
  for (const u of toUpdate) {
    afterCounts[u.from] = (afterCounts[u.from] ?? 0) - 1;
    afterCounts[u.to] = (afterCounts[u.to] ?? 0) + 1;
  }
  console.log("AFTER (projected, all rows):", afterCounts);
  console.log(`\n${toUpdate.length} row(s) would change.`);

  const toHistorical = toUpdate.filter((u) => u.to === "verified_historical");
  console.log(`\nOf those, ${toHistorical.length} move to verified_historical:`);
  const byUni = new Map<string, number>();
  for (const u of toHistorical) byUni.set(u.university_id, (byUni.get(u.university_id) ?? 0) + 1);
  for (const [uniId, count] of [...byUni.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${uniId}: ${count}`);
  }

  if (toUpdate.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  // Pre-image backup, written every run (dry or apply) so the exact rows and their prior
  // state are on disk before any write is attempted. data/audit/, not
  // data/research/university-requirements/ — that directory is scanned wholesale by
  // classifyCorpusFiles(), which fails loudly (by design) on anything that isn't a
  // requirements/deadlines .jsonl file, and __tests__/requirements/corpus-files.test.ts
  // asserts exactly that against the real directory contents. A first version of this
  // script wrote here and broke that test on its very first --apply run.
  const backupPath = `data/audit/requirement-verification-state-backfill-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(backupPath, JSON.stringify(toUpdate, null, 1));
  console.log(`\nPre-image of every row this run would touch written to ${backupPath}`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  let succeeded = 0;
  let failed = 0;
  for (const u of toUpdate) {
    const { error } = await admin.from("university_requirements").update({ verification_state: u.to }).eq("id", u.id);
    if (error) {
      failed++;
      console.error(`  FAILED ${u.id}: ${error.message}`);
    } else {
      succeeded++;
    }
  }
  console.log(`\nUpdated ${succeeded}/${toUpdate.length} row(s). ${failed} failure(s).`);
}

main();
