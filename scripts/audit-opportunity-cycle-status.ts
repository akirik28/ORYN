#!/usr/bin/env node
/**
 * Read-only audit for the opportunity status-lifecycle gap found during the 2026-08-22
 * catalogue verification (docs/research/verification/opportunities-verification-2026-08-22.md)
 * and closed at the read-path level by lib/opportunities/lifecycle.ts. This script reports,
 * it never writes: use it to see which `active` opportunities have a `cycle_status` that
 * hasn't caught up with a deadline that has already passed, so a human can review and apply
 * the correction (this repo's standing rule: no DB writes from an audit script without
 * explicit authorization).
 *
 * Usage:
 *   npm run audit:opportunity-cycle-status
 */

export {};

import { deriveCycleStatusForPassedDeadline, isOpportunityActionable } from "../lib/opportunities/lifecycle";
import type { Opportunity } from "../types/database";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

type Row = Pick<Opportunity, "id" | "title" | "status" | "cycle_status" | "deadline">;

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }

  const response = await fetch(`${url}/rest/v1/opportunities?select=id,title,status,cycle_status,deadline&status=eq.active`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    console.error(`Failed to read opportunities: ${response.status} ${await response.text()}`);
    process.exitCode = 1;
    return;
  }

  const opportunities = (await response.json()) as Row[];

  const needsCycleStatusUpdate = opportunities
    .map((o) => ({ o, proposed: deriveCycleStatusForPassedDeadline(o) }))
    .filter((r): r is { o: Row; proposed: NonNullable<(typeof r)["proposed"]> } => r.proposed !== null);

  const nullDeadlineUnverified = opportunities.filter((o) => o.deadline === null && o.cycle_status === "unverified");
  const alreadyNonActionable = opportunities.filter((o) => !isOpportunityActionable(o));

  console.log(`\n=== Rows whose deadline has passed but cycle_status hasn't caught up (${needsCycleStatusUpdate.length}) ===`);
  for (const { o, proposed } of needsCycleStatusUpdate) {
    console.log(`  "${o.title}" [${o.id}]  deadline=${o.deadline}  cycle_status: '${o.cycle_status}' -> '${proposed}'`);
  }

  console.log(`\n=== Undetectable from stored data alone: null deadline, cycle_status still 'unverified' (${nullDeadlineUnverified.length}) ===`);
  console.log(`These cannot be resolved by any date rule. Each needs either a researcher reading the`);
  console.log(`source page, or a scheduled re-verification job that re-fetches source_url and checks`);
  console.log(`for closure language (AGENTS.md Phase 30, "Job B"/"Job E" — not built yet). Not listed`);
  console.log(`individually here since there is no proposed action to review — this count exists so`);
  console.log(`the gap stays visible rather than silently assumed away.`);

  console.log(`\n=== Summary ===`);
  console.log(`Active opportunities scanned: ${opportunities.length}`);
  console.log(`Already excluded from matches by the read-time gate (cycle_status closed/historical/discontinued, or deadline already past — independent of whether cycle_status itself has been corrected yet): ${alreadyNonActionable.length}`);
  console.log(`Proposed cycle_status corrections (deadline passed, label not yet caught up): ${needsCycleStatusUpdate.length}`);
  console.log(`Undetectable null-deadline rows still marked 'unverified': ${nullDeadlineUnverified.length}`);
  console.log(`\nNothing was modified. Apply proposed corrections by hand (or via a reviewed migration/script) and re-run this audit to confirm it reaches 0.`);
}

main();
