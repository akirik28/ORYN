import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract test for migration 0064, same reasoning as every other migration
 * text-pin test in this package: no live Postgres in this environment, so this pins the
 * migration's own SQL text rather than exercising a real insert. See
 * docs/research/verification/insert-forgery-inventory-2026-08-22.md for the live
 * confirmation this migration fixes (QA account B filed a report on a real message sent
 * by QA account A, naming an unrelated user as reported_user_id -- accepted with no
 * error, reverted, independently re-verified reverted).
 */

const MIGRATION = readFileSync(
  join(import.meta.dirname, "..", "..", "supabase", "migrations", "0064_message_reports_verify_reported_user.sql"),
  "utf8"
);
const flat = MIGRATION.replace(/\s+/g, " ");

describe("message_reports 'create own report' policy", () => {
  test("still requires reporter_id = auth.uid()", () => {
    expect(flat).toContain("reporter_id = auth.uid()");
  });

  test("cross-checks reported_user_id against the referenced message's real sender", () => {
    expect(flat).toContain("reported_user_id = (select sender_id from public.messages where id = message_id)");
  });

  test("leaves a null message_id unconstrained -- no current legitimate path inserts one, so this doesn't invent a new restriction", () => {
    expect(flat).toContain("message_id is null");
  });

  test("drops and recreates the policy rather than leaving the old, unguarded version alongside it", () => {
    expect(flat).toContain('drop policy if exists "create own report" on public.message_reports');
    const dropIndex = flat.indexOf('drop policy if exists "create own report"');
    const createIndex = flat.indexOf('create policy "create own report"');
    expect(createIndex).toBeGreaterThan(dropIndex);
  });

  test("the migration announces it is not applied", () => {
    expect(MIGRATION).toContain("WRITTEN BUT NOT APPLIED");
  });
});
