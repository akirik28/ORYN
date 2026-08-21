#!/usr/bin/env node
/**
 * Representability dry run for the university-requirements research corpus.
 *
 * THIS SCRIPT NEVER WRITES. There is no `--apply` branch, no write client, and no import of
 * anything that could construct one — the only Supabase surface it touches is
 * `fetchAllRowsVerified`, which issues GETs. That is deliberate and not a temporary state:
 * the writing pipeline already exists (`scripts/ingest-requirements-deadlines.ts --apply`)
 * and this tool exists specifically to decide whether running it is safe. A dry-run tool that
 * can be talked into writing is not a dry-run tool.
 *
 * It differs from `scripts/ingest-requirements-deadlines.ts` in two ways that matter:
 *
 *  1. FILE COVERAGE. That script globs `requirements_batch*` / `deadlines_batch*`, which
 *     matches 12 of the 53 files in the corpus directory. The 41 files named
 *     `uk_tr_requirements_*`, `uk_tr_deadlines_*`, `de_nl_requirements_*` and
 *     `de_nl_deadlines_*` have never been read by any ingestion path. This script reads all
 *     53 by classifying on content ("deadline" in the filename), not on a batch prefix.
 *
 *  2. THE THIRD COUNT. That script reports accepted/blocked. Blocked is a safe outcome. The
 *     count that decides tonight's question is neither: it is how many records carry a shape
 *     the live schema cannot hold, which cuts across accepted and blocked alike. An
 *     `accepted` record that is also unrepresentable is the dangerous cell — it lands, looks
 *     complete, and has quietly lost the qualifier that made it true. See
 *     `lib/requirements/shape-audit.ts` for why that is worse than a blocked record.
 *
 * Usage:
 *   npx tsx scripts/ingest-university-requirements-batch.ts
 *
 * Deliberately does NOT import anything under lib/ carrying `import "server-only"` (same
 * constraint as scripts/ingest-university-programs.ts).
 */
import { readFileSync, readdirSync } from "node:fs";
import { partitionCorpusRecords, type CorpusRecordInput } from "../lib/requirements/corpus-files";
import { decideRequirementIngestion, requirementDedupKey, requirementUniqueIndexKey, type ResearchRequirementRecord, type UniversityLookupRow } from "../lib/requirements/ingest";
import { decideDeadlineIngestion, deadlineDedupKey, deadlineFactKeyFromRow, type ResearchDeadlineRecord } from "../lib/deadlines/ingest";
import { classifyDeadlineShapes, classifyRequirementShapes, findUniqueSlotCollisions, withRetry, type DeadlineShape, type RequirementShape } from "../lib/requirements/shape-audit";
import { getSupersededUniversityIds } from "../lib/universities/canonical";
import { normalizeProgramName } from "../lib/programs/normalize";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

const CORPUS_DIR = "data/research/university-requirements";

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  const records: T[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as T);
    } catch (err) {
      throw new Error(`${path}:${i + 1}: malformed JSON — ${(err as Error).message}`);
    }
  }
  return records;
}

