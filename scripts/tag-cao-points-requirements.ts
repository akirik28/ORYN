#!/usr/bin/env node
/**
 * Sets calendar_bound_fact_class = 'cao_points_ie' on exactly the university_requirements
 * rows that are CAO points facts — the same matching logic
 * scripts/report-calendar-bound-requirements.ts uses to demonstrate the mechanism,
 * reused here to act on it. Touches ONLY this new column: verification_state and
 * evaluation_gate are read, never written, by this script.
 *
 * Dry-run by default; writes only with --apply. Idempotent — re-running after a row is
 * already tagged is a no-op for that row (the update is skipped, not re-applied).
 *
 * Usage:
 *   npx tsx scripts/tag-cao-points-requirements.ts
 *   npx tsx scripts/tag-cao-points-requirements.ts --apply
 */
import { readFileSync, readdirSync } from "node:fs";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fine
}

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  const records: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // skip
    }
  }
  return records;
}

interface ReqRow {
  id: string;
  research_record_id: string | null;
  calendar_bound_fact_class: string | null;
  verification_state: string;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }

  const dir = "data/research/university-requirements";
  // 2026-09-01: also search researcher_notes, not just requirement_text/limitations.
  // REQ-2026-08-21-IE-UCC-011 was missed by the first version of this check — its own
  // researcher_notes says "Recorded per the standing instruction to treat CAO points as
  // a competitive outcome" but neither requirement_text nor limitations mentions "CAO" at
  // all, so it silently fell through. Caught during the follow-up "classify the other 30"
  // investigation, not by this script itself — worth remembering that a text heuristic is
  // only as complete as the fields it's told to look at.
  const isCaoPoints = new Set<string>();
  for (const f of readdirSync(dir).filter((f) => f.startsWith("ie_requirements_") && f.endsWith(".jsonl"))) {
    for (const rec of parseJsonl<{ research_requirement_id?: string; requirement_text?: string; limitations?: string; researcher_notes?: string }>(`${dir}/${f}`)) {
      const text = `${rec.requirement_text ?? ""} ${rec.limitations ?? ""} ${rec.researcher_notes ?? ""}`;
      if (rec.research_requirement_id && /CAO/.test(text) && /points|Round/.test(text)) {
        isCaoPoints.add(rec.research_requirement_id);
      }
    }
  }
  console.log(`Identified ${isCaoPoints.size} CAO-points research records.`);

  const target: PostgrestTarget = { url, key };
  const { rows } = await fetchAllRowsVerified<ReqRow>(
    target,
    "university_requirements",
    "id,research_record_id,calendar_bound_fact_class,verification_state",
    "order=id"
  );

  // verification_state=verified_historical is required, not just a CAO/points/Round text
  // match: a first version of this script's text heuristic caught 6 false positives —
  // general Leaving Certificate eligibility floors (e.g. "Minimum grade H4 in two
  // subjects...") whose LIMITATIONS field happened to mention "CAO" and an unrelated
  // "points"/"Round" word (one explicitly says "not points", talking about matriculation
  // subjects, not a cutoff score) without being a competitive-outcome fact at all. Every
  // genuine CAO-points-outcome record in the Irish corpus was independently confirmed
  // VERIFIED_HISTORICAL during the 2026-08-31 Ireland investigation — no exceptions found
  // — so requiring that state here is a real filter, not an arbitrary tightening.
  const matched = rows.filter((r) => r.research_record_id && isCaoPoints.has(r.research_record_id));
  const falsePositives = matched.filter((r) => r.verification_state !== "verified_historical");
  const toTag = matched.filter((r) => r.verification_state === "verified_historical" && r.calendar_bound_fact_class !== "cao_points_ie");
  const alreadyTagged = matched.filter((r) => r.calendar_bound_fact_class === "cao_points_ie");

  console.log(`Text-matched CAO-points research records: ${matched.length}`);
  if (falsePositives.length > 0) {
    console.log(`Excluded as false positives (not verification_state=verified_historical — see comment above): ${falsePositives.length}`);
    for (const r of falsePositives) console.log(`  ${r.id}: verification_state=${r.verification_state}`);
  }
  console.log(`Genuine CAO-points rows to tag: ${toTag.length}`);
  console.log(`Already tagged: ${alreadyTagged.length}`);

  if (toTag.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  let succeeded = 0;
  let failed = 0;
  for (const r of toTag) {
    const { error } = await admin.from("university_requirements").update({ calendar_bound_fact_class: "cao_points_ie" }).eq("id", r.id);
    if (error) {
      failed++;
      console.error(`  FAILED ${r.id}: ${error.message}`);
    } else {
      succeeded++;
    }
  }
  console.log(`\nTagged ${succeeded}/${toTag.length} row(s). ${failed} failure(s).`);
}

main();
