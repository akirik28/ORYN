#!/usr/bin/env node
/**
 * University + opportunity data completeness report (spec Phase 14).
 *
 * Read-only. Prints field-by-field coverage percentages plus, for `total_students`
 * specifically, a freshness breakdown (CURRENT / ACCEPTABLE_BUT_AGING / STALE /
 * DATE_UNKNOWN derived from `stats_as_of`) so "how much data do we have" and "how much of
 * it is actually recent" stay two different, both-answered questions rather than one
 * flattened row count.
 *
 * Usage: npm run report:universities
 */

// Keeps this file module-scoped instead of a global script — without it, its top-level
// `main` collides with any other zero-import script (e.g. check-integrations.ts) under a
// single `tsc --noEmit` run across the whole scripts/ directory.
export {};

import { readFileSync } from "node:fs";

import { classifyFreshness } from "../lib/acquisition/verification";
import { validateFixture } from "../lib/acquisition/fixture";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

/**
 * Staged-coverage report for an acquisition fixture.
 *
 * Runs with no database access, which is what makes before/after measurable while
 * SUPABASE_SECRET_KEY is unset: the live side of the comparison comes from the last
 * `npm run report:universities` run against a credentialed environment, and this side shows
 * exactly what a fixture would add on top, per field, with its verification states.
 */
function reportFixture(path: string): void {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const validation = validateFixture(raw);
  const parsed = raw as { universities: { declaredCountry: string; facts: { field: string; writePolicy: string }[] }[]; unresolved: unknown[] };

  console.log("=".repeat(70));
  console.log(`STAGED FIXTURE COVERAGE — ${path}`);
  console.log("=".repeat(70));
  console.log(`\nValidation: ${validation.ok ? "PASS" : `FAIL (${validation.errors.length} errors)`}`);
  for (const e of validation.errors) console.log(`  ERROR ${e}`);
  console.log(`\nUniversities staged: ${validation.stats.universities}`);
  console.log(`Countries covered:   ${new Set(parsed.universities.map((u) => u.declaredCountry)).size}`);
  console.log(`Facts staged:        ${validation.stats.facts}`);
  console.log(`Unresolved at acquisition: ${validation.stats.unresolved}`);

  console.log(`\nBy field (and how each may touch existing data):`);
  const policyByField = new Map<string, Set<string>>();
  for (const u of parsed.universities) {
    for (const f of u.facts) {
      const set = policyByField.get(f.field) ?? new Set<string>();
      set.add(f.writePolicy);
      policyByField.set(f.field, set);
    }
  }
  for (const [field, count] of Object.entries(validation.stats.byField).sort()) {
    console.log(`  ${field.padEnd(28)} ${String(count).padStart(4)}   ${[...(policyByField.get(field) ?? [])].join(", ")}`);
  }

  console.log(`\nBy verification state:`);
  for (const [state, count] of Object.entries(validation.stats.byVerificationState).sort()) {
    console.log(`  ${state.padEnd(28)} ${String(count).padStart(4)}`);
  }
  console.log(`\nNothing has been written. Apply with: npm run import:universities -- --file ${path} --apply`);
}


// Freshness classification is shared with the acquisition pipeline rather than reimplemented
// here, so "is this figure current" cannot mean two different things in two places.
const freshnessOf = (statsAsOf: string | null) => classifyFreshness(statsAsOf, new Date().getUTCFullYear());

function pct(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
}

