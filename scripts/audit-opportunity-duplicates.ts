#!/usr/bin/env node
/**
 * Data-quality sprint, Part O — reusable duplicate audit (previously done by hand each
 * session, see supabase/data-batches/2026-08-20-status-consistency-and-dedup.md and
 * 2026-08-20-thin-category-enrichment.md). Reports candidates, categorized by confidence;
 * never deletes or disables anything itself — matches spec Part O's "do not auto-delete
 * ambiguous records."
 *
 * Usage:
 *   npm run audit:opportunity-duplicates
 */

export {};

import { findDuplicateCandidates } from "../lib/opportunities/duplicates";
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

  const response = await fetch(`${url}/rest/v1/opportunities?select=id,title,official_url,status&status=neq.disabled&order=title.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    console.error(`Failed to read opportunities: ${response.status} ${await response.text()}`);
    process.exitCode = 1;
    return;
  }
  const opportunities = (await response.json()) as Pick<Opportunity, "id" | "title" | "official_url" | "status">[];
  const candidates = findDuplicateCandidates(opportunities);

  const byTier = { deterministic: candidates.filter((c) => c.confidence === "deterministic"), probable: candidates.filter((c) => c.confidence === "probable"), needs_review: candidates.filter((c) => c.confidence === "needs_review") };

  for (const [tier, list] of Object.entries(byTier)) {
    console.log(`\n=== ${tier} (${list.length}) ===`);
    for (const c of list) {
      console.log(`  [${c.domain}] "${c.a.title}" [${c.a.id}] <-> "${c.b.title}" [${c.b.id}]  (similarity ${c.titleSimilarity.toFixed(2)})`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Live (non-disabled) opportunities scanned: ${opportunities.length}`);
  console.log(`deterministic: ${byTier.deterministic.length}   probable: ${byTier.probable.length}   needs_review: ${byTier.needs_review.length}`);
  console.log(`\nNothing was modified. Resolve deterministic/probable pairs by hand (keep the more complete/current row, disable the other via status='disabled') and record the decision in supabase/data-batches/.`);
}

main();
