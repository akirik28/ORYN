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

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

function freshnessOf(statsAsOf: string | null): "CURRENT" | "ACCEPTABLE_BUT_AGING" | "STALE" | "DATE_UNKNOWN" {
  if (!statsAsOf) return "DATE_UNKNOWN";
  const years = [...statsAsOf.matchAll(/20[0-2]\d/g)].map((m) => Number(m[0]));
  if (years.length === 0) return "DATE_UNKNOWN";
  const best = Math.max(...years);
  if (best >= 2024) return "CURRENT";
  if (best >= 2022) return "ACCEPTABLE_BUT_AGING";
  return "STALE";
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0%" : `${((100 * n) / total).toFixed(1)}%`;
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

  const [{ data: universities, error: uniError }, { data: rankings }, { data: metrics }, { data: programs }] = await Promise.all([
    admin.from("universities").select("id, country, city, website_url, institution_type, description, student_size, latitude"),
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
  console.log(`  (admissions URL / financial aid: no dedicated column exists yet on universities or`);
  console.log(`   university_requirements — a real schema gap, not reported as fake 0% coverage of a field)`);

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