interface UniversityRow {
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
interface ExternalIdRow {
  entity_id: string;
  id_system: string;
  external_id: string;
}
interface ProgramRow {
  id: string;
  university_id: string;
  name: string;
  normalized_name: string | null;
}

/** Same candidate-pool construction as scripts/ingest-requirements-deadlines.ts, plus the
 * supersession filter. Duplicate universities are already resolved platform-wide
 * (migration 0043 + lib/universities/canonical.ts); excluding them here keeps this dry run's
 * resolution counts consistent with what the product's own read paths would see, rather than
 * inventing a second exclusion rule. */
async function loadUniversityCandidates(target: PostgrestTarget): Promise<UniversityLookupRow[]> {
  // Serialized, not Promise.all: concurrent count probes intermittently draw an HTTP 401 from
  // this project's endpoint. A dry run has no latency budget worth defending.
  const { rows: universities } = await withRetry("read universities", () => fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"));
  const { rows: aliases } = await withRetry("read entity_aliases", () => fetchAllRowsVerified<AliasRow>(target, "entity_aliases", "entity_id,alias", "order=id"));
  const { rows: externalIds } = await withRetry("read entity_external_ids", () => fetchAllRowsVerified<ExternalIdRow>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"));
  const superseded = new Set(getSupersededUniversityIds());
  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const existing = externalIdsByEntity.get(e.entity_id) ?? {};
    existing[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, existing);
  }
  return universities
    .filter((u) => !superseded.has(u.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
      externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
      websiteUrl: u.website_url,
    }));
}

/**
 * Programme resolution, deliberately strict. Live programmes now number ~9,400, so the
 * question "can these records attach to a real programme?" is worth re-asking — but the
 * answer has to be earned, not pattern-matched. An exact identifier is evidence; rank,
 * substring and name similarity are leads. Today an `ILIKE '%ITU%'` matched Georgia Tech for
 * İTÜ, and ROR's ranked search returned Uşak University first for "Anadolu".
 *
 * So: resolve the university first (alias-aware, exact), then require an EXACT normalized
 * programme-name match within that university's own programme set. No fuzzy fallback, no
 * "closest match", and an ambiguous multi-hit resolves to null rather than picking one.
 */
function resolveProgramId(universityId: string | null, programName: string | null, byUniversity: Map<string, Map<string, string[]>>): { programId: string | null; reason: string } {
  if (!universityId) return { programId: null, reason: "university unresolved" };
  if (!programName?.trim()) return { programId: null, reason: "no program_name on the record" };
  const programs = byUniversity.get(universityId);
  if (!programs) return { programId: null, reason: "university has no programmes loaded" };
  const hits = programs.get(normalizeProgramName(programName));
  if (!hits || hits.length === 0) return { programId: null, reason: "no exact normalized name match at this university" };
  if (hits.length > 1) return { programId: null, reason: `${hits.length} programmes share this normalized name — ambiguous, not guessed` };
  return { programId: hits[0], reason: "exact normalized name match within the resolved university" };
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
}

function bump<K extends string>(counter: Map<K, number>, key: K, by = 1): void {
  counter.set(key, (counter.get(key) ?? 0) + by);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".jsonl")).sort();
  const reqFiles = files.filter((f) => !f.toLowerCase().includes("deadline"));
  const dlFiles = files.filter((f) => f.toLowerCase().includes("deadline"));

  // Filename picks the files; the record's own identifier picks the pipeline. Reading these
  // counts off the filename alone was reporting 107 deadline records as requirement records
  // that happened to be unrepresentable — a real number attached to the wrong question.
  const parsedRecords: CorpusRecordInput[] = [];
  for (const f of reqFiles) parseJsonl<unknown>(`${CORPUS_DIR}/${f}`).forEach((record, i) => parsedRecords.push({ file: f, index: i + 1, nameSaysShape: "requirement", record }));
  for (const f of dlFiles) parseJsonl<unknown>(`${CORPUS_DIR}/${f}`).forEach((record, i) => parsedRecords.push({ file: f, index: i + 1, nameSaysShape: "deadline", record }));
  const partition = partitionCorpusRecords(parsedRecords);

  const universities = await loadUniversityCandidates(target);
  const { rows: programs } = await withRetry("read university_programs", () => fetchAllRowsVerified<ProgramRow>(target, "university_programs", "id,university_id,name,normalized_name", "order=id"));
  const { rows: existingReqs } = await withRetry("read university_requirements", () =>
    fetchAllRowsVerified<{ university_id: string; requirement_type: string; title: string | null; scope: string | null }>(target, "university_requirements", "university_id,requirement_type,title,scope", "order=id")
  );
  const { rows: existingDls } = await withRetry("read university_deadlines", () =>
    fetchAllRowsVerified<{ university_id: string; deadline_type: string; deadline_date: string | null; recurrence: string; recurrence_month: number | null; recurrence_day: number | null }>(
      target,
      "university_deadlines",
      "university_id,deadline_type,deadline_date,recurrence,recurrence_month,recurrence_day",
      "order=id"
    )
  );

  const programsByUniversity = new Map<string, Map<string, string[]>>();
  for (const p of programs) {
    const key = p.normalized_name ?? normalizeProgramName(p.name);
    const forUni = programsByUniversity.get(p.university_id) ?? new Map<string, string[]>();
    forUni.set(key, [...(forUni.get(key) ?? []), p.id]);
    programsByUniversity.set(p.university_id, forUni);
  }

  console.log("=".repeat(96));
  console.log("REQUIREMENTS / DEADLINES CORPUS — REPRESENTABILITY DRY RUN (read-only; this script cannot write)");
  console.log("=".repeat(96));
  console.log(`Corpus dir      : ${CORPUS_DIR}`);
  console.log(`Files           : ${files.length} (${reqFiles.length} requirement, ${dlFiles.length} deadline)`);
  console.log(`Live candidates : ${universities.length} active universities (superseded excluded), ${programs.length} programmes`);
  console.log(`Live target rows: ${existingReqs.length} university_requirements, ${existingDls.length} university_deadlines`);
  if (partition.misroutedByFilename.length > 0) {
    const byFile = new Map<string, number>();
    for (const m of partition.misroutedByFilename) byFile.set(m.file, (byFile.get(m.file) ?? 0) + 1);
    console.log(`Misfiled       : ${partition.misroutedByFilename.length} record(s) across ${byFile.size} file(s) carry a shape their filename contradicts — routed by shape.`);
    for (const [file, count] of [...byFile.entries()].sort()) console.log(`                 ${file}: ${count}`);
  }
  console.log("");

  // ---- Requirements -------------------------------------------------------------------
  const reqRecords = partition.requirementRecords.map((r) => ({ file: r.file, record: r.record as ResearchRequirementRecord }));

  const supersededIds = new Set(reqRecords.map((r) => r.record.supersedes).filter((s): s is string => Boolean(s)));
  const existingTitlesByKey = new Map<string, string[]>();
  for (const r of existingReqs) {
    if (!r.title) continue;
    const key = requirementDedupKey(r.university_id, r.requirement_type, r.scope);
    existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), r.title]);
  }

  // Sequential key-claiming, mirroring the live runner: a decision must see what earlier
  // decisions in the same batch already claimed, or the dry run and the real run disagree.
  const reqOutcomes = new Map<string, number>();
  const reqShapes = new Map<RequirementShape, number>();
  const perFileReq = new Map<string, { total: number; accepted: number; blocked: number; unrepresentable: number; acceptedAndUnrepresentable: number }>();
  const acceptedSlotKeys: string[] = [];
  // Pre-seeded with the slots LIVE rows already occupy, keyed exactly the way the APPLIED
  // index keys them (migration 0056 folded md5(title) in). Before 0056 this was keyed on
  // university+type+scope alone, which is what destroyed 341 accepted rows — and modelling it
  // that way now would report a loss the migration has already removed.
  const claimedSlots = new Set<string>(existingReqs.map((r) => requirementUniqueIndexKey(r.university_id, r.requirement_type, r.scope, r.title)));
  let reqUnrepresentable = 0;
  let reqAcceptedUnrepresentable = 0;
  let reqUniResolved = 0;
  let reqProgResolved = 0;
  // The only count that is not a subtraction: a record that is accepted, carries no
  // unrepresentable shape, AND is the first claimant of its unique-index slot, so it both
  // lands and still means what the source page means. Subtracting the three loss sets from
  // `accepted` would be wrong — they overlap heavily (a qualifier-stripped row is often also
  // the second claimant of its slot), and subtracting overlapping sets understates the result.
  let reqCleanLandings = 0;
  /** Accepted records that are not the first claimant of their slot — destroyed on insert by
   * university_requirements_university_type_scope_idx. Counted directly rather than derived
   * from batch-internal collisions alone, so slots already held by live rows are included. */
  let reqSlotBlocked = 0;
  const progReasons = new Map<string, number>();
  /** Migration 0056's columns as the builder would actually write them. The last run's
   * outcome count said `accepted` for 1,254 rows that carried none of these, which is why
   * `accepted` alone is not evidence of anything: these are the counts that say whether the
   * qualifier travelled with the fact. */
  const gateYield = new Map<string, number>();
  const recencyYield = new Map<string, number>();
  const provenanceYield = new Map<string, number>();
  let acceptedWithScale = 0;
  let acceptedWithResearchId = 0;
  let acceptedRows = 0;

  for (const { file, record } of reqRecords) {
    const decision = decideRequirementIngestion(record, universities, supersededIds, existingTitlesByKey);
    if (decision.row) {
      acceptedRows += 1;
      if (decision.row.test_scale) acceptedWithScale += 1;
      if (decision.row.research_record_id) acceptedWithResearchId += 1;
      bump(gateYield, decision.row.evaluation_gate ?? "(none — automatically evaluable)");
      if (decision.row.recency_rule) bump(recencyYield, decision.row.recency_rule.direction);
      for (const p of decision.row.excluded_provenances ?? []) bump(provenanceYield, p);
    }
    let firstClaimOfSlot = false;
    if (decision.outcome === "accepted" && decision.row) {
      const bucket = requirementDedupKey(decision.row.university_id, decision.row.requirement_type, decision.row.scope);
      existingTitlesByKey.set(bucket, [...(existingTitlesByKey.get(bucket) ?? []), decision.row.title]);
      const indexKey = requirementUniqueIndexKey(decision.row.university_id, decision.row.requirement_type, decision.row.scope, decision.row.title);
      acceptedSlotKeys.push(indexKey);
      firstClaimOfSlot = !claimedSlots.has(indexKey);
      claimedSlots.add(indexKey);
    }
    if (decision.universityId) reqUniResolved += 1;

    const { programId, reason } = resolveProgramId(decision.universityId, record.program_name, programsByUniversity);
    if (programId) reqProgResolved += 1;
    bump(progReasons, programId ? "resolved" : reason);

    const shapes = classifyRequirementShapes(record);
    for (const s of shapes) bump(reqShapes, s.shape);
    const isUnrep = shapes.length > 0;
    if (isUnrep) reqUnrepresentable += 1;
    if (isUnrep && decision.outcome === "accepted") reqAcceptedUnrepresentable += 1;
    if (decision.outcome === "accepted" && !firstClaimOfSlot) reqSlotBlocked += 1;
    if (decision.outcome === "accepted" && firstClaimOfSlot && !isUnrep) reqCleanLandings += 1;

    bump(reqOutcomes, decision.outcome);
    const pf = perFileReq.get(file) ?? { total: 0, accepted: 0, blocked: 0, unrepresentable: 0, acceptedAndUnrepresentable: 0 };
    pf.total += 1;
    if (decision.outcome === "accepted") pf.accepted += 1;
    else pf.blocked += 1;
    if (isUnrep) pf.unrepresentable += 1;
    if (isUnrep && decision.outcome === "accepted") pf.acceptedAndUnrepresentable += 1;
    perFileReq.set(file, pf);
  }

  // ---- Deadlines ----------------------------------------------------------------------
  const dlRecords = partition.deadlineRecords.map((r) => ({ file: r.file, record: r.record as ResearchDeadlineRecord }));

  const existingDeadlineKeys = new Set(
    existingDls
      .map((d) => {
        const factKey = deadlineFactKeyFromRow(d);
        return factKey ? deadlineDedupKey(d.university_id, d.deadline_type, factKey) : null;
      })
      .filter((k): k is string => k !== null)
  );
  const dlOutcomes = new Map<string, number>();
  const dlShapes = new Map<DeadlineShape, number>();
  const perFileDl = new Map<string, { total: number; accepted: number; blocked: number; unrepresentable: number; acceptedAndUnrepresentable: number }>();
  let dlUnrepresentable = 0;
  let dlAcceptedUnrepresentable = 0;
  let dlUniResolved = 0;
  let dlProgResolved = 0;
  /** university_deadlines has no unique index at all, so there is no slot-collision term here
   * — application-level dedup is the only protection, and a clean landing is simply an
   * accepted record carrying no unrepresentable shape. */
  let dlCleanLandings = 0;

  for (const { file, record } of dlRecords) {
    const decision = decideDeadlineIngestion(record, universities, existingDeadlineKeys);
    if (decision.outcome === "accepted" && decision.row) {
      const factKey = deadlineFactKeyFromRow(decision.row);
      if (factKey) existingDeadlineKeys.add(deadlineDedupKey(decision.row.university_id, decision.row.deadline_type, factKey));
    }
    if (decision.universityId) dlUniResolved += 1;
    const { programId } = resolveProgramId(decision.universityId, record.program_name, programsByUniversity);
    if (programId) dlProgResolved += 1;

    const shapes = classifyDeadlineShapes(record);
    for (const s of shapes) bump(dlShapes, s.shape);
    const isUnrep = shapes.length > 0;
    if (isUnrep) dlUnrepresentable += 1;
    if (isUnrep && decision.outcome === "accepted") dlAcceptedUnrepresentable += 1;
    if (decision.outcome === "accepted" && !isUnrep) dlCleanLandings += 1;

    bump(dlOutcomes, decision.outcome);
    const pf = perFileDl.get(file) ?? { total: 0, accepted: 0, blocked: 0, unrepresentable: 0, acceptedAndUnrepresentable: 0 };
    pf.total += 1;
    if (decision.outcome === "accepted") pf.accepted += 1;
    else pf.blocked += 1;
    if (isUnrep) pf.unrepresentable += 1;
    if (isUnrep && decision.outcome === "accepted") pf.acceptedAndUnrepresentable += 1;
    perFileDl.set(file, pf);
  }

  // ---- Report -------------------------------------------------------------------------
  const reqTotal = reqRecords.length;
  const dlTotal = dlRecords.length;
  const grandTotal = reqTotal + dlTotal;

  console.log("-".repeat(96));
  console.log("PER-FILE");
  console.log("-".repeat(96));
  console.log(`${"file".padEnd(52)}${"tot".padStart(5)}${"acc".padStart(6)}${"blk".padStart(6)}${"UNREP".padStart(8)}${"acc+UNREP".padStart(11)}`);
  for (const f of files) {
    // A file can now appear in BOTH maps — 19 requirements-named files hold deadline records —
    // so each half is printed on its own line rather than one silently masking the other.
    for (const [label, pf] of [
      [f, perFileReq.get(f)],
      [`${f}  [deadline records]`, perFileDl.get(f)],
    ] as const) {
      if (!pf) continue;
      console.log(`${label.padEnd(52)}${String(pf.total).padStart(5)}${String(pf.accepted).padStart(6)}${String(pf.blocked).padStart(6)}${String(pf.unrepresentable).padStart(8)}${String(pf.acceptedAndUnrepresentable).padStart(11)}`);
    }
  }
  console.log("");

  console.log("-".repeat(96));
  console.log("REQUIREMENTS");
  console.log("-".repeat(96));
  console.log(`Records                          : ${reqTotal}`);
  console.log(`University resolved              : ${reqUniResolved} (${pct(reqUniResolved, reqTotal)})`);
  console.log(`Programme resolved (exact only)   : ${reqProgResolved} (${pct(reqProgResolved, reqTotal)})`);
  console.log("Outcome breakdown:");
  for (const [k, v] of [...reqOutcomes.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(24)} ${String(v).padStart(5)}  ${pct(v, reqTotal)}`);
  console.log("Programme non-resolution reasons:");
  for (const [k, v] of [...progReasons.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(56)} ${String(v).padStart(5)}`);
  console.log("");

  console.log("-".repeat(96));
  console.log("DEADLINES");
  console.log("-".repeat(96));
  console.log(`Records                          : ${dlTotal}`);
  console.log(`University resolved              : ${dlUniResolved} (${pct(dlUniResolved, dlTotal)})`);
  console.log(`Programme resolved (exact only)   : ${dlProgResolved} (${pct(dlProgResolved, dlTotal)})`);
  console.log("Outcome breakdown:");
  for (const [k, v] of [...dlOutcomes.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(24)} ${String(v).padStart(5)}  ${pct(v, dlTotal)}`);
  console.log("");

  console.log("=".repeat(96));
  console.log("SHAPES THE CURRENT SCHEMA CANNOT HOLD  — the number that decides whether ingestion is safe");
  console.log("=".repeat(96));
  console.log("Requirement shapes (a record may carry more than one):");
  for (const [k, v] of [...reqShapes.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(28)} ${String(v).padStart(5)}`);
  console.log("Deadline shapes:");
  for (const [k, v] of [...dlShapes.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(28)} ${String(v).padStart(5)}`);
  console.log("");

  console.log("=".repeat(96));
  console.log("MIGRATION 0056 QUALIFIER YIELD  — what the accepted rows would actually CARRY");
  console.log("=".repeat(96));
  console.log(`Accepted rows built                                  : ${acceptedRows}`);
  console.log(`  with research_record_id (0056 §9 traceability)     : ${acceptedWithResearchId} (${pct(acceptedWithResearchId, acceptedRows)})`);
  console.log(`  with test_scale (0056 §1)                          : ${acceptedWithScale} (${pct(acceptedWithScale, acceptedRows)})`);
  console.log("evaluation_gate (0056 §4):");
  for (const [k, v] of [...gateYield.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(34)} ${String(v).padStart(5)}`);
  console.log("recency_rule.direction (0056 §2 — direction is the load-bearing part):");
  if (recencyYield.size === 0) console.log("   (none)");
  for (const [k, v] of [...recencyYield.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(34)} ${String(v).padStart(5)}`);
  console.log("excluded_provenances (0056 §3 — refusals only, never mentions):");
  if (provenanceYield.size === 0) console.log("   (none)");
  for (const [k, v] of [...provenanceYield.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(34)} ${String(v).padStart(5)}`);
  console.log("");

  const collisions = findUniqueSlotCollisions(acceptedSlotKeys);
  console.log(`Unique-slot collisions among ACCEPTED requirements: ${collisions.length} group(s) collide within this batch.`);
  console.log(`Accepted rows destroyed on insert (incl. slots already held by live rows): ${reqSlotBlocked}`);
  console.log("   (Modelled against the APPLIED index — university_requirements_university_type_scope_title_idx,");
  console.log("    UNIQUE on university+type+scope+md5(title). The 36 'rejected' rows in requirement_research_queue");
  console.log("    predate migration 0056 and were the OLD index, which permitted one row per university+type+scope.)");
  for (const c of collisions.slice(0, 10)) console.log(`   ${c.count} records claim slot ${c.key}  → ${c.lost} lost`);
  console.log("");

  const totalUnrep = reqUnrepresentable + dlUnrepresentable;
  const totalAcceptedUnrep = reqAcceptedUnrepresentable + dlAcceptedUnrepresentable;
  const totalAccepted = (reqOutcomes.get("accepted") ?? 0) + (dlOutcomes.get("accepted") ?? 0);

  console.log("=".repeat(96));
  console.log("VERDICT INPUTS");
  console.log("=".repeat(96));
  const cleanLandings = reqCleanLandings + dlCleanLandings;
  console.log(`Corpus records                                       : ${grandTotal}`);
  console.log(`Would be ACCEPTED by the current decision path        : ${totalAccepted} (${pct(totalAccepted, grandTotal)})`);
  console.log(`Carry a shape the schema CANNOT HOLD                  : ${totalUnrep} (${pct(totalUnrep, grandTotal)})`);
  console.log(`ACCEPTED *and* unrepresentable <-- the dangerous cell : ${totalAcceptedUnrep} (${pct(totalAcceptedUnrep, grandTotal)})`);
  console.log(`Accepted requirements destroyed by the unique index   : ${reqSlotBlocked}`);
  console.log(`CLEAN LANDINGS (accepted, representable, slot free)   : ${cleanLandings} (${pct(cleanLandings, grandTotal)})`);
  console.log(`   of which requirements                             : ${reqCleanLandings} of ${reqTotal}`);
  console.log(`   of which deadlines                                : ${dlCleanLandings} of ${dlTotal}`);
  console.log("");
  console.log("A 'clean landing' is counted per record, not derived by subtracting the loss sets — those");
  console.log("overlap (a qualifier-stripped row is often also the second claimant of its slot), and");
  console.log("subtracting overlapping sets would understate the damage.");
  console.log("");
  console.log("Nothing was written. This script has no --apply path.");
}

main();
