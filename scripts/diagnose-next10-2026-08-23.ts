#!/usr/bin/env node
/**
 * Read-only diagnostic for the next-10 requirements/deadlines dry-run. Reuses the exact same
 * decision functions scripts/ingest-requirements-deadlines.ts uses, scoped to only the 2
 * next10_*_2026-08-23.jsonl files, printing per-record outcome+detail instead of just
 * aggregate counts. No writes. Temporary — safe to delete after this package's report.
 */
import { readFileSync } from "node:fs";
import {
  decideRequirementIngestion,
  requirementDedupKey,
  type ResearchRequirementRecord,
  type UniversityLookupRow as ReqUniversityLookupRow,
} from "../lib/requirements/ingest";
import {
  decideDeadlineIngestion,
  deadlineDedupKey,
  deadlineFactKeyFromRow,
  type ResearchDeadlineRecord,
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
  console.log(`Loaded ${reqRecords.length} requirement record(s), ${dlRecords.length} deadline record(s) — next10 files only.\n`);

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

  console.log("=== REQUIREMENTS ===");
  for (const record of reqRecords) {
    const decision = decideRequirementIngestion(record, universities, new Set(), existingTitlesByKey);
    if (decision.outcome === "accepted" && decision.row) {
      const key = requirementDedupKey(decision.row.university_id, decision.row.requirement_type, decision.row.scope);
      existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), decision.row.title]);
    }
    console.log(`${record.research_requirement_id} [${record.university_name}] -> ${decision.outcome}${decision.detail ? " :: " + decision.detail : ""}`);
    if (decision.outcome === "accepted" && decision.row) {
      console.log(`    university_id=${decision.row.university_id} type=${decision.row.requirement_type} title="${decision.row.title.slice(0,80)}..." is_required=${decision.row.is_required} confidence=${decision.row.data_confidence}`);
    }
  }

  console.log("\n=== DEADLINES ===");
  for (const record of dlRecords) {
    const decision = decideDeadlineIngestion(record, universities, existingDeadlineKeys);
    if (decision.outcome === "accepted" && decision.row) {
      const factKey = deadlineFactKeyFromRow(decision.row);
      if (factKey) existingDeadlineKeys.add(deadlineDedupKey(decision.row.university_id, decision.row.deadline_type, factKey));
    }
    console.log(`${record.research_deadline_id} [${record.university_name}] -> ${decision.outcome}${decision.detail ? " :: " + decision.detail : ""}`);
    if (decision.outcome === "accepted" && decision.row) {
      console.log(`    university_id=${decision.row.university_id} type=${decision.row.deadline_type} date=${decision.row.deadline_date} recurrence=${decision.row.recurrence}(${decision.row.recurrence_month}/${decision.row.recurrence_day}) cycle=${decision.row.cycle_year} verification=${decision.row.verification_state} binding=${decision.row.binding_policy}`);
    }
  }

}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
