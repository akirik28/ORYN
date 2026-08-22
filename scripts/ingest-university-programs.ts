#!/usr/bin/env node
/**
 * University-programs research handoff ingestion (spec Phase: university programs
 * pipeline). Reads a JSONL batch matching docs/research-handoff-university-programs.md,
 * resolves each record's university via lib/acquisition/identity.ts's shared, alias-aware
 * matching, and writes every outcome (accepted/duplicate/unresolved/insufficient-evidence/
 * malformed-source) to program_research_queue — only `accepted` rows also land in
 * university_programs.
 *
 * Idempotent and restartable: re-running the same batch produces `duplicate` outcomes for
 * anything already accepted, never a second insert (belt-and-suspenders with the DB's own
 * unique index on university_programs). Dedup key includes language_of_instruction (ingest-
 * fixes defect 6) — a same-subject, different-language-track pair (common at Dutch/German
 * universities) is two distinct programs, not a duplicate.
 *
 * Invariant (ingest-fixes defect 6): every decided record gets a program_research_queue audit
 * row, even if its university_programs insert failed the DB's own unique index — the queue
 * row's own `outcome` is downgraded to "rejected" with the DB error in `outcome_detail` rather
 * than keeping the stale "accepted" decision, so nothing vanishes with zero trace. The queue
 * insert itself retries a few times (defect 7) — if it STILL fails after a program row already
 * landed, that program row is an orphan (inserted, no audit trail) and is NOT self-healing on a
 * re-run (its key already satisfies existingKeys, so the re-run reads it as "duplicate" and
 * never retries the missing queue row) — logged loudly as ORPHANED PROGRAM ROW, needs manual
 * reconciliation.
 *
 * Reads universities/aliases/external-ids via lib/acquisition/paginate.ts rather than a
 * plain supabase-js `.select()` — PostgREST's default 1000-row cap silently truncates an
 * unpaginated read, and `universities` alone is 1010 rows. An earlier version of this
 * script had exactly that bug (would have silently dropped the last ~10 universities,
 * alphabetically, from the candidate pool); fixed as part of reconciling with the
 * acquisition pipeline's own hard-won fix for the same bug class.
 *
 * Usage:
 *   npm run ingest:university-programs -- data/research/university-programs/batch1.jsonl
 *   npm run ingest:university-programs -- data/research/university-programs/batch1.jsonl --apply
 *
 * Deliberately does NOT import anything under lib/ with `import "server-only"` (same
 * constraint as scripts/enrich-student-counts.ts).
 */
