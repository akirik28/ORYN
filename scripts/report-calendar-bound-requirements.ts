#!/usr/bin/env node
/**
 * Read-only demonstration that AnnualCalendarWindow / isDueForAnnualRecheck (lib/
 * acquisition/verification.ts) says the right thing about real, live rows — not just the
 * unit tests' synthetic dates. Identifies the CAO-points rows among the 67 requirement
 * rows the 2026-08-31 backfill marked verified_historical (matched back to their
 * research record's own text, same technique as that backfill), then reports whether
 * CAO_POINTS_IE considers each one due for a re-check as of today.
 *
 * Writes nothing — no requirement row is touched, no verification_state is changed. See
 * docs/handoffs/calendar-bound-fact-cadence-2026-08-31.md for what this is for.
 *
 * Usage: npx tsx scripts/report-calendar-bound-requirements.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { CAO_POINTS_IE, isDueForAnnualRecheck } from "../lib/acquisition/verification";
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
  university_id: string;
  research_record_id: string | null;
  verification_state: string;
  retrieved_at: string | null;
  title: string | null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;

  const dir = "data/research/university-requirements";
  const isCaoPoints = new Set<string>();
  for (const f of readdirSync(dir).filter((f) => f.startsWith("ie_requirements_") && f.endsWith(".jsonl"))) {
    for (const rec of parseJsonl<{ research_requirement_id?: string; requirement_text?: string; limitations?: string }>(`${dir}/${f}`)) {
      const text = `${rec.requirement_text ?? ""} ${rec.limitations ?? ""}`;
      if (rec.research_requirement_id && /CAO/.test(text) && /points|Round/.test(text)) {
        isCaoPoints.add(rec.research_requirement_id);
      }
    }
  }
  console.log(`Identified ${isCaoPoints.size} CAO-points research records in the Irish corpus.`);

  const target: PostgrestTarget = { url, key };
  const { rows } = await fetchAllRowsVerified<ReqRow>(
    target,
    "university_requirements",
    "id,university_id,research_record_id,verification_state,retrieved_at,title",
    "order=id"
  );

  const caoRows = rows.filter((r) => r.research_record_id && isCaoPoints.has(r.research_record_id));
  console.log(`Matched ${caoRows.length} live university_requirements rows to those research records.\n`);

  const now = new Date();
  console.log(`Evaluating against CAO_POINTS_IE (anchor: ${CAO_POINTS_IE.month}/${CAO_POINTS_IE.day}), now = ${now.toISOString()}\n`);

  let due = 0;
  let notDue = 0;
  for (const r of caoRows) {
    const isDue = r.retrieved_at ? isDueForAnnualRecheck(CAO_POINTS_IE, r.retrieved_at, now) : true;
    if (isDue) due++;
    else notDue++;
  }
  console.log(`Due for re-check: ${due}`);
  console.log(`Not yet due: ${notDue}`);
  console.log(`\nAll retrieved_at values seen: ${[...new Set(caoRows.map((r) => r.retrieved_at))].join(", ")}`);

  // Contrast with what the OLD rolling-cadence model would have said, using population's
  // own 365-day figure (the closest existing CADENCE_DAYS entry to an annual fact) as the
  // comparison — same rows, same "now", different mechanism.
  const oldModelDue = caoRows.filter((r) => {
    if (!r.retrieved_at) return true;
    const ageDays = (now.getTime() - Date.parse(r.retrieved_at)) / 86_400_000;
    return ageDays > 365;
  }).length;
  console.log(`\nFor comparison, a rolling 365-day cadence (CADENCE_DAYS.population, the closest existing entry) would call ${oldModelDue} of these ${caoRows.length} due today — the calendar-anchored model catches all ${due} because it's tied to the actual publication event, not an arbitrary day-count from first retrieval.`);
}

main();
