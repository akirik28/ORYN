import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract test for migration 0081 — same reasoning as
 * __tests__/settings/birth-year-audit-schema.test.ts: no live Postgres in this
 * environment, so the guarantee this migration exists to provide (merged_by no longer
 * blocks an admin's own account deletion) is pinned by reading the SQL text rather than
 * exercised live.
 *
 * docs/account-deletion-audit-2026-09-02.md found this constraint live on
 * oryn-qa-scratch as ON DELETE NO ACTION with no migration file ever having created it —
 * confirmed by grepping every migration for "merged_by" (only 0038's bare column
 * declaration) and for "references auth.users" (only 0002_profiles.sql). The second
 * test below pins that specific finding: it's a mistake for a *later* migration to also
 * declare merged_by inline in a fresh create table, which would make 0081's ALTER a
 * no-op against a column that was never a plain uuid to begin with.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "supabase", "migrations");
const MIGRATION_0081 = readFileSync(join(MIGRATIONS_DIR, "0081_canonical_entity_merges_merged_by_set_null.sql"), "utf8");
const flat0081 = MIGRATION_0081.replace(/\s+/g, " ");

describe("migration 0081: canonical_entity_merges.merged_by no longer blocks a deletion", () => {
  test("drops the constraint if it exists before re-adding it — re-run safe", () => {
    expect(flat0081).toMatch(/drop constraint if exists canonical_entity_merges_merged_by_fkey/);
  });

  test("re-adds it as ON DELETE SET NULL, not CASCADE or the original NO ACTION", () => {
    expect(flat0081).toMatch(
      /add constraint canonical_entity_merges_merged_by_fkey\s+foreign key \(merged_by\) references auth\.users\(id\) on delete set null/
    );
    expect(flat0081).not.toMatch(/on delete cascade/);
    expect(flat0081).not.toMatch(/on delete no action/);
  });

  test("targets auth.users directly, matching what's live — not profiles", () => {
    // merged_by has always referenced auth.users(id), not profiles(id) (unlike every
    // other FK this audit touched tonight) — getting the target table wrong here would
    // make the migration fail outright against the live schema, not silently misbehave.
    expect(flat0081).toMatch(/references auth\.users\(id\)/);
  });
});

describe("canonical_entity_merges.merged_by stays a plain, unconstrained-by-default column at its origin", () => {
  test("0038 declares merged_by with no inline references clause — the FK is bolted on later, by 0081, not original", () => {
    const migration0038 = readFileSync(join(MIGRATIONS_DIR, "0038_canonical_entity_registry.sql"), "utf8").replace(/\s+/g, " ");
    expect(migration0038).toMatch(/merged_by uuid,/);
    expect(migration0038).not.toMatch(/merged_by uuid references/);
  });

  test("no other migration re-declares canonical_entity_merges or its merged_by column with a different shape", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql") && f !== "0038_canonical_entity_registry.sql" && f !== "0081_canonical_entity_merges_merged_by_set_null.sql");
    for (const file of files) {
      const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      expect(content, `${file} should not reference merged_by — only 0038 (origin) and 0081 (this fix) should`).not.toMatch(/merged_by/);
    }
  });
});
