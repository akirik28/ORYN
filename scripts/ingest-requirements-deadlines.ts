#!/usr/bin/env node
/**
 * University-requirements/deadlines research handoff ingestion (spec Phase 69 / Phase 23).
 * Reads EVERY file in data/research/university-requirements/, resolves each record's
 * university via lib/acquisition/identity.ts's shared, alias-aware matching, and writes every
 * outcome to requirement_research_queue/deadline_research_queue — only `accepted` rows also
 * land in university_requirements/university_deadlines.
 *
 * File selection is lib/requirements/corpus-files.ts's job and is fail-loud: a file that
 * cannot be classified as requirements or deadlines stops the run by name. This replaced a
 * `startsWith("requirements_batch")` / `startsWith("deadlines_batch")` filter that matched 12
 * of 53 files and skipped the other 41 — 1,165 records — without a word of output.
 *
 * `structured_rule` is always left null on every inserted requirement — per migration 0020's
 * own documented intent, it is populated later by an admin reviewing
 * lib/ai/interpret-requirement.ts's suggestion, never by unreviewed ingestion. This also means
 * lib/requirements/evaluate.ts's own NO_RULE_RESULT ("needs_manual_review... check the source
 * link directly") applies to every requirement this script inserts, regardless of category.
 *
 * Idempotent and restartable: re-running the same batch produces `duplicate` outcomes for
 * anything already accepted. Deadlines have no DB-level unique index at all — application-level
 * dedup is the only protection. Requirements DO have one
 * (university_requirements_university_type_scope_idx, migration 0042), but it is scoped to
 * (university_id, requirement_type, COALESCE(scope,'')) — coarser than "this exact fact,"
 * so two genuinely different same-type-same-scope requirements can still collide there. This
 * script's own dedup key (lib/requirements/ingest.ts's requirementDedupKey) matches that
 * constraint's shape exactly so the two never disagree about what counts as "the same slot,"
 * but a real, too-coarse-for-the-data collision is still possible — see
 * docs/handoffs/requirements-deadlines-apply-path-report.md. Surfaces honestly as `rejected`
 * with the real DB error, same as any other insert failure; not something this script works
 * around.
 *
 * Usage:
 *   npm run ingest:requirements-deadlines
 *   npm run ingest:requirements-deadlines -- --apply
 *
 * Deliberately does NOT import anything under lib/ with `import "server-only"` (same
 * constraint as scripts/ingest-university-programs.ts).
 */
import { readFileSync } from "node:fs";
import { classifyCorpusFiles } from "../lib/requirements/corpus-files";
import {
  applyRequirementDecision,
  decideRequirementIngestion,
  requirementDedupKey,
  type AcceptedRequirementRow,
  type ResearchRequirementRecord,
  type RequirementWriteClient,
  type UniversityLookupRow as ReqUniversityLookupRow,
} from "../lib/requirements/ingest";
import {
  applyDeadlineDecision,
  decideDeadlineIngestion,
  deadlineDedupKey,
  type AcceptedDeadlineRow,
  type DeadlineWriteClient,
  type ResearchDeadlineRecord,
} from "../lib/deadlines/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  const records: T[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
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

