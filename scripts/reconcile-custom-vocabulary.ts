#!/usr/bin/env node
/**
 * Reconciliation queue for the canonical-suggestion fields (test_scores.test_name,
 * courses.subject, courses.course_name — features/entities/suggest-input.tsx's "suggest" field
 * type never rejects free text, by design, so real usage will always include values outside the
 * curated lists). Read-only, no DDL needed: the suggestion lists live in code
 * (lib/vocabularies/subjects.ts, lib/validation/onboarding.ts), not a database table, so
 * "reconciliation" here means finding values students actually typed often enough that they're
 * candidates for a human to add to those lists — not an automated queue that writes anything.
 *
 * A value appearing once is just one student's real (possibly genuinely custom) answer, not
 * evidence of a canonical gap — only repeated, near-identical values across multiple students
 * are worth a human's attention, so this only surfaces values at or above a minimum frequency.
 *
 * Usage:
 *   npm run reconcile:custom-vocabulary                # default frequency threshold (2)
 *   npm run reconcile:custom-vocabulary -- --min 3
 */

import { COURSE_NAME_SUGGESTIONS } from "../lib/vocabularies/subjects";
import { INTEREST_SUGGESTIONS } from "../lib/validation/onboarding";
import { TEST_NAME_SUGGESTIONS } from "../lib/vocabularies/tests";
import { fetchAllRowsVerified } from "../lib/acquisition/paginate";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface Rest {
  url: string;
  key: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function analyze(label: string, values: string[], canonical: readonly string[], minFrequency: number): void {
  const canonicalSet = new Set(canonical.map(normalize));
  const counts = new Map<string, { display: string; count: number }>();
  for (const raw of values) {
    if (!raw || !raw.trim()) continue;
    const key = normalize(raw);
    if (canonicalSet.has(key)) continue; // already canonical, nothing to reconcile
    const existing = counts.get(key);
    counts.set(key, { display: existing?.display ?? raw.trim(), count: (existing?.count ?? 0) + 1 });
  }
  const candidates = [...counts.values()].filter((c) => c.count >= minFrequency).sort((a, b) => b.count - a.count);

  console.log(`\n${label}: ${values.filter(Boolean).length} value(s) total, ${counts.size} distinct non-canonical, ${candidates.length} at/above frequency ${minFrequency}`);
  for (const c of candidates) console.log(`  ${String(c.count).padStart(3)}x  "${c.display}"`);
  if (candidates.length === 0 && counts.size > 0) {
    console.log(`  (${counts.size} non-canonical value(s) exist but none repeated ${minFrequency}+ times yet — real custom answers, not a vocabulary gap so far)`);
  }
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const rest: Rest = { url, key };
  const minIndex = process.argv.indexOf("--min");
  const minFrequency = minIndex >= 0 && process.argv[minIndex + 1] ? Number(process.argv[minIndex + 1]) : 2;

  const { rows: testScores } = await fetchAllRowsVerified<{ test_name: string }>(rest, "test_scores", "test_name", "order=id.asc");
  const { rows: courses } = await fetchAllRowsVerified<{ subject: string | null; course_name: string }>(rest, "courses", "subject,course_name", "order=id.asc");

  console.log("=".repeat(70));
  console.log(`RECONCILIATION QUEUE — candidate values for canonical-vocabulary review (min frequency: ${minFrequency})`);
  console.log(`${testScores.length} test_scores row(s), ${courses.length} courses row(s).`);
  console.log("=".repeat(70));

  analyze("test_scores.test_name", testScores.map((r) => r.test_name), TEST_NAME_SUGGESTIONS, minFrequency);
  analyze("courses.subject", courses.map((r) => r.subject ?? ""), INTEREST_SUGGESTIONS, minFrequency);
  analyze("courses.course_name", courses.map((r) => r.course_name), COURSE_NAME_SUGGESTIONS, minFrequency);

  console.log(`\n${"=".repeat(70)}\nThis is a report, not a writer — nothing here modifies the database or the suggestion lists.`);
  console.log("A candidate above the threshold means: add it to the relevant lib/vocabularies/*.ts list by hand after confirming it's a real, canonical value (not a typo cluster).");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
