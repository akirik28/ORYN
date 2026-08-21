#!/usr/bin/env node
/**
 * Duplicate audit for the programme research corpus (`data/research/university-programs`).
 *
 * READ-ONLY. It reads .jsonl files off disk, classifies duplicate candidates and prints them.
 * It does not touch the database, does not write to the corpus, and has no merge, delete or
 * `--apply` path — deliberately, because the failure this audit exists to prevent is a
 * collapse that destroyed 53 genuine METU programmes to catch one real duplicate. Every
 * classification below is a recommendation for a human, not an instruction to a machine.
 *
 * Usage:
 *   npm run audit:program-corpus-duplicates
 *   npm run audit:program-corpus-duplicates -- --out /tmp/dupes.json
 *   npm run audit:program-corpus-duplicates -- --show legitimate_split
 */

export {};

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { groupByResearchId, groupByUrlAndAnnotationStrippedName, groupByUrlAndName, type CorpusProgramRecord, type DuplicateClass, type DuplicateGroup } from "../lib/programs/corpus-duplicates";
import { normalizeProgramName } from "../lib/programs/normalize";

const DIR = "data/research/university-programs";

const CLASS_ORDER: DuplicateClass[] = ["genuine_duplicate", "re_research", "legitimate_split", "id_collision_distinct_programmes"];

function load(): CorpusProgramRecord[] {
  const out: CorpusProgramRecord[] = [];
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".jsonl")).sort()) {
    let line = 0;
    for (const raw of readFileSync(`${DIR}/${file}`, "utf-8").split("\n")) {
      const t = raw.trim();
      if (!t) continue;
      line += 1;
      out.push({ ...(JSON.parse(t) as CorpusProgramRecord), __file: file, __line: line });
    }
  }
  return out;
}

function pct(n: number, total: number): string {
  return total === 0 ? "n/a" : `${((n / total) * 100).toFixed(1)}%`;
}

