#!/usr/bin/env node
/**
 * Ingestion staging dry-run for the 2026-08-21 night-research programme-catalogue
 * batches (data/research/university-programs/independent_batch5_2026-08-21.jsonl
 * through independent_batch29_2026-08-21.jsonl, 4,048 records).
 *
 * READ-ONLY. Writes nothing to the database and nothing outside this repo's own
 * research/report directories. Reuses this platform's real ingestion decision logic
 * (decideIngestion() -> resolveIdentity(), sourceAuthority(), normalizeProgramName(),
 * classifySubjects() -- see lib/programs/ingest.ts) rather than a reimplementation,
 * plus lib/universities/canonical.ts's duplicate-supersession redirect.
 *
 * This environment has no NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SECRET_KEY available to a
 * Node process (no .env.local in this worktree, confirmed before writing this script),
 * so unlike scripts/ingest-university-programs.ts this script does not connect to
 * Supabase itself. Instead it reads four JSON snapshots of the live universities /
 * entity_aliases / entity_external_ids / university_programs tables, fetched
 * read-only via the Supabase MCP tool immediately before this run (see the snapshot
 * files' own mtimes) -- the same "re-read live state right before building the
 * candidate pool" discipline the assignment asked for, just via a different read path
 * than the existing script's own supabase-js client.
 *
 * Classifies every record into exactly one of:
 *   READY_TO_INSERT        -- decideIngestion() accepted it AND language_of_instruction
 *                              (when present) reads as a confirmed fact, not a hedge.
 *   DUPLICATE_OF_EXISTING  -- decideIngestion() outcome "duplicate".
 *   UNRESOLVED_UNIVERSITY  -- decideIngestion() outcome "unresolved_university".
 *   NEEDS_REVIEW           -- everything else: insufficient_evidence, malformed_source,
 *                              rejected, or an accepted record whose language_of_instruction
 *                              is a research-hedge string rather than a clean confirmed
 *                              value (downgraded here, not by decideIngestion itself).
 *
 * Outputs (both written to files, nothing executed):
 *   docs/handoffs/ingestion-staging-2026-08-21-report.md   -- counts + reasons breakdown
 *   docs/handoffs/ingestion-staging-2026-08-21.sql          -- INSERT statements for the
 *                                                               READY_TO_INSERT set only
 *
 * Usage: npx tsx scripts/stage-programs-ingestion-dryrun.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { decideIngestion, programUrlKey, type ResearchProgramRecord, type UniversityLookupRow, type IngestDecision, type AcceptedProgramRow } from "../lib/programs/ingest";
import { canonicalUniversityId, excludeSupersededUniversities } from "../lib/universities/canonical";

const SNAPSHOT_DIR = ".night-scratch";
const BATCH_DIR = "data/research/university-programs";
const REPORT_PATH = "docs/handoffs/ingestion-staging-2026-08-21-report.md";
const SQL_PATH = "docs/handoffs/ingestion-staging-2026-08-21.sql";

interface UniRow {
  id: string;
  name: string;
  country: string;
  canonical_entity_id: string | null;
  website_url: string | null;
}
interface AliasRow {
  entity_id: string;
  alias: string;
}
interface ExtIdRow {
  entity_id: string;
  id_system: string;
  external_id: string;
}
interface ExistingProgRow {
  university_id: string;
  normalized_name: string;
  degree_level: string | null;
  official_program_url: string;
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(SNAPSHOT_DIR, name), "utf-8")) as T;
}

const universitiesRaw = loadJson<UniRow[]>("universities-live.json");
const aliasesRaw = loadJson<AliasRow[]>("aliases-live.json");
const externalIdsRaw = loadJson<ExtIdRow[]>("external-ids-live.json");
const existingPrograms = loadJson<ExistingProgRow[]>("existing-programs-live.json");

console.log(`Live snapshot: ${universitiesRaw.length} universities, ${aliasesRaw.length} aliases, ${externalIdsRaw.length} external ids, ${existingPrograms.length} existing programs.`);

const aliasesByEntity = new Map<string, string[]>();
for (const a of aliasesRaw) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
const externalIdsByEntity = new Map<string, Record<string, string>>();
for (const e of externalIdsRaw) {
  const existing = externalIdsByEntity.get(e.entity_id) ?? {};
  existing[e.id_system] = e.external_id;
  externalIdsByEntity.set(e.entity_id, existing);
}

// Pre-filtered with the same excludeSupersededUniversities() helper the live ingestion scripts
// now use (see scripts/ingest-university-programs.ts), not just the post-hoc
// canonicalUniversityId() redirect below. Pre-filtering fixes the actual failure mode this
// script's redirect could not: a record whose name matches BOTH a winner and loser row equally
// well resolves to `unresolved_university` (resolveIdentity() correctly refuses an ambiguous
// match) before the redirect ever runs, since the redirect only fires on an already-accepted
// decision. With the loser row removed from the pool up front, that ambiguity can't occur — the
// redirect below now only matters for a snapshot that predates a future new supersession entry
// this file wasn't regenerated against, so it stays as a second layer, not the primary fix.
const universities: UniversityLookupRow[] = excludeSupersededUniversities(
  universitiesRaw.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
    externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
    websiteUrl: u.website_url,
  }))
);

const existingKeys = new Set<string>();
for (const r of existingPrograms) {
  existingKeys.add(`${r.university_id}|${r.normalized_name}|${r.degree_level ?? ""}`);
  existingKeys.add(programUrlKey(r.university_id, r.official_program_url));
}

let supersessionRedirects = 0;

function parseJsonl(path: string): ResearchProgramRecord[] {
  const text = readFileSync(path, "utf-8");
  const records: ResearchProgramRecord[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch (err) {
      throw new Error(`${path}:${i + 1}: malformed JSON -- ${(err as Error).message}`);
    }
  }
  return records;
}

const batchFiles = readdirSync(BATCH_DIR)
  .filter((f) => /^independent_batch\d+_2026-08-21\.jsonl$/.test(f))
  .sort((a, b) => {
    const na = Number(a.match(/batch(\d+)_/)![1]);
    const nb = Number(b.match(/batch(\d+)_/)![1]);
    return na - nb;
  });

console.log(`Batch files found: ${batchFiles.length} -- ${batchFiles[0]} .. ${batchFiles[batchFiles.length - 1]}`);

type FinalClass = "READY_TO_INSERT" | "DUPLICATE_OF_EXISTING" | "UNRESOLVED_UNIVERSITY" | "NEEDS_REVIEW";

interface ClassifiedRecord {
  batchFile: string;
  record: ResearchProgramRecord;
  decision: IngestDecision;
  finalClass: FinalClass;
  finalReason: string;
  redirectedFromSupersededId: string | null;
}

/** Marker phrases identifying this session's own "explicit hedge" language values (see
 * docs/handoffs/claude-a-university-spine.md's batch 24/27 findings) -- distinct from a
 * genuinely confirmed value that merely includes a parenthetical justification. */
