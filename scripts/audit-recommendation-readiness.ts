#!/usr/bin/env node
/**
 * Counselor Core data-quality workstream — the Phase 9 deterministic readiness audit run
 * against live data. Reports, per opportunity, exactly why it is or isn't recommendation-
 * ready today (lib/opportunities/readiness.ts), plus an aggregate funnel so the data-
 * acquisition workstream can prioritize by real leverage instead of raw row count.
 *
 * Deliberately raw fetch against PostgREST (not the Supabase JS client) — same reasoning as
 * scripts/check-integrations.ts and scripts/audit-admissions-quality.ts: this is a plain
 * Node/tsx script, not bundled by Next, so it can't import anything tagged "server-only".
 * lib/opportunities/readiness.ts has no such tag and IS imported directly — it's pure,
 * network-free logic, safe in any runtime.
 *
 * Usage:
 *   npm run audit:recommendation-readiness              # full report
 *   npm run audit:recommendation-readiness -- --summary  # funnel only, no per-record detail
 */

export {};

import { evaluateRecommendationReadiness } from "../lib/opportunities/readiness";
import type { Opportunity } from "../types/database";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const summaryOnly = process.argv.includes("--summary");

  const response = await fetch(`${url}/rest/v1/opportunities?select=*&order=title.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    console.error(`Failed to read opportunities: ${response.status} ${await response.text()}`);
    process.exitCode = 1;
    return;
  }
  const opportunities = (await response.json()) as Opportunity[];

  const reports = opportunities.map(evaluateRecommendationReadiness);
  const ready = reports.filter((r) => r.tier === "recommendation_ready");
  const notReady = reports.filter((r) => r.tier === "not_ready");

  if (!summaryOnly) {
    console.log("=== Not recommendation-ready (blockers) ===\n");
    for (const r of notReady) {
      console.log(`- ${r.title} [${r.opportunityId}]`);
      for (const b of r.blockers) console.log(`    blocker: ${b}`);
    }

    console.log("\n=== Recommendation-ready, with open quality signals (research priority) ===\n");
    for (const r of ready.filter((r) => r.qualitySignals.length > 0)) {
      console.log(`- ${r.title} [${r.opportunityId}]`);
      for (const s of r.qualitySignals) console.log(`    signal: ${s}`);
    }
  }

  const blockerCounts = new Map<string, number>();
  for (const r of notReady) {
    for (const b of r.blockers) {
      const key = b.split(" — ")[0].split(".")[0];
      blockerCounts.set(key, (blockerCounts.get(key) ?? 0) + 1);
    }
  }
  const signalCounts = new Map<string, number>();
  for (const r of reports) {
    for (const s of r.qualitySignals) {
      const key = s.split(" — ")[0].split(".")[0];
      signalCounts.set(key, (signalCounts.get(key) ?? 0) + 1);
    }
  }

  console.log("\n=== Recommendation-readiness funnel ===");
  console.log(`Total opportunities:        ${opportunities.length}`);
  console.log(`recommendation_ready:       ${ready.length}`);
  console.log(`not_ready (blocked):        ${notReady.length}`);
  console.log(`  ...of which fully clean (no open quality signals either): ${ready.filter((r) => r.qualitySignals.length === 0).length}`);
  console.log("\nBlocker breakdown (not_ready records):");
  for (const [reason, count] of [...blockerCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}  ${reason}`);
  }
  console.log("\nQuality-signal breakdown (all records, informational):");
  for (const [reason, count] of [...signalCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}  ${reason}`);
  }
}

main();