function describe(g: DuplicateGroup): string {
  const where = g.records.map((r) => `${r.__file}:${r.__line}`).join(", ");
  return `  [${g.classification}] ${g.records[0].university_name} :: "${g.records[0].program_name}" (${g.records.length} records)\n      ${g.explanation}\n      ${where}`;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--apply") || args.includes("--merge") || args.includes("--delete")) {
    console.error("This is an audit. It has no merge/delete path and never writes. Classify by hand from this report.");
    process.exitCode = 1;
    return;
  }
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const showIdx = args.indexOf("--show");
  const show = showIdx >= 0 ? (args[showIdx + 1] as DuplicateClass) : null;

  const records = load();
  const files = new Set(records.map((r) => r.__file));
  console.log(`=== Programme research corpus ===`);
  console.log(`${files.size} files, ${records.length} records\n`);

  // Raw, unclassified counts first, so the classified numbers below can be checked against
  // something that involved no judgement.
  const idCounts = new Map<string, number>();
  const urlCounts = new Map<string, number>();
  for (const r of records) {
    const id = (r.research_program_id ?? "").trim();
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    const url = (r.official_program_url ?? "").trim();
    if (url) urlCounts.set(url, (urlCounts.get(url) ?? 0) + 1);
  }
  const dupIdValues = [...idCounts.values()].filter((c) => c > 1);
  const dupUrlValues = [...urlCounts.values()].filter((c) => c > 1);
  console.log(`Raw signals (no judgement applied):`);
  console.log(`  research_program_id values appearing more than once: ${dupIdValues.length} (${dupIdValues.reduce((a, b) => a + b, 0)} records)`);
  console.log(`  official_program_url values appearing more than once: ${dupUrlValues.length} (${dupUrlValues.reduce((a, b) => a + b, 0)} records)`);
  console.log(`\n  The URL number is NOT a duplicate count. A university publishing one catalogue page for its`);
  console.log(`  whole programme list makes every one of those records share a URL — that is the normal`);
  console.log(`  shape of the source, not a defect. Candidates below require a shared URL AND a shared name.`);

  // How much of the raw URL signal is pure catalogue-page sharing.
  const sharedUrlNoNameMatch = [...urlCounts.entries()].filter(([url, c]) => {
    if (c <= 1) return false;
    const group = records.filter((r) => (r.official_program_url ?? "").trim() === url);
    return new Set(group.map((r) => normalizeProgramName(r.program_name))).size === group.length;
  });
  console.log(`  ... of which every record has a DIFFERENT programme name (a catalogue page, not a duplicate): ${sharedUrlNoNameMatch.length}`);

  const groups = [...groupByResearchId(records), ...groupByUrlAndName(records), ...groupByUrlAndAnnotationStrippedName(records)];
  // A group can be raised by both signals; report each set of records once.
  const seen = new Set<string>();
  const unique: DuplicateGroup[] = [];
  for (const g of groups) {
    const fingerprint = g.records
      .map((r) => `${r.__file}:${r.__line}`)
      .sort()
      .join("|");
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(g);
  }

  const byClass = new Map<DuplicateClass, DuplicateGroup[]>();
  for (const g of unique) byClass.set(g.classification, [...(byClass.get(g.classification) ?? []), g]);

  const totalGroups = unique.length;
  const totalRecords = unique.reduce((n, g) => n + g.records.length, 0);
  const bySignal = new Map<string, number>();
  for (const g of unique) bySignal.set(g.signal, (bySignal.get(g.signal) ?? 0) + 1);
  console.log(`\n=== Candidates raised, by signal ===`);
  for (const [s, n] of [...bySignal.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(42)} ${String(n).padStart(4)} groups`);

  console.log(`\n=== Classified candidates: ${totalGroups} groups, ${totalRecords} records ===`);
  for (const c of CLASS_ORDER) {
    const list = byClass.get(c) ?? [];
    const recs = list.reduce((n, g) => n + g.records.length, 0);
    console.log(`  ${c.padEnd(34)} ${String(list.length).padStart(4)} groups  ${String(recs).padStart(4)} records  ${pct(list.length, totalGroups)}`);
  }

  const genuine = byClass.get("genuine_duplicate") ?? [];
  const identical = genuine.filter((g) => g.allFieldsIdentical);
  console.log(`\n  Collapsible without destroying a real distinction: ${genuine.length} group(s).`);
  console.log(`    ... of which byte-identical in every field (collapsing provably loses nothing): ${identical.length}`);
  console.log(`    ... of which differ in non-discriminating fields (a human must pick which to keep): ${genuine.length - identical.length}`);
  console.log(`  Everything else must be left alone or handled by supersession/re-minting, not deletion.`);

  // Cross-cutting, and independent of the duplicate question: a group can be a perfectly
  // legitimate split AND still share one research_program_id. That is an ID-minting defect —
  // the fr_it_es_ch batch mints one id per programme-name-and-degree rather than per physical
  // programme. The fix is re-minting an identifier, never merging or deleting a record.
  const sharingAnId = unique.filter((g) => new Set(g.records.map((r) => (r.research_program_id ?? "").trim()).filter(Boolean)).size === 1 && g.records.length > 1);
  const sharedIdNotDuplicates = sharingAnId.filter((g) => g.classification === "legitimate_split");
  console.log(`\n=== ID-minting defect (separate from the duplicate question) ===`);
  console.log(`Groups whose records all share one research_program_id: ${sharingAnId.length}`);
  console.log(`  ... of which are legitimate splits, i.e. distinct programmes wrongly sharing an id: ${sharedIdNotDuplicates.length}`);
  console.log(`  Fix by re-minting an identifier for all but one record. Do NOT merge or delete.`);

  for (const c of CLASS_ORDER) {
    const list = byClass.get(c) ?? [];
    if (list.length === 0) continue;
    if (show && show !== c) continue;
    const cap = show ? list.length : c === "legitimate_split" ? 15 : list.length;
    console.log(`\n--- ${c} (${list.length}) ---`);
    for (const g of list.slice(0, cap)) console.log(describe(g));
    if (list.length > cap) console.log(`  ... and ${list.length - cap} more (re-run with --show ${c} to see all)`);
  }

  // Which discriminator actually does the work, across every split found.
  const splitFields = new Map<string, number>();
  for (const g of byClass.get("legitimate_split") ?? []) for (const d of g.discriminators) splitFields.set(d, (splitFields.get(d) ?? 0) + 1);
  if (splitFields.size > 0) {
    console.log(`\n=== Which field distinguishes a legitimate split ===`);
    for (const [f, n] of [...splitFields.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${f.padEnd(24)} ${n} group(s)`);
  }

  if (outPath) {
    writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), totalGroups, totalRecords, groups: unique }, null, 2));
    console.log(`\nFull classification written to ${outPath}`);
  }

  console.log(`\nNothing was deleted, merged or modified. This audit has no write path.`);
}

main();
