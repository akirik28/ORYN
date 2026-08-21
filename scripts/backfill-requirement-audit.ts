#!/usr/bin/env node
/**
 * One-time reconciliation for the 2026-08-21 requirement_research_queue schema-mismatch
 * incident (see docs/handoffs/requirements-deadlines-apply-path-report.md and the follow-up
 * handoff). All 131 requirement audit-row writes failed during the real --apply run because
 * the live table's columns (requirement_type_input/scope_input) didn't match what this
 * session's code sent at the time (category_input/requirement_category_db_input). 43 records
 * had already landed in university_requirements before their audit write failed; the other 88
 * never attempted an insert at all (decided something other than "accepted", or hit the
 * too-coarse university_requirements_university_type_scope_idx constraint).
 *
 * This script does NOT insert into university_requirements. It re-derives every one of the
 * 131 original decisions (same inputs, same sequential logic, so byte-identical to the real
 * run), matches the 79 "accepted" ones against what's actually live (by university_id +
 * requirement_type + title, restricted to rows created during the incident's timestamp window)
 * to tell "landed" apart from "hit the constraint," and writes the correct audit row for all
 * 131 — nothing more.
 */
import { readFileSync, readdirSync } from "node:fs";
import { decideRequirementIngestion, requirementDedupKey, type ResearchRequirementRecord, type UniversityLookupRow as ReqUniversityLookupRow } from "../lib/requirements/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {}

function parseJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  const target: PostgrestTarget = { url, key: secretKey };

  const dir = "data/research/university-requirements";
  const files = readdirSync(dir);
  const reqRecords: ResearchRequirementRecord[] = files.filter((f) => f.startsWith("requirements_batch")).flatMap((f) => parseJsonl<ResearchRequirementRecord>(`${dir}/${f}`));
  console.log(`Loaded ${reqRecords.length} requirement record(s).`);

  const universities = await loadUniversityCandidates(target);

  // The incident window: everything inserted from 2026-08-21T11:00Z onward is this run's own
  // output (the previously-live 41 all predate 2026-08-21 by the actual timestamp distribution
  // checked directly beforehand — 2026-08-16 and 2026-08-18 only).
  const { rows: allReqs } = await fetchAllRowsVerified<{ id: string; university_id: string; requirement_type: string; title: string | null; scope: string | null; created_at: string }>(
    target,
    "university_requirements",
    "id,university_id,requirement_type,title,scope,created_at",
    "order=id"
  );
  const originalReqs = allReqs.filter((r) => r.created_at < "2026-08-21");
  const incidentReqs = allReqs.filter((r) => r.created_at >= "2026-08-21");
  console.log(`Live university_requirements: ${allReqs.length} total — ${originalReqs.length} pre-existing, ${incidentReqs.length} from the incident run.`);

  // Re-derive the exact same 131 decisions the real run made, using ONLY the pre-existing 41
  // as "already live" — byte-identical inputs to the original run, so byte-identical decisions.
  const supersededIds = new Set(reqRecords.map((r) => r.supersedes).filter((s): s is string => Boolean(s)));
  const existingTitlesByKey = new Map<string, string[]>();
  for (const r of originalReqs) {
    if (!r.title) continue;
    const key = requirementDedupKey(r.university_id, r.requirement_type, r.scope);
    existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), r.title]);
  }
  const decisions: { record: ResearchRequirementRecord; decision: ReturnType<typeof decideRequirementIngestion> }[] = [];
  for (const record of reqRecords) {
    const decision = decideRequirementIngestion(record, universities, supersededIds, existingTitlesByKey);
    if (decision.outcome === "accepted" && decision.row) {
      const key = requirementDedupKey(decision.row.university_id, decision.row.requirement_type, decision.row.scope);
      existingTitlesByKey.set(key, [...(existingTitlesByKey.get(key) ?? []), decision.row.title]);
    }
    decisions.push({ record, decision });
  }
  const acceptedCount = decisions.filter((d) => d.decision.outcome === "accepted").length;
  console.log(`Re-derived decisions: ${acceptedCount} accepted (must match the original run's 79).`);
  if (acceptedCount !== 79) {
    console.error(`MISMATCH: expected 79 accepted, got ${acceptedCount}. Stopping — inputs have drifted from the original run, do not proceed blindly.`);
    process.exitCode = 1;
    return;
  }

  // Match each "accepted" decision against the incident rows to tell landed from
  // constraint-rejected. Track consumption so two decisions can't claim the same live row.
  const unclaimedIncidentReqs = [...incidentReqs];
  const results: { record: ResearchRequirementRecord; decision: (typeof decisions)[number]["decision"]; landedId: string | null }[] = [];
  for (const { record, decision } of decisions) {
    if (decision.outcome !== "accepted" || !decision.row) {
      results.push({ record, decision, landedId: null });
      continue;
    }
    const matchIdx = unclaimedIncidentReqs.findIndex(
      (r) => r.university_id === decision.row!.university_id && r.requirement_type === decision.row!.requirement_type && r.title === decision.row!.title
    );
    if (matchIdx === -1) {
      results.push({ record, decision, landedId: null }); // hit the constraint, never landed
    } else {
      const [matched] = unclaimedIncidentReqs.splice(matchIdx, 1);
      results.push({ record, decision, landedId: matched.id });
    }
  }
  const landedCount = results.filter((r) => r.landedId).length;
  const rejectedCount = results.filter((r) => r.decision.outcome === "accepted" && !r.landedId).length;
  console.log(`Matched: ${landedCount} landed (must match 43), ${rejectedCount} hit the constraint (must match 36). ${unclaimedIncidentReqs.length} incident row(s) left unclaimed (must be 0).`);
  if (landedCount !== 43 || rejectedCount !== 36 || unclaimedIncidentReqs.length !== 0) {
    console.error("MISMATCH against the known-good reconciliation (43/36/0). Stopping — do not write a backfill that doesn't match reality.");
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write the backfill.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const batchId = "requirements-deadlines_2026-08-21"; // same batch_id the incident run used

  // Idempotent re-run: skip anything this script (or a prior partial run of it) already wrote
  // for this batch_id, identified by research_requirement_id — no dedup exists on
  // requirement_research_queue itself, so a blind re-run would otherwise duplicate every row
  // that already succeeded.
  const { rows: alreadyWritten } = await fetchAllRowsVerified<{ research_requirement_id: string }>(target, "requirement_research_queue", "research_requirement_id", `batch_id=eq.${batchId}&order=id`);
  const alreadyWrittenIds = new Set(alreadyWritten.map((r) => r.research_requirement_id));
  console.log(`${alreadyWrittenIds.size} row(s) already backfilled for this batch_id — skipping those, writing the rest.`);

  let written = 0;
  let skipped = 0;
  for (const { record, decision, landedId } of results) {
    if (alreadyWrittenIds.has(record.research_requirement_id)) {
      skipped += 1;
      continue;
    }
    // 'superseded' was part of this migration's drafted outcome CHECK constraint but is not
    // part of what's actually live (same applied-vs-drafted divergence as the column names) —
    // confirmed directly against pg_constraint before mapping this, not assumed. Folded into
    // 'not_ingestible' (the broader "source record's own properties rule it out today" bucket
    // it always conceptually belonged to) so nothing is lost — outcome_detail still says
    // exactly what happened.
    const rawOutcome = landedId ? "accepted" : decision.outcome === "accepted" ? "rejected" : decision.outcome;
    const outcome = rawOutcome === "superseded" ? "not_ingestible" : rawOutcome;
    const outcome_detail = landedId
      ? decision.detail
      : decision.outcome === "accepted"
        ? `Decided "accepted" but the university_requirements insert failed: duplicate key value violates unique constraint "university_requirements_university_type_scope_idx" — reconstructed from the incident run log, not a fresh insert attempt.`
        : decision.detail;
    const { error } = await admin.from("requirement_research_queue").insert({
      batch_id: batchId,
      research_requirement_id: record.research_requirement_id,
      university_id: decision.universityId,
      university_name_input: record.university_name,
      university_country_input: record.university_country,
      program_name_input: record.program_name,
      requirement_type_input: record.requirement_category_db,
      scope_input: record.scope ?? null,
      requirement_text_input: record.requirement_text,
      source_url_input: record.source_url,
      source_type_input: record.source_type,
      verification_state_input: record.verification_state,
      raw_payload: record,
      outcome,
      outcome_detail,
      promoted_requirement_id: landedId,
    });
    if (error) {
      console.error(`  FAILED to backfill audit row for ${record.research_requirement_id}: ${error.message}`);
    } else {
      written += 1;
    }
  }
  console.log(`\nBackfilled ${written} new audit row(s), skipped ${skipped} already-written, total 131 accounted for: ${written + skipped}/131.`);
}

main();
