import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract tests for migration 0063, same reasoning as
 * __tests__/security/profiles-guard.test.ts: no live Postgres in this environment, so
 * these pin the migration's own SQL text rather than exercising a real trigger. See
 * docs/research/verification/rls-live-verification-2026-08-22.md for how each guarded
 * column was chosen and docs/known-issues.md for the named limits (INSERT-forgery,
 * ai_recommendations deliberately excluded).
 */

const MIGRATION = readFileSync(
  join(import.meta.dirname, "..", "..", "supabase", "migrations", "0063_guard_computed_score_columns.sql"),
  "utf8"
);
const flat = MIGRATION.replace(/\s+/g, " ");

function guardFnBody(fnName: string, nextMarker: string): string {
  const start = MIGRATION.indexOf(`function public.${fnName}`);
  const end = MIGRATION.indexOf(nextMarker, start);
  expect(start, `function public.${fnName} not found`).toBeGreaterThanOrEqual(0);
  expect(end, `end marker "${nextMarker}" not found after public.${fnName}`).toBeGreaterThan(start);
  return MIGRATION.slice(start, end);
}

describe("profiles_guard_protected_columns (re-declared, is_admin + the two score columns)", () => {
  const body = guardFnBody("profiles_guard_protected_columns", "drop trigger if exists profiles_00_guard_protected_columns");

  test("resets all three columns together, not raising", () => {
    expect(body).toContain("new.is_admin := old.is_admin;");
    expect(body).toContain("new.profile_strength_score := old.profile_strength_score;");
    expect(body).toContain("new.completeness_percent := old.completeness_percent;");
  });

  test("the trigger's OF clause names exactly these three columns", () => {
    expect(flat).toContain("before update of is_admin, profile_strength_score, completeness_percent on public.profiles");
  });
});

describe("profile_scores_guard_computed_columns", () => {
  const body = guardFnBody("profile_scores_guard_computed_columns", "drop trigger if exists profile_scores_00_guard_computed_columns");

  test("guards every computed column, leaves the identity column (dimension) alone", () => {
    for (const col of ["score", "confidence", "calculation_version", "reason_codes", "calculated_at"]) {
      expect(body, `expected ${col} to be reset`).toContain(`new.${col} := old.${col};`);
    }
    expect(body).not.toContain("new.dimension");
    expect(body).not.toContain("new.user_id");
  });
});