const HEDGE_MARKERS = [
  "unconfirmed",
  "left explicitly",
  "left as an explicit",
  "left unknown",
  "not confirmed either way",
  "no per-program",
  "no separate per-program",
  "not resolved",
  "dutch track exists but",
];

function languageIsHedge(lang: string | null | undefined): boolean {
  if (!lang) return false;
  const lower = lang.toLowerCase();
  return HEDGE_MARKERS.some((marker) => lower.includes(marker));
}

const classified: ClassifiedRecord[] = [];
const reasonCounts = new Map<string, number>();

for (const file of batchFiles) {
  const records = parseJsonl(join(BATCH_DIR, file));
  for (const record of records) {
    const decision = decideIngestion(record, universities, existingKeys);

    let finalClass: FinalClass;
    let finalReason: string;
    let redirectedFromSupersededId: string | null = null;

    if (decision.outcome === "duplicate") {
      finalClass = "DUPLICATE_OF_EXISTING";
      finalReason = decision.detail ?? "Matches an existing university_programs row.";
    } else if (decision.outcome === "unresolved_university") {
      finalClass = "UNRESOLVED_UNIVERSITY";
      finalReason = decision.detail ?? "No confident university match.";
    } else if (decision.outcome === "accepted" && decision.programRow) {
      // Canonical-supersession redirect: if resolveIdentity() matched a known-superseded
      // ("loser") universities row, redirect to the live canonical winner before treating
      // this as ready. Re-check duplicate/URL keys against the WINNER id too, since the
      // winner (not the loser) is where real existing rows live.
      const originalId = decision.universityId!;
      const canonicalId = canonicalUniversityId(originalId);
      if (canonicalId !== originalId) {
        supersessionRedirects += 1;
        redirectedFromSupersededId = originalId;
        decision.programRow.university_id = canonicalId;
        const redirectedNameKey = `${canonicalId}|${decision.programRow.normalized_name}|${decision.programRow.degree_level ?? ""}`;
        const redirectedUrlKey = programUrlKey(canonicalId, decision.programRow.official_program_url);
        if (existingKeys.has(redirectedNameKey) || existingKeys.has(redirectedUrlKey)) {
          finalClass = "DUPLICATE_OF_EXISTING";
          finalReason = `Resolved to a known-superseded university row (redirected ${originalId} -> ${canonicalId} via lib/universities/canonical.ts); the canonical winner already has this program.`;
          classified.push({ batchFile: file, record, decision, finalClass, finalReason, redirectedFromSupersededId });
          reasonCounts.set(finalReason, (reasonCounts.get(finalReason) ?? 0) + 1);
          continue;
        }
      }

      if (languageIsHedge(record.language_of_instruction)) {
        finalClass = "NEEDS_REVIEW";
        finalReason = "language_of_instruction is an explicit research-hedge (genuine unresolved uncertainty about teaching language), not a clean confirmed production value -- would produce a low-confidence row per the founder's own standard (drop rather than guess).";
      } else {
        finalClass = "READY_TO_INSERT";
        finalReason = redirectedFromSupersededId
          ? `Accepted; university redirected from superseded row ${redirectedFromSupersededId} to canonical ${decision.programRow.university_id}.`
          : "Accepted by decideIngestion(): university resolved, source domain authoritative, verification_status page-confirmed, no existing duplicate.";
      }
    } else {
      // insufficient_evidence, malformed_source, conflicting, rejected
      finalClass = "NEEDS_REVIEW";
      finalReason = `${decision.outcome}: ${decision.detail ?? "no further detail"}`;
    }

    classified.push({ batchFile: file, record, decision, finalClass, finalReason, redirectedFromSupersededId });
    // Bucket the reason for reporting -- collapse per-record detail (which often embeds a
    // specific URL/name) into a stable reason-shape key so counts are meaningful.
    const reasonKey = finalClass === "NEEDS_REVIEW" ? finalReason.split(":")[0] : finalReason;
    reasonCounts.set(reasonKey, (reasonCounts.get(reasonKey) ?? 0) + 1);
  }
}

