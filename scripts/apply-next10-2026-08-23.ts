#!/usr/bin/env node
/**
 * Scoped apply for the next-10 package's clean subset (14 of 23 records: 9 requirements + 5
 * deadlines). Reuses the exact same decision+apply functions
 * scripts/ingest-requirements-deadlines.ts uses, scoped to only the 2 next10_*_2026-08-23.jsonl
 * files, so the blast radius is exactly these records.
 *
 * Unlike apply-top5-2026-08-23.ts, this script does NOT refuse when some records are not
 * `accepted` — 9 of the 23 are expected and correct non-accepts (5 NEEDS_REVIEW/low-confidence
 * records across Leicester/City St George's/Istanbul/UVA per CEO's explicit hold, plus 4
 * high-confidence deadline records — UIUC x2, Rochester, Emory — that fail the pipeline's
 * single-date extraction because their source text bundles multiple dated sub-facts, e.g.
 * Rochester's "ED I Nov 1, ED II Jan 5, RD Jan 5" — a separate, not-yet-decided splitting
 * question, reported back rather than resolved here). Only `accepted` decisions are applied;
 * every other outcome is logged and skipped, never silently dropped.
 *
 * Usage: npx tsx scripts/apply-next10-2026-08-23.ts
 */
import { readFileSync } from "node:fs";
import {
  decideRequirementIngestion,
  applyRequirementDecision,
  requirementDedupKey,
  type ResearchRequirementRecord,
  type UniversityLookupRow as ReqUniversityLookupRow,
  type RequirementWriteClient,
  type AcceptedRequirementRow,
} from "../lib/requirements/ingest";
import {
  decideDeadlineIngestion,
  applyDeadlineDecision,
  deadlineDedupKey,
  deadlineFactKeyFromRow,
  type ResearchDeadlineRecord,
  type DeadlineWriteClient,
  type AcceptedDeadlineRow,
} from "../lib/deadlines/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {}

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  const target: PostgrestTarget = { url, key: secretKey };

  const dir = "data/research/university-requirements";
  const reqRecords: ResearchRequirementRecord[] = parseJsonl<ResearchRequirementRecord>(`${dir}/next10_requirements_2026-08-23.jsonl`);
  const dlRecords: ResearchDeadlineRecord[] = parseJsonl<ResearchDeadlineRecord>(`${dir}/next10_deadlines_2026-08-23.jsonl`);
  console.log(`Loaded ${reqRecords.length} requirement record(s), ${dlRecords.length} deadline record(s) — next10 files only.`);

  const [{ rows: universitiesRaw }, { rows: aliases }, { rows: externalIds }, { rows: existingReqs }, { rows: existingDls }] = await Promise.all([
    fetchAllRowsVerified<{ id: string; name: string; country: string; canonical_entity_id: string | null; website_url: string | null }>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<{ entity_id: string; alias: string }>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<{ entity_id: string; id_system: string; external_id: string }>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
    fetchAllRowsVerified<{ university_id: string; requirement_type: string; title: string | null; scope: string | null }>(target, "university_requirements", "university_id,requirement_type,title,scope", "order=id"),
    fetchAllRowsVerified<{ university_id: string; deadline_type: string; deadline_date: string | null; recurrence: string; recurrence_month: number | null; recurrence_day: number | null }>(target, "university_deadlines", "university_id,deadline_type,deadline_date,recurrence,recurrence_month,recurrence_day", "order=id"),
  ]);

  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const existing = externalIdsByEntity.get(e.entity_id) ?? {};
    existing[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, existing);
  }
  const universities: ReqUniversityLookupRow[] = universitiesRaw.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
    externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
    websiteUrl: u.website_url,
  }));

  const existingTitlesByKey = new Map<string, string[]>();
  for (const r of existingReqs) {
    if (!r.title) continue;
    const key = requirementDedupKey(r.university_id, r.requirement_type, r.scope);
    existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), r.title]);
  }
  const existingDeadlineKeys = new Set(
    existingDls.map((d) => {
      const factKey = deadlineFactKeyFromRow(d);
      return factKey ? deadlineDedupKey(d.university_id, d.deadline_type, factKey) : null;
    }).filter((k): k is string => k !== null)
  );

  const reqDecisions: { record: ResearchRequirementRecord; decision: ReturnType<typeof decideRequirementIngestion> }[] = [];
  for (const record of reqRecords) {
    const decision = decideRequirementIngestion(record, universities, new Set(), existingTitlesByKey);
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
      const factKey = deadlineFactKeyFromRow(decision.row);
      if (factKey) existingDeadlineKeys.add(deadlineDedupKey(decision.row.university_id, decision.row.deadline_type, factKey));
    }
    dlDecisions.push({ record, decision });
  }

  const reqCounts: Record<string, number> = {};
  for (const { decision } of reqDecisions) reqCounts[decision.outcome] = (reqCounts[decision.outcome] ?? 0) + 1;
  const dlCounts: Record<string, number> = {};
  for (const { decision } of dlDecisions) dlCounts[decision.outcome] = (dlCounts[decision.outcome] ?? 0) + 1;
  console.log("Requirements outcome breakdown:", reqCounts);
  console.log("Deadlines outcome breakdown:", dlCounts);

  const skippedReq = reqDecisions.filter((d) => d.decision.outcome !== "accepted");
  const skippedDl = dlDecisions.filter((d) => d.decision.outcome !== "accepted");
  if (skippedReq.length + skippedDl.length > 0) {
    console.log(`\nSkipping ${skippedReq.length + skippedDl.length} non-accepted record(s) (expected — NEEDS_REVIEW holds + compound-date records pending a splitting decision):`);
    for (const d of skippedReq) console.log(`  [req] ${d.record.research_requirement_id} (${d.record.university_name}): ${d.decision.outcome}${d.decision.detail ? " — " + d.decision.detail.slice(0, 100) : ""}`);
    for (const d of skippedDl) console.log(`  [dl]  ${d.record.research_deadline_id} (${d.record.university_name}): ${d.decision.outcome}${d.decision.detail ? " — " + d.decision.detail.slice(0, 100) : ""}`);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const batchId = `next10-requirements-deadlines_2026-08-23`;

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
    if (decision.outcome !== "accepted") continue;
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
    if (decision.outcome !== "accepted") continue;
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

  console.log(`\nInserted ${reqAccepted} requirement row(s), ${dlAccepted} deadline row(s). (${skippedReq.length} requirement + ${skippedDl.length} deadline record(s) intentionally skipped.)`);
  console.log(`Full audit trail in requirement_research_queue/deadline_research_queue (batch_id='${batchId}').`);
  if (reqOrphaned + dlOrphaned > 0) {
    console.error(`\n${reqOrphaned + dlOrphaned} row(s) are ORPHANED — see above. Need manual reconciliation, not a batch re-run.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