async function loadUniversityCandidates(target: PostgrestTarget): Promise<ReqUniversityLookupRow[]> {
  const [{ rows: universities }, { rows: aliases }, { rows: externalIds }] = await Promise.all([
    fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<AliasRow>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<ExternalIdRow>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
  ]);
  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const existing = externalIdsByEntity.get(e.entity_id) ?? {};
    existing[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, existing);
  }
  return universities.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
    externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
    websiteUrl: u.website_url,
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const dir = "data/research/university-requirements";
  const { requirementFiles, deadlineFiles } = classifyCorpusFiles(dir);

  const reqRecords: ResearchRequirementRecord[] = [];
  const dlRecords: ResearchDeadlineRecord[] = [];
  for (const f of requirementFiles) {
    const records = parseJsonl<ResearchRequirementRecord>(`${dir}/${f}`);
    console.log(`  ${f}: ${records.length} requirement record(s)`);
    reqRecords.push(...records);
  }
  for (const f of deadlineFiles) {
    const records = parseJsonl<ResearchDeadlineRecord>(`${dir}/${f}`);
    console.log(`  ${f}: ${records.length} deadline record(s)`);
    dlRecords.push(...records);
  }
  console.log(`Loaded ${reqRecords.length} requirement record(s), ${dlRecords.length} deadline record(s) from ${requirementFiles.length + deadlineFiles.length} file(s).`);

  const [universities, { rows: existingReqs }, { rows: existingDls }] = await Promise.all([
    loadUniversityCandidates(target),
    fetchAllRowsVerified<{ university_id: string; requirement_type: string; title: string | null; scope: string | null }>(target, "university_requirements", "university_id,requirement_type,title,scope", "order=id"),
    fetchAllRowsVerified<{ university_id: string; deadline_type: string; deadline_date: string | null }>(target, "university_deadlines", "university_id,deadline_type,deadline_date", "order=id"),
  ]);
  console.log(`Candidate pool: ${universities.length} universities. Existing: ${existingReqs.length} requirements, ${existingDls.length} deadlines.`);

  const supersededIds = new Set(reqRecords.map((r) => r.supersedes).filter((s): s is string => Boolean(s)));

  const existingTitlesByKey = new Map<string, string[]>();
  for (const r of existingReqs) {
    if (!r.title) continue;
    const key = requirementDedupKey(r.university_id, r.requirement_type, r.scope);
    existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), r.title]);
  }
  const existingDeadlineKeys = new Set(existingDls.filter((d) => d.deadline_date).map((d) => deadlineDedupKey(d.university_id, d.deadline_type, d.deadline_date!)));

  // Sequential, not .map(): neither target table has a DB-level unique index (fuzzy
  // title-similarity dedup can't be expressed as a btree constraint anyway), so unlike
  // scripts/ingest-university-programs.ts there is no database backstop to catch two
  // same-batch duplicates that a batch-snapshot decision pass wouldn't see coming — the
  // decision computation itself has to be the single source of truth for what will actually
  // land, in both dry-run reporting and --apply, or the two would silently disagree.
  const reqDecisions: { record: ResearchRequirementRecord; decision: ReturnType<typeof decideRequirementIngestion> }[] = [];
  for (const record of reqRecords) {
    const decision = decideRequirementIngestion(record, universities, supersededIds, existingTitlesByKey);
    if (decision.outcome === "accepted" && decision.row) {
      const key = requirementDedupKey(decision.row.university_id, decision.row.requirement_type, decision.row.scope);
      existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), decision.row.title]);
    }
    reqDecisions.push({ record, decision });
  }
  const dlDecisions: { record: ResearchDeadlineRecord; decision: ReturnType<typeof decideDeadlineIngestion> }[] = [];
  for (const record of dlRecords) {
    const decision = decideDeadlineIngestion(record, universities, existingDeadlineKeys);
    if (decision.outcome === "accepted" && decision.row) {
      existingDeadlineKeys.add(deadlineDedupKey(decision.row.university_id, decision.row.deadline_type, decision.row.deadline_date));
    }
    dlDecisions.push({ record, decision });
  }

  const reqCounts: Record<string, number> = {};
  for (const { decision } of reqDecisions) reqCounts[decision.outcome] = (reqCounts[decision.outcome] ?? 0) + 1;
  const dlCounts: Record<string, number> = {};
  for (const { decision } of dlDecisions) dlCounts[decision.outcome] = (dlCounts[decision.outcome] ?? 0) + 1;
  console.log("Requirements outcome breakdown:", reqCounts);
  console.log("Deadlines outcome breakdown:", dlCounts);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const batchId = `requirements-deadlines_${new Date().toISOString().slice(0, 10)}`;

  const reqWriteClient: RequirementWriteClient = {
    async insertRequirement(row: AcceptedRequirementRow) {
      const { data, error } = await admin.from("university_requirements").insert(row).select("id").single();
      return { id: data?.id ?? null, error };
    },
    async insertQueueRow(row) {
      const { error } = await admin.from("requirement_research_queue").insert(row);
      return { error };
    },
  };
  const dlWriteClient: DeadlineWriteClient = {
    async insertDeadline(row: AcceptedDeadlineRow) {
      const { data, error } = await admin.from("university_deadlines").insert(row).select("id").single();
      return { id: data?.id ?? null, error };
    },
    async insertQueueRow(row) {
      const { error } = await admin.from("deadline_research_queue").insert(row);
      return { error };
    },
  };

  let reqAccepted = 0;
  let reqOrphaned = 0;
  for (const { record, decision } of reqDecisions) {
    // No incremental key-claiming needed here (unlike ingest-university-programs.ts): the
    // decision loop above already resolved same-batch duplicates sequentially, and there's no
    // DB unique index that could independently reject a second insert either way.
    const result = await applyRequirementDecision(record, decision, batchId, reqWriteClient);
    if (result.accepted) reqAccepted += 1;
    if (result.insertError) console.error(`  failed to insert requirement for ${record.university_name} / ${record.requirement_category_db}: ${result.insertError}`);
    if (result.orphaned) {
      reqOrphaned += 1;
      console.error(`  ORPHANED REQUIREMENT ROW — (${record.university_name} / ${record.requirement_category_db}) inserted but its audit row failed after retries: ${result.queueInsertError}.`);
    } else if (result.queueInsertError) {
      console.error(`  requirement_research_queue insert failed after retries for ${record.research_requirement_id}: ${result.queueInsertError}`);
    }
  }

  let dlAccepted = 0;
  let dlOrphaned = 0;
  for (const { record, decision } of dlDecisions) {
    const result = await applyDeadlineDecision(record, decision, batchId, dlWriteClient);
    if (result.accepted) dlAccepted += 1;
    if (result.insertError) console.error(`  failed to insert deadline for ${record.university_name} / ${record.deadline_type}: ${result.insertError}`);
    if (result.orphaned) {
      dlOrphaned += 1;
      console.error(`  ORPHANED DEADLINE ROW — (${record.university_name} / ${record.deadline_type}) inserted but its audit row failed after retries: ${result.queueInsertError}.`);
    } else if (result.queueInsertError) {
      console.error(`  deadline_research_queue insert failed after retries for ${record.research_deadline_id}: ${result.queueInsertError}`);
    }
  }

  console.log(`\nInserted ${reqAccepted}/${reqRecords.length} requirement row(s), ${dlAccepted}/${dlRecords.length} deadline row(s).`);
  console.log(`Full audit trail in requirement_research_queue/deadline_research_queue (batch_id='${batchId}').`);
  if (reqOrphaned > 0 || dlOrphaned > 0) {
    console.error(`\n${reqOrphaned + dlOrphaned} row(s) are ORPHANED — see above. Need manual reconciliation, not a batch re-run.`);
  }
}

main().catch((err: unknown) => {
  // Loud, not a bare unhandled rejection: a corpus file that cannot be classified, or a
  // directory that cannot be read, must end the process with a non-zero status and a
  // readable message rather than a stack trace after a "success" summary.
  console.error(`\nIngestion stopped: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
