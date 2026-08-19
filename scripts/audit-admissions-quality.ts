#!/usr/bin/env node
/**
 * Re-scan every stored `admissions_url` against the CURRENT admissions.ts heuristics and
 * flag anomalies (spec Priority 2, University Intelligence Spine continuation) — the
 * "run anomaly detection... revert bad writes immediately" step the founder asked be a
 * repeatable part of the acquisition process, not a one-off manual check after each batch.
 *
 * Why URL-path-only, not a full re-score: the original page TITLE Tavily returned was never
 * persisted (by design — only the accepted fact and its source URL are durable data), so a
 * full `scoreAdmissionsCandidate` re-run isn't possible without re-fetching every page. This
 * script instead runs the two purely-structural checks that need only the stored URL:
 * SPECIAL_CASE_PATTERN and STALE_CYCLE_NEWS_PATTERN (both were added specifically because a
 * URL path alone was enough to have caught them the first time — the graduate-level and
 * admission/apply-signal checks genuinely need the title, so aren't repeated here).
 *
 * Usage:
 *   npm run audit:admissions-quality                # report only
 *   npm run audit:admissions-quality -- --revert     # + null out flagged admissions_url values
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

// Mirrors the path-only half of lib/acquisition/admissions.ts's SPECIAL_CASE_PATTERN /
// STALE_CYCLE_NEWS_PATTERN — not imported directly because those are defined to run against
// pre-lowercased strings alongside a title, and duplicating just the two regexes here keeps
// this script honest about operating on URL-only evidence rather than silently pretending to
// run the same check the acquisition pipeline does.
const SUSPICIOUS_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "special-case/appeal/extenuating-circumstances page", pattern: /extenuating[- ]circumstances|special[- ]circumstances|mitigating[- ]circumstances|\bappeals?\b|\bcomplaints?\b/i },
  { label: "dated news/results/cutoff page", pattern: /\/news\/|admission\s*results?|admission\s*scores?|entry\s*(?:cut[- ]?off|scores?)/i },
];

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const revert = process.argv.includes("--revert");

  const response = await fetch(`${url}/rest/v1/universities?admissions_url=not.is.null&select=id,name,admissions_url&order=name.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    console.error(`Read failed: HTTP ${response.status} ${await response.text().catch(() => "")}`);
    process.exitCode = 1;
    return;
  }
  const rows = (await response.json()) as { id: string; name: string; admissions_url: string }[];
  console.log(`${rows.length} universities with admissions_url set. Checking against ${SUSPICIOUS_PATTERNS.length} structural anomaly pattern(s)...\n`);

  const flagged: { id: string; name: string; admissions_url: string; reason: string }[] = [];
  for (const row of rows) {
    for (const { label, pattern } of SUSPICIOUS_PATTERNS) {
      if (pattern.test(row.admissions_url)) {
        flagged.push({ ...row, reason: label });
        break;
      }
    }
  }

  console.log(`${flagged.length} flagged:`);
  for (const f of flagged) console.log(`  [${f.reason}] ${f.name} -> ${f.admissions_url}`);

  if (!revert) {
    if (flagged.length > 0) console.log(`\nRe-run with --revert to null out these ${flagged.length} admissions_url value(s).`);
    return;
  }

  console.log(`\nReverting ${flagged.length} value(s)...`);
  let reverted = 0;
  for (const f of flagged) {
    const patch = await fetch(`${url}/rest/v1/universities?id=eq.${f.id}`, {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ admissions_url: null }),
    });
    if (!patch.ok) {
      console.error(`  FAILED ${f.name}: HTTP ${patch.status}`);
      continue;
    }
    reverted += 1;
  }
  console.log(`Reverted ${reverted}/${flagged.length}. These will be re-selected (admissions_url is null again) on the next acquire:admissions batch, now scored against the current heuristics.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