async function main() {
  const args = process.argv.slice(2);
  const fixtureIndex = args.indexOf("--fixture");
  if (fixtureIndex >= 0 && args[fixtureIndex + 1]) {
    reportFixture(args[fixtureIndex + 1]);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.\n" +
        "The publishable key cannot substitute: global reference tables are authenticated-read only,\n" +
        "so an anon query returns zero rows for every table (RLS working, not an empty database).\n" +
        "For staged-fixture coverage with no credentials, use: npm run report:universities -- --fixture <path>"
    );
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const [{ data: universities, error: uniError }, { data: rankings }, { data: metrics }, { data: programs }] = await Promise.all([
    admin.from("universities").select("id, country, city, website_url, admissions_url, application_system, institution_type, description, student_size, latitude"),
    admin.from("university_rankings").select("university_id").eq("ranking_provider", "QS"),
    admin.from("university_profile_metrics").select("university_id, metric_code, stats_as_of, notes"),
    admin.from("university_programs").select("id"),
  ]);
  if (uniError || !universities) {
    console.error(`Couldn't read universities: ${uniError?.message}`);
    process.exitCode = 1;
    return;
  }

  const total = universities.length;
  const rankedIds = new Set((rankings ?? []).map((r) => r.university_id));
  const metricsByCode = new Map<string, typeof metrics>();
  for (const m of metrics ?? []) {
    const list = metricsByCode.get(m.metric_code) ?? [];
    list.push(m);
    metricsByCode.set(m.metric_code, list as NonNullable<typeof metrics>);
  }
  const distinctUnisFor = (code: string) => new Set((metricsByCode.get(code) ?? []).map((m) => m!.university_id)).size;

  console.log("=".repeat(70));
  console.log(`ORYN UNIVERSITY DATA COMPLETENESS — ${new Date().toISOString().slice(0, 10)}`);
  console.log("=".repeat(70));
  console.log(`\nTotal universities: ${total}\n`);

  const coreFields: [string, number][] = [
    ["QS ranking", rankedIds.size],
    ["country", universities.filter((u) => u.country).length],
    ["city", universities.filter((u) => u.city).length],
    ["official website", universities.filter((u) => u.website_url).length],
    ["admissions URL", universities.filter((u) => u.admissions_url).length],
    ["application system", universities.filter((u) => u.application_system).length],
    ["institution type", universities.filter((u) => u.institution_type).length],
    ["description", universities.filter((u) => u.description).length],
    ["coordinates", universities.filter((u) => u.latitude).length],
    ["student_size (synced to UI)", universities.filter((u) => u.student_size).length],
    ["total_students metric", distinctUnisFor("total_students")],
    ["undergraduate_students metric", distinctUnisFor("undergraduate_students")],
    ["postgraduate_students metric", distinctUnisFor("postgraduate_students")],
    ["international_students metric", distinctUnisFor("international_students")],
    ["international_student_percentage metric", distinctUnisFor("international_student_percentage")],
    ["faculty_count metric", distinctUnisFor("faculty_count")],
    ["student_faculty_ratio metric", distinctUnisFor("student_faculty_ratio")],
  ];
  for (const [label, n] of coreFields) {
    console.log(`  ${label.padEnd(42)} ${String(n).padStart(5)} / ${total}  (${pct(n, total)})`);
  }
  console.log(`\n  university_programs rows total: ${(programs ?? []).length}`);
  console.log(`  (financial aid / scholarships: still no dedicated entity — a real schema gap, held pending`);
  console.log(`   the sourcing decision in docs/founder-blocked-backlog.md item 23, not reported as fake 0%)`);

  console.log("\n" + "-".repeat(70));
  console.log("total_students FRESHNESS (based on stats_as_of)");
  console.log("-".repeat(70));
  const totalStudentsRows = (metricsByCode.get("total_students") ?? []) as { stats_as_of: string | null; notes: string | null }[];
  const buckets: Record<string, number> = { CURRENT: 0, ACCEPTABLE_BUT_AGING: 0, STALE: 0, DATE_UNKNOWN: 0 };
  const bucketsNewOnly: Record<string, number> = { CURRENT: 0, ACCEPTABLE_BUT_AGING: 0, STALE: 0, DATE_UNKNOWN: 0 };
  for (const m of totalStudentsRows) {
    const bucket = freshnessOf(m.stats_as_of);
    buckets[bucket]++;
    if (m.notes?.startsWith("Wikidata-indexed")) bucketsNewOnly[bucket]++;
  }
  const n = totalStudentsRows.length;
  console.log(`  All ${n} total_students rows:`);
  for (const [bucket, count] of Object.entries(buckets)) {
    console.log(`    ${bucket.padEnd(24)} ${String(count).padStart(4)}  (${pct(count, n)})`);
  }
  const newN = Object.values(bucketsNewOnly).reduce((a, b) => a + b, 0);
  console.log(`\n  Of which, Wikidata-pipeline-sourced this phase (${newN} rows):`);
  for (const [bucket, count] of Object.entries(bucketsNewOnly)) {
    console.log(`    ${bucket.padEnd(24)} ${String(count).padStart(4)}  (${pct(count, newN)})`);
  }

  const { data: opportunities } = await admin
    .from("opportunities")
    .select("verification_state, cycle_status, source_confidence, deadline");
  console.log("\n" + "-".repeat(70));
  console.log(`OPPORTUNITIES — ${(opportunities ?? []).length} total`);
  console.log("-".repeat(70));
  const byVerification = new Map<string, number>();
  const byCycle = new Map<string, number>();
  for (const o of opportunities ?? []) {
    byVerification.set(o.verification_state, (byVerification.get(o.verification_state) ?? 0) + 1);
    byCycle.set(o.cycle_status, (byCycle.get(o.cycle_status) ?? 0) + 1);
  }
  console.log("  By verification_state:");
  for (const [state, count] of byVerification) console.log(`    ${state.padEnd(22)} ${count}`);
  console.log("  By cycle_status:");
  for (const [state, count] of byCycle) console.log(`    ${state.padEnd(22)} ${count}`);

  console.log("\n" + "=".repeat(70));
}

main();
