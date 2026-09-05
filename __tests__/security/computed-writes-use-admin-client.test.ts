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
    // 2026-09-02: opts?.adminClient (a scheduled job's own admin client) falls through to
    // tryCreateAdminClient() for every caller that doesn't pass one -- unchanged.
    expect(src).toContain("const admin = opts?.adminClient ?? tryCreateAdminClient();");
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

  test("every read (profiles, profile_scores, student_interests, opportunities, saved_opportunities, opportunity_matches) stays on `supabase` -- RLS-scoped for every real page-render caller, or an explicitly passed client for the one caller with no session -- never the module's own `admin`", () => {
    expect(src).toContain('supabase.from("profiles").select(');
    // profile_scores moved to the shared getProfileScores(userId) helper 2026-09-02
    // (docs/performance.md §2's fix) -- still RLS-scoped, just relocated: that helper
    // (lib/security/dal.ts) constructs its own createClient(), never an admin client. The
    // assertion below pins that it's the shared helper being called, not an inline query
    // this file could silently widen to admin later; lib/security/dal.ts's own source is
    // the actual guarantee, reviewed directly rather than re-pinned per call site.
    expect(src).toContain('import { getProfileScores } from "@/lib/security/dal";');
    expect(src).toContain("getProfileScores(userId)");
    // A second, conditional profile_scores read reappeared 2026-09-02 -- not a regression
    // of the line above, the fix for the client-threading bug this file's own header
    // doesn't yet mention (docs/performance.md §2, "getCounselorState calls
    // refreshOpportunityMatches with no client override"). getProfileScores can't serve
    // the no-session path (it builds its own session-cookie client internally too), so
    // that path falls back to a query on `supabase` -- this function's OWN resolved
    // client (`client ?? await createClient()`), same variable as every other read here,
    // never a second, separate admin client of its own. The exact conditional this
    // pins -- present only when guarded by `client ?`, never bare -- is what makes this a
    // widened *fallback*, not a widened *default*.
    expect(src).toContain('client ? supabase.from("profile_scores")');
    expect(src).not.toContain('admin.from("profile_scores").select(');
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
    // Moved to the shared getUniversityRequirements(universityId) helper 2026-09-02
    // (docs/performance.md §5, closing a duplicate read against the university detail
    // page's own identical query) -- it constructs its own createClient() internally
    // (lib/universities/detail-reads.ts), the same RLS-scoped client this file used to
    // construct directly, never an admin client. Same underlying property, new call shape.
    expect(src).toContain('import { getUniversityRequirements } from "@/lib/universities/detail-reads";');
    expect(src).toContain('getUniversityRequirements(universityId)');
    expect(src).not.toContain('admin.from("university_requirements")');
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

  test("the ownership check, storage upload, and deleteEvidence all stay RLS-scoped", () => {
    expect(src).toContain("supabase.from(linkedTable).select(");
    expect(src).toContain('supabase.storage.from("evidence").upload(');
    expect(src).toContain('supabase.from("evidence_files").select("*")');
    expect(src).toContain('supabase.from("evidence_files").delete()');
  });

  // 2026-09-05 (docs/permissive-update-policy-sweep-2026-09-04.md §2): the evidence_status
  // update moved from `supabase` to `admin` -- unlike evidence_files' own verification_status
  // (guarded at row-creation time, no legitimate UPDATE path at all, see migration 0063's own
  // header), these ten tables' evidence_status IS updated after row creation, by this exact
  // call, on the caller's own RLS-scoped session -- which is precisely what let a student PATCH
  // their own evidence_status straight to "verified" directly, bypassing this fixed-literal
  // write entirely. The assertion above no longer covers this line; this file's own established
  // convention for every other guarded table (a matching "uses admin" + "no write ... still
  // uses the RLS-scoped client" pair) applies here too, not a special exception.
  test("the evidence_status update uses admin, not supabase", () => {
    expect(src).toContain('await admin.from(linkedTable).update({ evidence_status:');
  });

  test("no evidence_status write still uses the RLS-scoped client", () => {
    expect(src).not.toMatch(/supabase\.from\(linkedTable\)\.update\(\{ evidence_status:/);
  });

  test("returns a clear error rather than throwing when the admin client is unavailable", () => {
    expect(src).toContain("if (!admin) {");
    // 2026-09-03, student-facing i18n audit: the English text moved to the second branch
    // of a `tr ? ... : "..."` ternary (still a `return { error: ... }`, never a throw) --
    // matched here without pinning its exact position in the ternary, since that position
    // is an i18n implementation detail, not the security property this test exists to guard.
    expect(src).toMatch(/return \{ error: [^}]*Evidence upload is temporarily unavailable/);
  });
});

// 2026-09-05 (docs/permissive-update-policy-sweep-2026-09-04.md §1): new to this file --
// target_universities' 8 admission-outlook columns had no guard trigger and no admin-client
// writer at all before today, unlike the five files above (all already paired with a guard
// migration by the time this file was first written). See
// __tests__/admissions/persist-write-uses-admin-client.test.ts for the behavioral proof (the
// actual client-selection logic, mocked end to end); this block is the same fast text-pin
// convention as every other describe block above, so a future edit that quietly reverts this
// write back onto the request-scoped client fails immediately, without needing to run the
// heavier behavioral test to notice.
describe("lib/admissions/persist.ts", () => {
  const src = read("lib/admissions/persist.ts");

  test("imports tryCreateAdminClient", () => {
    expect(src).toContain('import { tryCreateAdminClient } from "@/lib/supabase/admin";');
  });

  test("the target_universities outlook update uses a service-role-resolved client, not the request-scoped `supabase`", () => {
    expect(src).toContain("const writeClient = client ?? tryCreateAdminClient();");
    expect(src).toContain('await writeClient\n    .from("target_universities")\n    .update({');
  });

  // 2026-09-05, CEO's own catch: RLS enforced ownership on this write for free before today;
  // once it moved to writeClient (which can be the admin client), that guarantee is gone
  // unless the query's own WHERE clause carries it. See docs/evidence-status-and-target-
  // universities-rls-guard-proof-2026-09-05.md Part 3 for the real-Postgres proof that an
  // id-only filter would let a service-role write touch the wrong owner's row, and that
  // adding user_id back closes it.
  test("the outlook update's own WHERE clause is scoped by user_id, not just id -- load-bearing now that RLS no longer covers this write", () => {
    expect(src).toContain('.eq("id", targetUniversityId)\n    .eq("user_id", userId);');
  });

  test("no write to target_universities' outlook columns still uses the RLS-scoped `supabase` directly", () => {
    expect(src).not.toMatch(/supabase\s*\n?\s*\.from\("target_universities"\)\s*\n?\s*\.update\(/);
  });

  test("every read (target_universities' own id lookup, profiles, profile_scores, university_statistics, universities, university_programs) stays on whichever client the caller resolved -- never a second, separate admin client of its own for reads", () => {
    expect(src).toContain('supabase\n    .from("target_universities")\n    .select(');
    expect(src).not.toMatch(/admin\.from\("profiles"\)/);
    expect(src).not.toMatch(/admin\.from\("profile_scores"\)/);
    expect(src).not.toMatch(/admin\.from\("university_statistics"\)/);
    expect(src).not.toMatch(/admin\.from\("universities"\)/);
    expect(src).not.toMatch(/admin\.from\("university_programs"\)/);
  });

  test("degrades with a log, not a throw, when no admin client is available and no explicit client was passed", () => {
    expect(src).toContain("if (!writeClient) {");
    expect(src).toContain("admin client unavailable");
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