const classCounts: Record<FinalClass, number> = {
  READY_TO_INSERT: 0,
  DUPLICATE_OF_EXISTING: 0,
  UNRESOLVED_UNIVERSITY: 0,
  NEEDS_REVIEW: 0,
};
for (const c of classified) classCounts[c.finalClass] += 1;

console.log("\nFinal classification counts:");
console.log(classCounts);
console.log(`Canonical-supersession redirects applied: ${supersessionRedirects}`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const lines: string[] = [];
lines.push("# Ingestion staging dry-run — 2026-08-21 night-research programme-catalogue batches");
lines.push("");
lines.push(`Generated ${new Date().toISOString()} by scripts/stage-programs-ingestion-dryrun.ts. **Dry run — no database writes occurred.** Live-DB snapshot (universities/entity_aliases/entity_external_ids/university_programs) fetched read-only via Supabase MCP immediately before this run.`);
lines.push("");
lines.push(`Input: ${batchFiles.length} batch files, ${classified.length} total research records (\`${batchFiles[0]}\` through \`${batchFiles[batchFiles.length - 1]}\`).`);
lines.push("");
lines.push("## Class counts");
lines.push("");
lines.push("| Class | Count | % |");
lines.push("|---|---|---|");
for (const cls of ["READY_TO_INSERT", "DUPLICATE_OF_EXISTING", "UNRESOLVED_UNIVERSITY", "NEEDS_REVIEW"] as FinalClass[]) {
  const n = classCounts[cls];
  const pct = ((n / classified.length) * 100).toFixed(1);
  lines.push(`| ${cls} | ${n} | ${pct}% |`);
}
lines.push(`| **Total** | **${classified.length}** | 100% |`);
lines.push("");
lines.push(`Canonical-supersession redirects applied (resolved university was a known-duplicate "loser" row, redirected to the live canonical winner via \`lib/universities/canonical.ts\`): **${supersessionRedirects}**.`);
lines.push("");
lines.push("## Reason breakdown (every non-ready record has a reason; every reason bucket is counted, not just totaled)");
lines.push("");
lines.push("| Reason | Count |");
lines.push("|---|---|");
const sortedReasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]);
for (const [reason, count] of sortedReasons) {
  lines.push(`| ${reason.replace(/\|/g, "\\|")} | ${count} |`);
}
lines.push("");
lines.push("## Per-university breakdown of READY_TO_INSERT");
lines.push("");
const readyByUni = new Map<string, number>();
for (const c of classified) {
  if (c.finalClass !== "READY_TO_INSERT") continue;
  readyByUni.set(c.record.university_name, (readyByUni.get(c.record.university_name) ?? 0) + 1);
}
lines.push("| University | READY_TO_INSERT count |");
lines.push("|---|---|");
for (const [name, count] of [...readyByUni.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${name} | ${count} |`);
}
lines.push("");
lines.push("## NEEDS_REVIEW sample (first 30, for spot inspection)");
lines.push("");
const needsReviewSample = classified.filter((c) => c.finalClass === "NEEDS_REVIEW").slice(0, 30);
for (const c of needsReviewSample) {
  lines.push(`- **${c.record.university_name}** — "${c.record.program_name}" (\`${c.record.research_program_id}\`): ${c.finalReason}`);
}
lines.push("");
lines.push("## UNRESOLVED_UNIVERSITY — full list of distinct university names (candidates for a spine-side alias/name fix)");
lines.push("");
const unresolvedNames = new Map<string, number>();
for (const c of classified) {
  if (c.finalClass !== "UNRESOLVED_UNIVERSITY") continue;
  unresolvedNames.set(c.record.university_name, (unresolvedNames.get(c.record.university_name) ?? 0) + 1);
}
if (unresolvedNames.size === 0) {
  lines.push("None — every record's university_name resolved to a live universities row.");
} else {
  lines.push("| University name (as researched) | Country | Record count |");
  lines.push("|---|---|---|");
  for (const [name, count] of [...unresolvedNames.entries()].sort((a, b) => b[1] - a[1])) {
    const rec = classified.find((c) => c.record.university_name === name);
    lines.push(`| ${name} | ${rec?.record.university_country ?? "?"} | ${count} |`);
  }
}
lines.push("");
lines.push("## Execution");
lines.push("");
lines.push(`Generated SQL for the READY_TO_INSERT set only: \`${SQL_PATH}\` (${classCounts.READY_TO_INSERT} INSERT statements). **Not executed.** Execution stays gated on the founder's return, per the ORYN multi-agent coordination assignment.`);
lines.push("");
lines.push("Equivalent apply path using this repo's own existing tooling (also not run): for each batch file, `npm run ingest:university-programs -- data/research/university-programs/<file>.jsonl --apply` — this performs the identical decideIngestion() classification live against Supabase and writes both `university_programs` (accepted rows) and a full audit trail to `program_research_queue` (every outcome, not just accepted). The SQL file above is offered as an additional, directly-inspectable alternative for review.");
lines.push("");
writeFileSync(REPORT_PATH, lines.join("\n"));
console.log(`\nReport written to ${REPORT_PATH}`);

// ---------------------------------------------------------------------------
// SQL (generated, not executed)
// ---------------------------------------------------------------------------
function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}
function sqlStringArray(values: string[]): string {
  if (values.length === 0) return "'{}'";
  return `ARRAY[${values.map((v) => sqlString(v)).join(", ")}]`;
}
function sqlBool(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return value ? "TRUE" : "FALSE";
}

