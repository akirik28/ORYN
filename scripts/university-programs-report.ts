#!/usr/bin/env node
/**
 * Data-quality report for university_programs + opportunities (spec Phase 14). Read-only.
 *
 * Deliberately separate from scripts/university-data-report.ts (which covers university
 * *identity* field completeness) — this answers the newer taxonomy questions: how much of
 * what's live is actually verified, not just populated, per-field.
 *
 * Usage: npm run report:programs
 */
export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function printTable(counts: Record<string, number>, total: number) {
  for (const [key, n] of Object.entries(counts).sort(([, a], [, b]) => b - a)) {
    console.log(`    ${key.padEnd(28)} ${String(n).padStart(4)}  (${pct(n, total)})`);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // ---- university_programs ---------------------------------------------------------
  const [{ data: programs, error: programsError }, { data: universityRows }] = await Promise.all([
    admin.from("university_programs").select("id, university_id, degree_level, subject_taxonomy, verification_state, official_program_url, source_url, normalized_name"),
    admin.from("universities").select("id, country"),
  ]);
  if (programsError || !programs) {
    console.error(`Couldn't read university_programs: ${programsError?.message}`);
    process.exitCode = 1;
    return;
  }
  const countryByUniversityId = new Map((universityRows ?? []).map((u) => [u.id, u.country]));

  console.log(`\n=== university_programs (${programs.length} total) ===`);
  console.log("\n  By verification_state:");
  printTable(countBy(programs, (p) => p.verification_state), programs.length);

  const verifiedCurrent = programs.filter((p) => p.verification_state === "verified_current");
  console.log(`\n  Universities with >=1 verified_current program: ${new Set(verifiedCurrent.map((p) => p.university_id)).size}`);

  console.log("\n  Subject coverage (verified_current only):");
  printTable(countBy(verifiedCurrent, (p) => p.subject_taxonomy ?? "(null)"), verifiedCurrent.length);

  console.log("\n  Country coverage (verified_current only):");
  printTable(
    countBy(verifiedCurrent, (p) => countryByUniversityId.get(p.university_id) ?? "(unknown)"),
    verifiedCurrent.length
  );

  const missingOfficialUrl = programs.filter((p) => !p.official_program_url).length;
  const missingSource = programs.filter((p) => !p.source_url).length;
  console.log(`\n  Missing official_program_url: ${missingOfficialUrl} (${pct(missingOfficialUrl, programs.length)})`);
  console.log(`  Missing source_url: ${missingSource} (${pct(missingSource, programs.length)})`);

  const dupKeys = countBy(programs, (p) => `${p.university_id}|${p.normalized_name}|${p.degree_level ?? ""}`);
  const dupCandidates = Object.values(dupKeys).filter((n) => n > 1).length;
  console.log(`  Duplicate-key candidates (should be 0 — enforced by DB unique index): ${dupCandidates}`);

  // ---- program_research_queue --------------------------------------------------------
  const { data: queue } = await admin.from("program_research_queue").select("outcome, batch_id");
  if (queue && queue.length > 0) {
    console.log(`\n=== program_research_queue (${queue.length} total across ${new Set(queue.map((q) => q.batch_id)).size} batch(es)) ===`);
    printTable(countBy(queue, (q) => q.outcome), queue.length);
  }

  // ---- opportunities -------------------------------------------------------------------
  const { data: opportunities, error: oppError } = await admin
    .from("opportunities")
    .select("id, verification_state, cycle_status, selectivity_tier, deadline, eligible_countries, organization_entity_id, organization, source_url");
  if (oppError || !opportunities) {
    console.error(`\nCouldn't read opportunities: ${oppError?.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== opportunities (${opportunities.length} total) ===`);
  console.log("\n  By verification_state:");
  printTable(countBy(opportunities, (o) => o.verification_state), opportunities.length);
  console.log("\n  By cycle_status:");
  printTable(countBy(opportunities, (o) => o.cycle_status), opportunities.length);
  console.log("\n  By selectivity_tier:");
  printTable(countBy(opportunities, (o) => o.selectivity_tier), opportunities.length);

  const missingDeadline = opportunities.filter((o) => !o.deadline).length;
  const missingEligibility = opportunities.filter((o) => !o.eligible_countries || o.eligible_countries.length === 0).length;
  const missingOrganizerLink = opportunities.filter((o) => !o.organization_entity_id && !o.organization).length;
  const missingSourceOpp = opportunities.filter((o) => !o.source_url).length;
  console.log(`\n  Missing deadline: ${missingDeadline} (${pct(missingDeadline, opportunities.length)})`);
  console.log(`  Missing eligible_countries: ${missingEligibility} (${pct(missingEligibility, opportunities.length)})`);
  console.log(`  Missing organizer (no entity link, no free-text name): ${missingOrganizerLink} (${pct(missingOrganizerLink, opportunities.length)})`);
  console.log(`  Missing source_url: ${missingSourceOpp} (${pct(missingSourceOpp, opportunities.length)})`);

  console.log("\nReminder: populated != verified. Read the verification_state / cycle_status breakdowns above, not just the total row counts, before citing coverage.\n");
}

main();
