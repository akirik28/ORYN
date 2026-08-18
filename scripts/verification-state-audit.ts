#!/usr/bin/env node
/**
 * Canonical entity verification-state integrity audit (spec Phase 8 — University
 * Intelligence Spine; also founder-blocked-backlog.md item 20).
 *
 * `entity_evidence`'s own table comment (migration 0038) states the rule this enforces:
 * "a verification_state of official_verified is only defensible when a matching
 * primary-source row exists here." As of this pass, EVERY university-type entity marked
 * official_verified has zero entity_evidence rows — the registry is asserting a
 * verification state its own evidence model doesn't support, for the entire set, not a few
 * stragglers.
 *
 * `--fix-downgrade` corrects this the honest direction only: official_verified -> to
 * source_verified when no evidence exists. It NEVER upgrades anything (attaching real
 * evidence and re-verifying is a human/sourced-acquisition decision, not something this
 * script can decide), and it never touches `merged` (tombstoned) rows.
 *
 * Scoped to entity_type=university this run (University Intelligence Spine's ownership);
 * the underlying rule is entity-type-agnostic, so `--entity-type` can target another type
 * later without rewriting this script.
 *
 * Usage:
 *   npm run audit:verification-state                              # report only (university)
 *   npm run audit:verification-state -- --fix-downgrade            # + downgrade, university
 *   npm run audit:verification-state -- --entity-type=school       # report only, another type
 */

import { fetchAllRowsVerified } from "../lib/acquisition/paginate";

export {};

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
  const rest = { url, key };
  const args = process.argv.slice(2);
  const fixDowngrade = args.includes("--fix-downgrade");
  const entityTypeArg = args.find((a) => a.startsWith("--entity-type="));
  const entityType = entityTypeArg ? entityTypeArg.split("=")[1] : "university";

  const { rows: entities } = await fetchAllRowsVerified<{ id: string; display_name: string; verification_state: string }>(
    rest,
    "canonical_entities",
    "id,display_name,verification_state",
    `entity_type=eq.${entityType}&verification_state=eq.official_verified&order=id.asc`
  );
  console.log(`${entities.length} live "${entityType}" entities marked official_verified.`);

  if (entities.length === 0) {
    console.log("Nothing to check.");
    return;
  }

  // Evidence rows for any entity are irrelevant to look up per-id (would risk a giant IN()
  // clause at scale) — fetch all evidence once and intersect client-side, same approach as
  // the Phase 8 investigation this script formalizes.
  const { rows: allEvidence } = await fetchAllRowsVerified<{ entity_id: string }>(rest, "entity_evidence", "entity_id", "order=id.asc");
  const withEvidence = new Set(allEvidence.map((e) => e.entity_id));

  const unsupported = entities.filter((e) => !withEvidence.has(e.id));
  const supported = entities.filter((e) => withEvidence.has(e.id));

  console.log(`  with >=1 entity_evidence row (verification state is defensible): ${supported.length}`);
  console.log(`  with ZERO entity_evidence rows (verification state is NOT defensible): ${unsupported.length}`);

  // Cross-reference with universities rows — a downgrade on an entity with a real,
  // product-visible universities row is the higher-leverage half of this fix (a "Verified"
  // trust signal a real user could see, if the UI ever surfaces verification_state); an
  // orphan entity with no universities row is pure registry hygiene, invisible either way.
  const { rows: uniRows } = await fetchAllRowsVerified<{ canonical_entity_id: string | null }>(rest, "universities", "canonical_entity_id", "order=id.asc");
  const entityIdsWithUniRow = new Set(uniRows.map((u) => u.canonical_entity_id).filter((id): id is string => id !== null));
  const productVisible = unsupported.filter((e) => entityIdsWithUniRow.has(e.id));
  console.log(`  of the unsupported set, with a real linked universities row (product-visible): ${productVisible.length}`);
  if (productVisible.length > 0) {
    console.log("  Product-visible entities currently overclaiming official_verified with no evidence:");
    for (const e of productVisible) console.log(`    ${e.display_name} (${e.id})`);
  }

  if (!fixDowngrade) {
    if (unsupported.length > 0) console.log(`\n${unsupported.length} entities would be downgraded to source_verified. Re-run with --fix-downgrade to apply.`);
    return;
  }

  console.log(`\nDowngrading ${unsupported.length} entit${unsupported.length === 1 ? "y" : "ies"} to source_verified...`);
  let fixed = 0;
  for (const e of unsupported) {
    const response = await fetch(`${url}/rest/v1/canonical_entities?id=eq.${e.id}`, {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ verification_state: "source_verified" }),
    });
    if (!response.ok) {
      console.error(`  FAILED ${e.display_name}: HTTP ${response.status} ${await response.text().catch(() => "")}`);
      continue;
    }
    fixed += 1;
  }
  console.log(`Downgraded ${fixed}/${unsupported.length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
