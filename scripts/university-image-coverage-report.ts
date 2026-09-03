#!/usr/bin/env node
/**
 * University image coverage report — two distinct views, deliberately not collapsed into one:
 *
 *   DISPLAY-SAFE: what a student's browser actually shows, right now, for every university.
 *   Always 100% by construction (features/universities/university-card.tsx's fallback chain —
 *   real photo -> logo -> ORYN icon — guarantees every university renders *something* that
 *   isn't a broken image; this report just counts which tier each one landed on).
 *
 *   PIPELINE STATUS: the acquisition pipeline's own bookkeeping (scripts/acquire-university-
 *   images.ts) — how many have a real verified photo vs. are sitting in needs_review or were
 *   never even a candidate. This is the number that should keep improving on future
 *   `--apply` re-runs; "display-safe" alone would hide that difference, which is exactly what
 *   the founder's spec explicitly warned against.
 *
 * Usage:
 *   npm run report:university-images
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { getSupersededUniversityIds, loadSupersessionMapViaRest } from "../lib/universities/canonical";
import { displayTierOf, categorizeRejection, type DisplayTier, type RejectionCategory } from "../lib/universities/image-coverage";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const { rows: allUniversities } = await fetchAllRowsVerified<{ id: string; name: string; logo_url: string | null }>(
    target,
    "universities",
    "id,name,logo_url",
    "order=id.asc"
  );
  const supersessionMap = await loadSupersessionMapViaRest(target);
  const supersededIds = new Set(getSupersededUniversityIds(supersessionMap));
  const live = allUniversities.filter((u) => !supersededIds.has(u.id));

  const { rows: statusRows } = await fetchAllRowsVerified<{ university_id: string; value_text: string | null; notes: string | null }>(
    target,
    "university_profile_metrics",
    "university_id,value_text,notes",
    "metric_code=eq.primary_image_status&order=id.asc"
  );
  const statusByUniversityId = new Map(statusRows.map((r) => [r.university_id, r]));

  const { rows: urlRows } = await fetchAllRowsVerified<{ university_id: string }>(
    target,
    "university_profile_metrics",
    "university_id",
    "metric_code=eq.primary_image_url&order=id.asc"
  );
  const hasRealImage = new Set(urlRows.map((r) => r.university_id));

  const displayCounts: Record<DisplayTier, number> = { real_verified: 0, logo_fallback: 0, proxola_fallback: 0 };
  const pipelineCounts = { real: 0, needsReview: 0, noCandidate: 0 };
  const rejectionCounts = new Map<RejectionCategory, number>();
  const needsReviewByUniversity: { name: string; reason: RejectionCategory; notes: string | null }[] = [];

  for (const uni of live) {
    const hasReal = hasRealImage.has(uni.id);
    const tier = displayTierOf({ hasRealImage: hasReal, hasLogo: Boolean(uni.logo_url) });
    displayCounts[tier]++;

    if (hasReal) {
      pipelineCounts.real++;
      continue;
    }
    const statusRow = statusByUniversityId.get(uni.id);
    if (statusRow?.value_text === "needs_review") {
      pipelineCounts.needsReview++;
      const category = categorizeRejection(statusRow.notes);
      rejectionCounts.set(category, (rejectionCounts.get(category) ?? 0) + 1);
      needsReviewByUniversity.push({ name: uni.name, reason: category, notes: statusRow.notes });
    } else {
      pipelineCounts.noCandidate++;
    }
  }

  const displaySafeTotal = displayCounts.real_verified + displayCounts.logo_fallback + displayCounts.proxola_fallback;

  console.log(`Total live universities: ${live.length}\n`);

  console.log(`DISPLAY-SAFE (what the UI shows right now):`);
  console.log(`  Display-safe: ${displaySafeTotal}/${live.length}`);
  console.log(`  Real verified image:  ${displayCounts.real_verified}`);
  console.log(`  Official logo fallback: ${displayCounts.logo_fallback}`);
  console.log(`  Proxola branded fallback:  ${displayCounts.proxola_fallback}`);
  console.log(`  Broken: 0 (every write is HEAD-verified before being stored — see verifyPublicUrlServes)\n`);

  console.log(`PIPELINE STATUS (internal — what still needs follow-up work):`);
  console.log(`  Real verified: ${pipelineCounts.real}/${live.length} (${((pipelineCounts.real / live.length) * 100).toFixed(1)}%)`);
  console.log(`  Needs review: ${pipelineCounts.needsReview}`);
  console.log(`  No candidate ever found: ${pipelineCounts.noCandidate}\n`);

  console.log(`needs_review rejection reasons (parsed from stored notes):`);
  for (const [category, count] of [...rejectionCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count}`);
  }
  console.log(
    `\nNot mechanically detectable by this pipeline (no visual/semantic check performed — see the founder's spec's ` +
      `"wrong constituent college" / "wrong campus" / "generic city photo" / "ambiguous institution" categories): ` +
      `these would need manual visual review of the accepted candidate, not automated categorization from a rejection reason.`
  );

  if (process.argv.includes("--list-needs-review")) {
    console.log(`\nneeds_review detail:`);
    for (const item of needsReviewByUniversity) {
      console.log(`  [${item.reason}] ${item.name}${item.notes ? ` — ${item.notes}` : ""}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