const sqlLines: string[] = [];
sqlLines.push("-- Generated by scripts/stage-programs-ingestion-dryrun.ts");
sqlLines.push(`-- ${new Date().toISOString()} — READY_TO_INSERT set only (${classCounts.READY_TO_INSERT} rows).`);
sqlLines.push("-- NOT EXECUTED. Review before running. Equivalent to `npm run ingest:university-programs -- <batch>.jsonl --apply`,");
sqlLines.push("-- which is the recommended apply path (it also writes the program_research_queue audit trail this raw SQL does not).");
sqlLines.push("BEGIN;");
sqlLines.push("");
for (const c of classified) {
  if (c.finalClass !== "READY_TO_INSERT") continue;
  const row = c.decision.programRow as AcceptedProgramRow;
  sqlLines.push(
    `INSERT INTO university_programs (university_id, name, normalized_name, degree_level, field, subject_taxonomy, secondary_subject_tags, language_of_instruction, campus, delivery_mode, international_eligible, degree_type, faculty_or_school, official_program_url, admissions_url, source_url, source_type, verification_state, notes, data_confidence) VALUES (` +
      [
        sqlString(row.university_id),
        sqlString(row.name),
        sqlString(row.normalized_name),
        sqlString(row.degree_level),
        sqlString(row.field),
        sqlString(row.subject_taxonomy),
        sqlStringArray(row.secondary_subject_tags),
        sqlString(row.language_of_instruction),
        sqlString(row.campus),
        sqlString(row.delivery_mode),
        sqlBool(row.international_eligible),
        sqlString(row.degree_type),
        sqlString(row.faculty_or_school),
        sqlString(row.official_program_url),
        sqlString(row.admissions_url),
        sqlString(row.source_url),
        sqlString(row.source_type),
        sqlString(row.verification_state),
        sqlString(row.notes),
        sqlString(row.data_confidence),
      ].join(", ") +
      `); -- ${c.record.research_program_id}`
  );
}
sqlLines.push("");
sqlLines.push("COMMIT;");
sqlLines.push("");
writeFileSync(SQL_PATH, sqlLines.join("\n"));
console.log(`SQL written to ${SQL_PATH} (${classCounts.READY_TO_INSERT} INSERT statements, not executed)`);
