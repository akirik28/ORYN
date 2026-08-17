#!/usr/bin/env node
/**
 * University Intelligence Spine — catastrophic-regression health check (spec Phase 10).
 *
 * Deliberately narrow and fast: this is NOT a replacement for report:universities (coverage
 * percentages), entities:audit (registry findings) or audit:university-duplicates (identity
 * pairs) — it is the check that should fail LOUDLY and IMMEDIATELY if something has gone
 * badly wrong, the way the founder brief asked for explicitly:
 *
 *   "if universities exact count unexpectedly becomes < expected baseline: FAIL LOUDLY
 *    if paginated result != exact count: FAIL LOUDLY
 *    if same ROR resolves to multiple live entities: FAIL LOUDLY"
 *
 * Exit code is non-zero on any FAIL, so this is safe to wire into a CI/pre-deploy gate later
 * without extra parsing. Every check uses fetchAllRowsVerified, which already throws on a
 * short/truncated read (the 1000-row PostgREST cap bug class) rather than silently
 * proceeding — so "the count matches the paginated read" is enforced by construction, not
 * re-implemented here.
 *
 * Usage:
 *   npm run check:university-spine-health [-- --min-universities 1000]
 */

import { fetchAllRowsVerified, fetchExactCount } from "../lib/acquisition/paginate";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was checked.");
    process.exitCode = 1;
    return;
  }
  const rest = { url, key };
  const args = process.argv.slice(2);
  const minIndex = args.indexOf("--min-universities");
  // 1000, not 1010: a floor with a small margin below the last known-good count, so a
  // genuine one-or-two-row change (a founder-approved removal, say) doesn't trip this on
  // its own, while any real data-loss incident (truncation, a bad delete, a botched import)
  // still gets caught immediately.
  const minUniversities = minIndex >= 0 && args[minIndex + 1] ? Number(args[minIndex + 1]) : 1000;

  const checks: Check[] = [];

  // 1. Row-count floor. fetchExactCount uses PostgREST's own Content-Range total, not a
  // client-side count of a possibly-truncated page.
  const uniCount = await fetchExactCount(rest, "universities");
  checks.push({
    name: "universities count >= baseline",
    pass: uniCount >= minUniversities,
    detail: `${uniCount} (floor: ${minUniversities})`,
  });

  // 2. Paginated read matches exact count — fetchAllRowsVerified throws internally on a
  // mismatch, so reaching the push below at all means this already passed; a thrown error
  // surfaces as an uncaught rejection at the bottom of this file, which is the intended
  // "fail loudly" behavior for this specific invariant.
  const { rows: allUnis, expected } = await fetchAllRowsVerified<{ id: string }>(rest, "universities", "id", "order=id.asc");
  checks.push({
    name: "paginated universities read == exact count",
    pass: allUnis.length === expected,
    detail: `assembled ${allUnis.length}, server counts ${expected}`,
  });

  // 3. No external id claimed by two different LIVE (non-merged) canonical entities. This
  // is the sharpest possible identity-corruption signal: entity_external_ids has a DB-level
  // unique(id_system, external_id) constraint, so this can only happen via a merge that
  // left the source un-tombstoned, or a direct write that bypassed the importer entirely.
  const { rows: externalIds } = await fetchAllRowsVerified<{ entity_id: string; id_system: string; external_id: string }>(
    rest,
    "entity_external_ids",
    "entity_id,id_system,external_id",
    "order=id_system.asc"
  );
  const { rows: liveEntities } = await fetchAllRowsVerified<{ id: string; verification_state: string }>(
    rest,
    "canonical_entities",
    "id,verification_state",
    "entity_type=eq.university&order=id.asc"
  );
  const liveEntityIds = new Set(liveEntities.filter((e) => e.verification_state !== "merged").map((e) => e.id));
  const ownersBySystemId = new Map<string, Set<string>>();
  for (const row of externalIds) {
    if (!liveEntityIds.has(row.entity_id)) continue; // not a university entity, or already merged away
    const key = `${row.id_system}:${row.external_id}`;
    const owners = ownersBySystemId.get(key) ?? new Set<string>();
    owners.add(row.entity_id);
    ownersBySystemId.set(key, owners);
  }
  const collisions = [...ownersBySystemId.entries()].filter(([, owners]) => owners.size > 1);
  checks.push({
    name: "no external id claimed by >1 live university entity",
    pass: collisions.length === 0,
    detail: collisions.length === 0 ? "clean" : collisions.map(([k, owners]) => `${k} -> ${[...owners].join(", ")}`).join("; "),
  });

  // 4. Every live universities row still has a canonical_entity_id (Phase 2/8 assumption
  // every downstream duplicate/verification check in this pass relies on).
  const { rows: uniLinks } = await fetchAllRowsVerified<{ id: string; canonical_entity_id: string | null }>(
    rest,
    "universities",
    "id,canonical_entity_id",
    "order=id.asc"
  );
  const missingLink = uniLinks.filter((u) => !u.canonical_entity_id);
  checks.push({
    name: "every universities row has canonical_entity_id",
    pass: missingLink.length === 0,
    detail: missingLink.length === 0 ? "clean" : `${missingLink.length} row(s) missing a link, e.g. ${missingLink[0].id}`,
  });

  console.log("=".repeat(70));
  console.log("UNIVERSITY SPINE HEALTH CHECK");
  console.log("=".repeat(70));
  let anyFailed = false;
  for (const check of checks) {
    console.log(`  [${check.pass ? "PASS" : "FAIL"}] ${check.name} — ${check.detail}`);
    if (!check.pass) anyFailed = true;
  }
  console.log("=".repeat(70));

  if (anyFailed) {
    console.error("\nAt least one catastrophic-regression check FAILED. Investigate before trusting any coverage report.");
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
}

main().catch((error: unknown) => {
  console.error("FAILED LOUDLY:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
