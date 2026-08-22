#!/usr/bin/env node
/**
 * Dry-run for the subject_taxonomy expansion (2026-08-22) — READ-ONLY, writes nothing to
 * the database.
 *
 * Reads a local TSV snapshot of every `university_programs` row currently classified
 * `other` (id, name — pulled read-only via the Supabase MCP tool immediately before this
 * run) and re-classifies each name with the updated `classifySubjects()`, reporting:
 *   - how many rows would move out of `other`, and into which category
 *   - a sample of rows that move, per destination category
 *   - a sample of rows that would still stay `other` (the honest remainder, not just the win)
 *
 * Per the coordination session's explicit instruction: report this before any actual
 * database write, sample included on both sides, not just what moves.
 *
 * Usage: npx tsx scripts/subject-taxonomy-backfill-dryrun.ts <path-to-tsv>
 * TSV format: one row per line, "<uuid>\t<program name>".
 */
import { readFileSync } from "node:fs";
import { classifySubjects, type SubjectTaxonomy } from "../lib/programs/subject-taxonomy";

const tsvPath = process.argv[2];
if (!tsvPath) {
  console.error("Usage: npx tsx scripts/subject-taxonomy-backfill-dryrun.ts <path-to-tsv>");
  process.exit(1);
}

const lines = readFileSync(tsvPath, "utf8").split("\n").filter(Boolean);

const moved: Record<string, { id: string; name: string }[]> = {};
const stillOther: { id: string; name: string }[] = [];

for (const line of lines) {
  const tabIndex = line.indexOf("\t");
  if (tabIndex === -1) continue;
  const id = line.slice(0, tabIndex);
  const name = line.slice(tabIndex + 1);
  const { primary } = classifySubjects(name);
  if (primary === "other") {
    stillOther.push({ id, name });
  } else {
    (moved[primary] ??= []).push({ id, name });
  }
}

const totalRows = lines.length;
const totalMoved = totalRows - stillOther.length;

console.log(`Total 'other' rows measured: ${totalRows}`);
console.log(`Would move out of 'other': ${totalMoved} (${((totalMoved / totalRows) * 100).toFixed(1)}%)`);
console.log(`Would stay 'other': ${stillOther.length} (${((stillOther.length / totalRows) * 100).toFixed(1)}%)`);
console.log("");
console.log("Breakdown by destination category:");
const sortedCategories = (Object.keys(moved) as SubjectTaxonomy[]).sort((a, b) => moved[b].length - moved[a].length);
for (const cat of sortedCategories) {
  console.log(`  ${cat}: ${moved[cat].length}`);
}
console.log("");
console.log("=== Sample of rows that MOVE (up to 5 per destination category) ===");
for (const cat of sortedCategories) {
  console.log(`\n-- ${cat} (${moved[cat].length} total) --`);
  for (const row of moved[cat].slice(0, 5)) {
    console.log(`  ${row.id}  ${row.name}`);
  }
}
console.log("");
console.log(`=== Sample of rows that STAY 'other' (20 of ${stillOther.length}) ===`);
for (const row of stillOther.slice(0, 20)) {
  console.log(`  ${row.id}  ${row.name}`);
}
