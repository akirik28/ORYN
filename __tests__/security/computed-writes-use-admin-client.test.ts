import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression pin for the paired code change migrations 0063 and 0065 depend on: the
 * guard triggers (0063) and the removed INSERT policy (0065) only work because these
 * five functions' specific writes moved from the caller's RLS-scoped client to the
 * admin client. No live Supabase in this test environment, so this pins the source
 * text -- the same reasoning as every migration text-pin test in this repo, applied to
 * TypeScript instead of SQL. A future edit that quietly reverts one of these writes
 * back to `supabase` re-opens the exact hole
 * docs/research/verification/rls-live-verification-2026-08-22.md documents for 0063's
 * three tables (the guard trigger would reset the write on every legitimate call too,
 * the same failure class migration 0062's own self-correction caught before it
 * shipped) -- and for 0065's two tables, breaks the write outright, since there would
 * be no INSERT policy left permitting it at all.
 */

function read(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("lib/scoring/persist.ts", () => {
  const src = read("lib/scoring/persist.ts");

  test("imports and constructs the admin client (tryCreateAdminClient, not the throwing createAdminClient -- see __tests__/opportunities/refresh-matches-admin-degradation.test.ts and __tests__/scoring/recompute-admin-degradation.test.ts for why)", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = tryCreateAdminClient();");
  });

  test("all three guarded writes use admin, not supabase", () => {
    expect(src).toContain('await admin.from("profile_scores").upsert(');
    expect(src).toContain('await admin\n    .from("profiles")\n    .update({ profile_strength_score:');
    expect(src).toContain('await admin.from("profile_score_snapshots").insert(');
  });

  test("no write to these tables still uses the RLS-scoped client", () => {
    expect(src).not.toContain('supabase.from("profile_scores")');
    expect(src).not.toContain('supabase\n    .from("profiles")\n    .update({ profile_strength_score:');
    // profile_score_snapshots gained a legitimate RLS-scoped READ 2026-09-02 (the
    // profile_update notification's own previous-snapshot lookup, same client the
    // dashboard already uses for this exact table) -- narrowed from "no mention of
    // supabase+this table at all" to "no WRITE", the same shape the opportunity_matches
    // assertion below already uses for the identical read-vs-write distinction.
    expect(src).not.toMatch(/supabase\.from\("profile_score_snapshots"\)\.(upsert|insert|update|delete)\(/);
  });

  test("reads stay on the RLS-scoped client -- widening a client to fix a write must not widen what it reads", () => {
    // Reformatted onto multiple lines 2026-09-02 (profile_update notifications added
    // completeness_percent/preferred_language to this select) -- same multi-line match
    // shape this file already uses for the admin.from("profiles").update(...) assertion
    // above, applied here for the same reason (a longer call no longer fits one line).
    expect(src).toContain('supabase\n      .from("profiles")\n      .select(');
    expect(src).toContain('supabase.from("skills").select(');
    expect(src).toContain('supabase.from("featured_items").select(');
    expect(src).toContain('supabase.from("contact_info").select(');
    // The profile_update notification's own read, added in the same package -- also
    // RLS-scoped, not admin (see this function's own comment on why).
    expect(src).toContain('supabase.from("profile_score_snapshots").select(');
  });
});

describe("lib/opportunities/persist-matches.ts", () => {
  const src = read("lib/opportunities/persist-matches.ts");

  test("imports and constructs the admin client (tryCreateAdminClient, not the throwing createAdminClient -- see __tests__/opportunities/refresh-matches-admin-degradation.test.ts and __tests__/scoring/recompute-admin-degradation.test.ts for why)", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = tryCreateAdminClient();");
  });

  test("the opportunity_matches upsert uses admin", () => {
    expect(src).toContain('await admin.from("opportunity_matches").upsert(rows,');
  });

  test("no write to opportunity_matches uses the RLS-scoped client -- only a read (migration 0065 explicitly grants 'select own opportunity_matches'; the notify-new-matches diff added 2026-09-01 reads its own previous state the same RLS-scoped way lib/opportunities/browse.ts already does elsewhere)", () => {
    expect(src).toContain('supabase.from("opportunity_matches").select(');
    expect(src).not.toMatch(/supabase\.from\("opportunity_matches"\)\.(upsert|insert|update|delete)\(/);
  });

  test("every read (profiles, profile_scores, student_interests, opportunities, saved_opportunities, opportunity_matches) stays RLS-scoped", () => {
    expect(src).toContain('supabase.from("profiles").select(');
    expect(src).toContain('supabase.from("profile_scores").select(');
    expect(src).toContain('supabase.from("student_interests").select(');
    expect(src).toContain('.from("opportunities")\n      .select(');
    expect(src).toContain('supabase.from("saved_opportunities").select(');
    expect(src).toContain('supabase.from("opportunity_matches").select(');
  });
});

describe("lib/requirements/persist.ts", () => {
  const src = read("lib/requirements/persist.ts");

  test("imports and constructs the admin client (tryCreateAdminClient, not the throwing createAdminClient -- see __tests__/opportunities/refresh-matches-admin-degradation.test.ts and __tests__/scoring/recompute-admin-degradation.test.ts for why)", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = tryCreateAdminClient();");
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

describe("app/(app)/documents/actions.ts", () => {
  const src = read("app/(app)/documents/actions.ts");

  test("imports and constructs the admin client (tryCreateAdminClient, so a missing secret degrades to a clear error rather than a thrown 500)", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
    expect(src).toContain("const admin = tryCreateAdminClient();");
  });

  test("the evidence_files insert uses admin", () => {
    expect(src).toContain('await admin.from("evidence_files").insert({');
  });

  test("no write to evidence_files still uses the RLS-scoped client", () => {
    expect(src).not.toContain('supabase.from("evidence_files").insert(');
  });

  test("the ownership check, storage upload, evidence_status update, and deleteEvidence all stay RLS-scoped", () => {
    expect(src).toContain("supabase.from(linkedTable).select(");
    expect(src).toContain('supabase.storage.from("evidence").upload(');
    expect(src).toContain("supabase.from(linkedTable).update({ evidence_status:");
    expect(src).toContain('supabase.from("evidence_files").select("*")');
    expect(src).toContain('supabase.from("evidence_files").delete()');
  });

  test("returns a clear error rather than throwing when the admin client is unavailable", () => {
    expect(src).toContain("if (!admin) {");
    expect(src).toMatch(/return \{ error: ["'`]Evidence upload is temporarily unavailable/);
  });
});

describe("lib/plan/persist.ts", () => {
  const src = read("lib/plan/persist.ts");

  test("imports tryCreateAdminClient", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
  });

  test("the ai_recommendations insert uses admin, constructed inside the avoidForNow branch", () => {
    expect(src).toContain("const admin = tryCreateAdminClient();");
    expect(src).toContain('await admin.from("ai_recommendations").insert({');
  });

  test("no write to ai_recommendations still uses the RLS-scoped client", () => {
    expect(src).not.toContain('supabase.from("ai_recommendations")');
  });

  test("skips the write with a log rather than failing the whole weekly plan when the admin client is unavailable", () => {
    expect(src).toContain("[plan] SUPABASE_SECRET_KEY not configured");
  });

  test("weekly_plans and weekly_actions writes stay RLS-scoped -- only the one guarded table's writer moved", () => {
    expect(src).toContain('.from("weekly_plans")\n    .upsert(');
    expect(src).toContain('supabase.from("weekly_actions").delete()');
    expect(src).toContain('supabase.from("weekly_actions").insert(actionRows)');
  });
});
