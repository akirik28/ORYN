#!/usr/bin/env node
/**
 * Opportunities research handoff ingestion — mirrors scripts/ingest-university-programs.ts's
 * shape for docs/research-handoff-opportunities.md's JSONL contract. No identity-resolution
 * phase (organization is canonical_preferred_custom_fallback, not canonical_required — see
 * that doc's "Verification gate"), so this is simpler than the programs pipeline: fetch
 * existing opportunities for dedup, decide, insert accepted rows plus their
 * opportunity_sources provenance row.
 *
 * Unlike university_programs, there is no opportunity_research_queue audit table — the
 * research-handoff doc never specifies one, so a rejected/duplicate/insufficient-evidence
 * record is reported to the console only, not persisted. Re-running a batch is still safe:
 * decideIngestion() re-checks against the live `existing` set every time, and
 * opportunities_dedup_idx (normalized_title, organization) is the DB-level backstop.
 *
 * Usage:
 *   npm run ingest:opportunities -- data/research/opportunities/batch1.jsonl
 *   npm run ingest:opportunities -- data/research/opportunities/batch1.jsonl --apply
 */
import { readFileSync } from "node:fs";
import { decideIngestion, type ResearchOpportunityRecord } from "../lib/opportunities/ingest";
import { domainOf } from "../lib/acquisition/source-authority";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import type { DedupCandidate } from "../lib/opportunities/dedup";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

function parseJsonl(path: string): ResearchOpportunityRecord[] {
  const text = readFileSync(path, "utf-8");
  const records: ResearchOpportunityRecord[] = [];
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

interface ExistingOpportunityRow {
  id: string;
  title: string;
  organization: string | null;
  official_url: string | null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Usage: npm run ingest:opportunities -- <path.jsonl> [--apply]");
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

  const { rows: existingRows } = await fetchAllRowsVerified<ExistingOpportunityRow>(
    target,
    "opportunities",
    "id,title,organization,official_url",
    "order=id"
  );
  console.log(`Candidate dedup pool: ${existingRows.length} existing opportunities (paginated + exact-count verified).`);

  const existing: (DedupCandidate & { id: string })[] = existingRows.map((r) => ({
    id: r.id,
    title: r.title,
    organization: r.organization,
    officialUrl: r.official_url,
  }));

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const counts: Record<string, number> = {};
  let accepted = 0;

  for (const record of records) {
    const decision = decideIngestion(record, existing);
    counts[decision.outcome] = (counts[decision.outcome] ?? 0) + 1;
    console.log(`${record.research_opportunity_id} [${record.organization}] "${record.title}" -> ${decision.outcome}${decision.detail ? ` (${decision.detail})` : ""}`);

    if (decision.outcome !== "accepted" || !decision.row) continue;

    // Claim the dedup slot immediately so two accepted records in the same batch for the
    // same opportunity don't both pass the pre-computed `existing` check.
    existing.push({ id: "pending", title: decision.row.title, organization: decision.row.organization, officialUrl: decision.row.official_url });

    if (!apply) {
      accepted += 1;
      continue;
    }

    const { data: inserted, error: opportunityError } = await admin.from("opportunities").insert(decision.row).select("id").single();
    if (opportunityError) {
      console.error(`  failed to insert opportunity "${record.title}": ${opportunityError.message}`);
      continue;
    }
    accepted += 1;

    const { error: sourceError } = await admin.from("opportunity_sources").insert({
      opportunity_id: inserted.id,
      source_url: record.source_url,
      source_domain: domainOf(record.source_url),
      source_type: decision.row.source,
      confidence: decision.row.source_confidence,
      retrieved_at: record.researched_at,
    });
    if (sourceError) console.error(`  opportunity written but source provenance row failed for ${record.research_opportunity_id}: ${sourceError.message}`);
  }

  console.log("\nOutcome breakdown:", counts);
  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
  } else {
    console.log(`\nInserted ${accepted}/${records.length} row(s) into opportunities.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
