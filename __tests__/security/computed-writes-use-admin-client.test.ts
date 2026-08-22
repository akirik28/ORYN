import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression pin for the paired code change migration 0063 depends on: the guard
 * triggers only work because these three functions' specific writes moved from the
 * caller's RLS-scoped client to the admin client. No live Supabase in this test
 * environment, so this pins the source text -- the same reasoning as every migration
 * text-pin test in this repo, applied to TypeScript instead of SQL. A future edit that
 * quietly reverts one of these writes back to `supabase` re-opens the exact hole
 * docs/research/verification/rls-live-verification-2026-08-22.md documents, silently:
 * the guard trigger would then reset the write on every legitimate call too, the same
 * failure class migration 0062's own self-correction caught before it shipped.
 */

function read(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("lib/scoring/persist.ts", () => {
  const src = read("lib/scoring/persist.ts");

  test("imports and constructs the admin client", () => {
    expect(src).toContain('import { createAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = createAdminClient();");
  });

  test("all three guarded writes use admin, not supabase", () => {
    expect(src).toContain('await admin.from("profile_scores").upsert(');
    expect(src).toContain('await admin\n    .from("profiles")\n    .update({ profile_strength_score:');
    expect(src).toContain('await admin.from("profile_score_snapshots").insert(');
  });

  test("no write to these tables still uses the RLS-scoped client", () => {
    expect(src).not.toContain('supabase.from("profile_scores")');
    expect(src).not.toContain('supabase\n    .from("profiles")\n    .update({ profile_strength_score:');
    expect(src).not.toContain('supabase.from("profile_score_snapshots")');
  });

  test("reads stay on the RLS-scoped client -- widening a client to fix a write must not widen what it reads", () => {
    expect(src).toContain('supabase.from("profiles").select(');
    expect(src).toContain('supabase.from("skills").select(');
    expect(src).toContain('supabase.from("featured_items").select(');
    expect(src).toContain('supabase.from("contact_info").select(');
  });
});

describe("lib/opportunities/persist-matches.ts", () => {
  const src = read("lib/opportunities/persist-matches.ts");

  test("imports and constructs the admin client", () => {
    expect(src).toContain('import { createAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = createAdminClient();");
  });

  test("the opportunity_matches upsert uses admin", () => {
    expect(src).toContain('await admin.from("opportunity_matches").upsert(rows,');
  });

  test("no write to opportunity_matches still uses the RLS-scoped client", () => {
    expect(src).not.toContain('supabase.from("opportunity_matches")');
  });

  test("every read (profiles, profile_scores, student_interests, opportunities, saved_opportunities) stays RLS-scoped", () => {
    expect(src).toContain('supabase.from("profiles").select(');
    expect(src).toContain('supabase.from("profile_scores").select(');
    expect(src).toContain('supabase.from("student_interests").select(');
    expect(src).toContain('.from("opportunities")\n      .select(');
    expect(src).toContain('supabase.from("saved_opportunities").select(');
  });
});

describe("lib/requirements/persist.ts", () => {
  const src = read("lib/requirements/persist.ts");

  test("imports and constructs the admin client", () => {
    expect(src).toContain('import { createAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = createAdminClient();");
  });

  test("the student_requirement_evaluations upsert uses admin", () => {
    expect(src).toContain('await admin.from("student_requirement_evaluations").upsert(rows,');
  });

  test("no write to student_requirement_evaluations still uses the RLS-scoped client", () => {
    expect(src).not.toContain('supabase.from("student_requirement_evaluations")');
  });

  test("reading university_requirements stays RLS-scoped -- that table's own authenticated-read policy is the correct gate", () => {
    expect(src).toContain('supabase.from("university_requirements").select(');
  });

  test("the file's own header comment no longer claims no admin client is needed", () => {
    expect(src).not.toContain("no admin client needed for either");
  });
});