describe("profile_score_snapshots_guard_computed_columns", () => {
  const body = guardFnBody("profile_score_snapshots_guard_computed_columns", "drop trigger if exists profile_score_snapshots_00_guard_computed_columns");

  test("guards the fabricable narrative fields", () => {
    for (const col of ["overall_score", "dimension_scores", "score_version", "snapshot_reason"]) {
      expect(body, `expected ${col} to be reset`).toContain(`new.${col} := old.${col};`);
    }
  });

  test("the migration states this guard is close to inert for this table (INSERT-only, no UPDATE path)", () => {
    // Not a behavior assertion (nothing to execute here) -- a regression pin on the
    // documentation itself, so a future edit can't quietly drop the caveat and let this
    // table's guard read as complete when it structurally cannot be.
    expect(MIGRATION).toMatch(/profile_score_snapshots`, which has NO legitimate UPDATE path/);
  });
});

describe("opportunity_matches_guard_computed_columns", () => {
  const body = guardFnBody("opportunity_matches_guard_computed_columns", "drop trigger if exists opportunity_matches_00_guard_computed_columns");

  test("guards eligible and every other computed field", () => {
    for (const col of ["eligible", "eligibility_notes", "relevance_score", "profile_need_score", "match_score", "effort_estimate", "reason_codes", "calculated_at"]) {
      expect(body, `expected ${col} to be reset`).toContain(`new.${col} := old.${col};`);
    }
  });
});

describe("student_requirement_evaluations_guard_status", () => {
  const body = guardFnBody("student_requirement_evaluations_guard_status", "drop trigger if exists student_requirement_evaluations_00_guard_status");

  test("guards status only -- narrower than the other tables, per explicit scope", () => {
    expect(body).toContain("new.status := old.status;");
    expect(body).not.toContain("new.reasoning");
    expect(body).not.toContain("new.evaluated_at");
  });
});

describe("evidence_files_guard_verification_status", () => {
  const body = guardFnBody("evidence_files_guard_verification_status", "drop trigger if exists evidence_files_00_guard_verification_status");

  test("guards verification_status only", () => {
    expect(body).toContain("new.verification_status := old.verification_status;");
  });
});

describe("every guard function in this migration", () => {
  const fnNames = [
    "profiles_guard_protected_columns",
    "profile_scores_guard_computed_columns",
    "profile_score_snapshots_guard_computed_columns",
    "opportunity_matches_guard_computed_columns",
    "student_requirement_evaluations_guard_status",
    "evidence_files_guard_verification_status",
  ];

  test("resets, never raises -- every function body avoids 'raise'", () => {
    for (const name of fnNames) {
      const start = MIGRATION.indexOf(`function public.${name}`);
      const end = MIGRATION.indexOf("$$;", MIGRATION.indexOf("as $$", start));
      const body = MIGRATION.slice(start, end).toLowerCase();
      expect(body, `${name} should not raise`).not.toContain("raise ");
    }
  });

  test("every function pins search_path and qualifies pg_trigger_depth", () => {
    for (const name of fnNames) {
      const start = MIGRATION.indexOf(`function public.${name}`);
      const end = MIGRATION.indexOf("$$;", MIGRATION.indexOf("as $$", start));
      const body = MIGRATION.slice(start, end);
      expect(body, `${name} missing search_path pin`).toContain("set search_path = ''");
      expect(body, `${name} should call the qualified form`).toContain("pg_catalog.pg_trigger_depth() <= 1");
    }
  });

  test("every function checks current_user <> 'service_role' before resetting", () => {
    for (const name of fnNames) {
      const start = MIGRATION.indexOf(`function public.${name}`);
      const end = MIGRATION.indexOf("$$;", MIGRATION.indexOf("as $$", start));
      const body = MIGRATION.slice(start, end);
      expect(body, `${name} missing the service-role check`).toContain("current_user <> 'service_role'");
    }
  });
});

describe("ai_recommendations is deliberately absent from this migration", () => {
  test("no guard function exists for it, and the migration says why", () => {
    expect(MIGRATION).not.toContain("ai_recommendations_guard");
    expect(flat).toContain("ai_recommendations: deliberately NOT included");
  });
});

describe("the migration's header records its real applied status, not a stale one", () => {
  // Corrected 2026-09-02 (docs/migration-state.md): this file's header used to read
  // "WRITTEN BUT NOT APPLIED" unconditionally -- true when written, false by the time a
  // full replay-vs-live audit checked, and the file said the opposite of reality for some
  // stretch of that gap. The header now states it is APPLIED and quotes the old language
  // verbatim as history, which is why both assertions below still find their old strings
  // present -- inside a quote, not as a live claim. Pinning that distinction explicitly
  // rather than just re-asserting substring presence, which would pass either way.
  test("header states it is applied, not that it's still pending", () => {
    expect(MIGRATION).toContain("STATUS, corrected 2026-09-02");
    expect(MIGRATION).toContain("APPLIED, in full");
  });

  test("quotes the original 'not applied' language as history, inside the correction, not as a live claim", () => {
    const correctionIndex = MIGRATION.indexOf("STATUS, corrected 2026-09-02");
    expect(correctionIndex).toBeGreaterThanOrEqual(0);
    const correctionBlock = MIGRATION.slice(correctionIndex);
    expect(correctionBlock).toContain('"WRITTEN BUT NOT APPLIED');
  });

  test("still documents its relationship to migration 0062", () => {
    expect(MIGRATION).toContain("Requires migration 0062");
  });
});

describe("opportunity_matches_guard_computed_columns (extended by migration 0086)", () => {
  // Same reasoning as the 0063 tests above (no live Postgres in this environment) --
  // pins 0086's own re-declared CREATE OR REPLACE FUNCTION, which restates the full
  // protected-column list rather than only the newly added one (see that migration's
  // own header comment for why a bare recreation would risk silently narrowing what's
  // guarded if this file were ever read in isolation from 0063).
  const MIGRATION_0086 = readFileSync(
    join(import.meta.dirname, "..", "..", "supabase", "migrations", "0086_opportunity_match_confidence.sql"),
    "utf8"
  );

  function body0086(fnName: string, nextMarker: string): string {
    const start = MIGRATION_0086.indexOf(`function public.${fnName}`);
    const end = MIGRATION_0086.indexOf(nextMarker, start);
    expect(start, `function public.${fnName} not found in 0086`).toBeGreaterThanOrEqual(0);
    expect(end, `end marker "${nextMarker}" not found after public.${fnName} in 0086`).toBeGreaterThan(start);
    return MIGRATION_0086.slice(start, end);
  }

  test("re-declares the guard to reset match_confidence alongside every pre-existing computed column", () => {
    const guarded = body0086("opportunity_matches_guard_computed_columns", "drop trigger if exists opportunity_matches_00_guard_computed_columns");
    for (const col of ["eligible", "eligibility_notes", "relevance_score", "profile_need_score", "match_score", "effort_estimate", "reason_codes", "calculated_at", "match_confidence"]) {
      expect(guarded, `expected ${col} to be reset`).toContain(`new.${col} := old.${col};`);
    }
  });

  test("the trigger's OF clause names match_confidence, not just the pre-existing columns", () => {
    const flat0086 = MIGRATION_0086.replace(/\s+/g, " ");
    expect(flat0086).toContain(
      "before update of eligible, eligibility_notes, relevance_score, profile_need_score, match_score, effort_estimate, reason_codes, calculated_at, match_confidence on public.opportunity_matches"
    );
  });

  test("match_confidence is constrained to the five real EvidenceState values or null", () => {
    for (const state of ["not_assessed", "limited_evidence", "emerging", "developing", "strong"]) {
      expect(MIGRATION_0086, `expected the check constraint to name ${state}`).toContain(state);
    }
  });
});
