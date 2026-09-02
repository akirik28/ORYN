import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EVIDENCE_LINKABLE_TABLES } from "@/lib/validation/evidence";

/**
 * Regression guard for a real, confirmed-live bug: education_records and test_scores
 * were both in EVIDENCE_LINKABLE_TABLES (so a student could already pick either one in
 * Documents' "this supports" dropdown and successfully upload a file) without ever
 * having the evidence_status column the other seven achievement tables got in migration
 * 0004. app/(app)/documents/actions.ts's uploadEvidence() unconditionally tries to write
 * that column after every upload — for these two tables it always failed with "column
 * does not exist", silently, because the write's result was never checked. The
 * evidence_files row and the storage upload both still succeeded, so the student saw a
 * normal success; only the mirror onto the achievement item itself was ever lost.
 * Migration 0079 adds the missing column. This test reads the migration SQL directly
 * (same reasoning as __tests__/settings/birth-year-audit-schema.test.ts: no live
 * Postgres in this environment) rather than assuming a fix that hasn't been applied.
 *
 * The second describe block is the derived guard: it doesn't hardcode
 * education_records/test_scores by name, so it also catches the same class of gap for
 * any table added to EVIDENCE_LINKABLE_TABLES later without an evidence_status column —
 * exactly how this one went unnoticed in the first place.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "supabase", "migrations");

function readMigrationsFlat(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n")
    .replace(/\s+/g, " ");
}

describe("migration 0079: education_records and test_scores get evidence_status", () => {
  const MIGRATION = readFileSync(join(MIGRATIONS_DIR, "0079_education_test_score_evidence_status.sql"), "utf8");
  const flat = MIGRATION.replace(/\s+/g, " ");

  test.each(["education_records", "test_scores"])("adds evidence_status to %s with the same shape as the other seven achievement tables", (table) => {
    // Same enum type, same default, same not-null as migration 0004's activities/awards/
    // etc. — a different shape here would make this table behave inconsistently with
    // every other evidence-linkable table for no reason.
    const pattern = new RegExp(
      `alter table public\\.${table}\\s+add column if not exists evidence_status evidence_status not null default 'self_reported'`
    );
    expect(flat).toMatch(pattern);
  });
});

describe("every EVIDENCE_LINKABLE_TABLES entry has an evidence_status column somewhere in the migration history", () => {
  const flat = readMigrationsFlat();

  test("the scan finds evidence_status defined at least 9 times — a broken regex must fail loudly, not silently pass", () => {
    // Guards this test file the same way __tests__/export/tables.test.ts's own derived
    // check guards itself: without this, a regex that stops matching turns every case
    // below into a false pass.
    const occurrences = flat.match(/evidence_status evidence_status/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(9);
  });

  test.each(EVIDENCE_LINKABLE_TABLES)("%s has an evidence_status column added somewhere in supabase/migrations", (table) => {
    const addedInCreate = new RegExp(`create table public\\.${table}\\s*\\([^;]*evidence_status evidence_status`);
    const addedByAlter = new RegExp(`alter table public\\.${table}\\s+add column if not exists evidence_status evidence_status`);
    expect(
      addedInCreate.test(flat) || addedByAlter.test(flat),
      `${table} is in EVIDENCE_LINKABLE_TABLES but no migration gives it an evidence_status column — uploadEvidence()'s status-mirroring update will fail for it exactly as it did for education_records/test_scores before migration 0079.`
    ).toBe(true);
  });
});
