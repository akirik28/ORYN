import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract tests for migration 0065, same reasoning as
 * __tests__/security/computed-columns-guard.test.ts: no live Postgres in this
 * environment, so these pin the migration's own SQL text rather than exercising a real
 * policy. See docs/handoffs/insert-forgery-design-proposal-2026-08-22.md for the
 * design reasoning and docs/research/verification/insert-forgery-inventory-2026-08-22.md
 * for how each table's gap was originally found.
 */

const MIGRATION = readFileSync(
  join(import.meta.dirname, "..", "..", "supabase", "migrations", "0065_close_insert_forgery_six_tables.sql"),
  "utf8"
);
// Strips each line's leading `-- ` comment marker before collapsing whitespace --
// otherwise a phrase wrapped across two comment lines picks up a literal "-- " in the
// middle once newlines collapse to spaces (the marker survives; only whitespace does
// not), and a `toContain`/`toMatch` assertion on that phrase fails for a reason that
// has nothing to do with the migration's actual content.
const flat = MIGRATION.split("\n")
  .map((line) => line.replace(/^\s*--\s?/, ""))
  .join(" ")
  .replace(/\s+/g, " ");

const TABLES = [
  "profile_scores",
  "profile_score_snapshots",
  "opportunity_matches",
  "student_requirement_evaluations",
  "evidence_files",
  "ai_recommendations",
] as const;

describe.each(TABLES)("%s", (table) => {
  test("drops the old bundled owner-full-access policy", () => {
    expect(flat).toContain(`drop policy if exists "owner full access" on public.${table};`);
  });

  test("select stays owner-scoped, unchanged in substance", () => {
    expect(flat).toContain(`create policy "select own ${table}" on public.${table} for select using (user_id = auth.uid());`);
  });

  test("update stays owner-scoped with both using and with check, unchanged in substance", () => {
    expect(flat).toContain(
      `create policy "update own ${table}" on public.${table} for update using (user_id = auth.uid()) with check (user_id = auth.uid());`
    );
  });

  test("delete stays owner-scoped, unchanged in substance", () => {
    expect(flat).toContain(`create policy "delete own ${table}" on public.${table} for delete using (user_id = auth.uid());`);
  });

  test("no insert policy exists for this table anywhere in the migration", () => {
    const insertPolicyForTable = new RegExp(`create policy "[^"]+" on public\\.${table} for insert`);
    expect(insertPolicyForTable.test(MIGRATION)).toBe(false);
  });
});

describe("the mechanism is a policy split, not a layered addition", () => {
  test("no create policy statement anywhere in this migration grants INSERT to anyone", () => {
    // Strict pattern (not a plain string search) so this can't be fooled by the header's
    // own prose discussing the rejected "layer a service-role policy on top" approach,
    // which uses "..." rather than a real "on public.<table>" clause.
    const anyInsertPolicy = /create policy "[^"]+" on public\.\w+\s+for insert/;
    expect(anyInsertPolicy.test(MIGRATION)).toBe(false);
  });

  test("no create policy statement anywhere in this migration uses for all", () => {
    const anyForAllPolicy = /create policy "[^"]+" on public\.\w+\s+for all/;
    expect(anyForAllPolicy.test(MIGRATION)).toBe(false);
  });

  test("every table gets exactly three new policies (select, update, delete) -- 18 create policy statements total", () => {
    const createPolicyCount = (MIGRATION.match(/^create policy /gm) ?? []).length;
    expect(createPolicyCount).toBe(TABLES.length * 3);
  });

  test("every table gets exactly one drop policy statement", () => {
    const dropPolicyCount = (MIGRATION.match(/^drop policy if exists "owner full access"/gm) ?? []).length;
    expect(dropPolicyCount).toBe(TABLES.length);
  });

  test("the header documents why layering a new policy on top would not work (permissive policies OR together)", () => {
    expect(flat).toMatch(/Postgres evaluates multiple PERMISSIVE policies for the same command with OR, not\s*AND/);
  });

  test("the header names this as the same defect shape as the message_reports gap (migration 0064)", () => {
    expect(flat).toContain("the exact defect shape as the message_reports gap this same");
  });

  test("the header names profiles as the existing precedent for 'no insert policy at all'", () => {
    expect(flat).toContain("the exact shape `profiles`");
  });
});

describe("ai_recommendations is included, reversing its prior deferred status", () => {
  test("the header explains why, rather than silently changing scope", () => {
    expect(flat).toContain("separate, undecided design question");
    expect(flat).toContain("Folded into this migration on that basis");
  });
});

describe("the paired code change is documented as required, not optional", () => {
  test("names both files that must move to the admin client in the same PR", () => {
    expect(MIGRATION).toContain("app/(app)/documents/actions.ts's");
    expect(MIGRATION).toContain("lib/plan/persist.ts's");
  });

  test("states the ordering hazard explicitly", () => {
    expect(flat).toContain("Landing the RLS restriction without this code change, or in the wrong order, breaks");
  });
});

describe("what this migration does not close is named, not left implicit", () => {
  test("historical rows are not retroactively validated", () => {
    expect(flat).toContain("rows already inserted");
    expect(flat).toContain("not retroactively validated");
  });

  test("references the cohort cross-user finding", () => {
    expect(MIGRATION).toContain("lib/benchmarking/cohort.ts");
  });
});

describe("the migration announces it is not applied", () => {
  test("header states the standing constraint", () => {
    expect(MIGRATION).toContain("WRITTEN BUT NOT APPLIED");
  });

  test("names itself as the sixth item alongside 0060-0064", () => {
    expect(flat).toContain("alongside 0060-0064");
  });
});