import { readFileSync } from "node:fs";
import { applyDecision, decideIngestion, programDedupKey, type IngestDecision, type ProgramWriteClient, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { excludeSupersededUniversities, loadSupersessionMapViaRest } from "../lib/universities/canonical";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

function parseJsonl(path: string): ResearchProgramRecord[] {
  const text = readFileSync(path, "utf-8");
  const records: ResearchProgramRecord[] = [];
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
interface ExistingProgramRow {
  university_id: string;
  normalized_name: string;
  degree_level: string | null;
  language_of_instruction: string | null;
  official_program_url: string;
  degree_type: string | null;
}

/** Full candidate pool for identity resolution — every university, alias-enriched, read
 * completely (see the pagination note above). Aliases/external-ids are grouped in memory
 * rather than joined per-university to avoid N+1 requests.
 *
 * Excludes known-superseded duplicate rows (lib/universities/canonical.ts) before they ever
 * reach resolveIdentity(). Without this, a record naming an institution that has two live
 * `universities` rows (e.g. "Massachusetts Institute of Technology" / "...(MIT)") matches both
 * equally well and resolveIdentity() correctly refuses to guess — but the ambiguity is
 * spurious, since the two rows are already a confirmed duplicate elsewhere in the system. Found
 * live: a research lane hit exactly this on MIT and had to hand-pick which row to target. Same
 * fix as scripts/ingest-university-requirements-batch.ts already applies. */
async function loadUniversityCandidates(target: PostgrestTarget): Promise<UniversityLookupRow[]> {
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

  const supersessionMap = await loadSupersessionMapViaRest(target);
  return excludeSupersededUniversities(
    supersessionMap,
    universities.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
      externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
      websiteUrl: u.website_url,
    }))
  );
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Usage: npm run ingest:university-programs -- <path.jsonl> [--apply]");
    process.exitCode = 1;
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const records = parseJsonl(path);
  console.log(`Loaded ${records.length} record(s) from ${path}.`);

  const [universities, { rows: existing }] = await Promise.all([
    loadUniversityCandidates(target),
    fetchAllRowsVerified<ExistingProgramRow>(target, "university_programs", "university_id,normalized_name,degree_level,language_of_instruction,official_program_url,degree_type", "order=id"),
  ]);
  console.log(`Candidate pool: ${universities.length} universities (paginated + exact-count verified).`);

  const existingKeys = new Set(
    existing.map((r) => programDedupKey(r.university_id, r.normalized_name, r.degree_level, r.language_of_instruction, r.official_program_url, r.degree_type))
  );

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const batchId = `${path.split("/").pop()}_${new Date().toISOString().slice(0, 10)}`;

  // Sequential, not records.map(...) over a static existingKeys snapshot — two records in the
  // SAME file can collide with each other, not just with already-live data (found live,
  // migration 0054: Durham/Southampton BSc-vs-integrated-Masters pairs, Istanbul University's
  // "İşletme" listings). A static snapshot decides both independently and neither sees the
  // other; university_programs' own unique index still catches the real collision at insert
  // time, so nothing is silently duplicated, but a DRY RUN's predicted counts would undercount
  // real collisions. This is the same defect-6 shape (a decision pass that can't see its own
  // batch's own effects) fixed for a different reason this morning — if you're copying this
  // script's shape elsewhere, keep it sequential, not `.map()`.
  const decisions: { record: ResearchProgramRecord; decision: IngestDecision }[] = [];
  for (const record of records) {
    const decision = decideIngestion(record, universities, existingKeys);
    decisions.push({ record, decision });
    if (decision.outcome === "accepted" && decision.programRow) {
      existingKeys.add(
        programDedupKey(
          decision.programRow.university_id,
          decision.programRow.normalized_name,
          decision.programRow.degree_level,
          decision.programRow.language_of_instruction,
          decision.programRow.official_program_url,
          decision.programRow.degree_type
        )
      );
    }
  }

  const counts: Record<string, number> = {};
  for (const { decision } of decisions) counts[decision.outcome] = (counts[decision.outcome] ?? 0) + 1;
  console.log("Outcome breakdown:", counts);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  const writeClient: ProgramWriteClient = {
    async insertProgram(row) {
      const { data, error } = await admin.from("university_programs").insert(row).select("id").single();
      return { id: data?.id ?? null, error };
    },
    async insertQueueRow(row) {
      const { error } = await admin.from("program_research_queue").insert(row);
      return { error };
    },
  };

  let accepted = 0;
  let orphaned = 0;
  for (const { record, decision } of decisions) {

    const result = await applyDecision(record, decision, batchId, writeClient);
    if (result.accepted) accepted += 1;
    if (result.programInsertError) {
      console.error(`  failed to insert program for ${record.university_name} / ${record.program_name}: ${result.programInsertError}`);
    }
    if (result.orphaned) {
      orphaned += 1;
      console.error(
        `  ORPHANED PROGRAM ROW — (${record.university_name} / ${record.program_name}) inserted successfully but its program_research_queue audit row failed after retries: ${result.queueInsertError}. This will NOT self-heal on a batch re-run (the program row already satisfies existingKeys). Needs manual reconciliation.`
      );
    } else if (result.queueInsertError) {
      console.error(`  program_research_queue insert failed after retries for ${record.research_program_id}: ${result.queueInsertError}`);
    }
  }

  console.log(`\nInserted ${accepted}/${records.length} row(s) into university_programs. Full audit trail in program_research_queue (batch_id='${batchId}').`);
  if (orphaned > 0) {
    console.error(`\n${orphaned} program row(s) are ORPHANED (inserted, but their audit row failed even after retries) — see the ORPHANED PROGRAM ROW lines above. These need manual reconciliation, not a batch re-run.`);
  }
}

main();
