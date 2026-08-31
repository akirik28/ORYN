import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract tests for migration 0072 — same reasoning as
 * __tests__/social/posts-schema.test.ts: there is no live Postgres in this environment
 * (see supabase/tests/*_manual.sql), so the guarantees this migration exists to provide —
 * that a birth_year change can never happen without a row appearing, that the log can't be
 * read or written by a normal client, that the trigger fires on the right column and
 * nothing else — are pinned by reading the SQL text rather than exercised live. Every
 * assertion below is about a clause someone might reasonably "simplify" without realizing
 * it was load-bearing for detectability.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "supabase", "migrations");
const MIGRATION = readFileSync(join(MIGRATIONS_DIR, "0072_birth_year_change_audit.sql"), "utf8");
const flat = MIGRATION.replace(/\s+/g, " ");

describe("birth_year_changes: the log itself", () => {
  test("previous_value and new_value are both nullable — a change to/from null must stay representable", () => {
    // updateBirthYear() accepts `number | null` (a student can clear their birth year).
    // If either column were `not null`, that exact case — the one where an account that
    // once looked like a minor stops declaring an age at all — would be unloggable.
    expect(flat).not.toMatch(/previous_value integer not null/);
    expect(flat).not.toMatch(/new_value integer not null/);
  });

  test("user_id cascades on account deletion, consistent with every other owner table", () => {
    expect(flat).toContain("user_id uuid not null references public.profiles(id) on delete cascade");
  });

  test("RLS is enabled with no policies — not even a select-own one", () => {
    expect(flat).toContain("alter table public.birth_year_changes enable row level security");
    // No "create policy ... on public.birth_year_changes" anywhere. Whether a student
    // should ever see this log is a product decision this migration deliberately isn't
    // making — asserted as an absence, the same shape as posts-schema.test's checks for a
    // missing default or a missing grant.
    // [^;]* already spans newlines on its own (it's a negated class, not `.`), so no
    // dotAll flag is needed — this project's ES target doesn't support the `s` flag.
    expect(MIGRATION).not.toMatch(/create policy[^;]*on public\.birth_year_changes/i);
  });

  test("no INSERT type / policy is implied — the trigger is documented as the only writer", () => {
    expect(MIGRATION).toContain("no application code inserts here directly");
  });
});

describe("birth_year_changes: the trigger", () => {
  test("fires on UPDATE OF birth_year specifically, not a blanket UPDATE on profiles", () => {
    // A blanket trigger would fire (and pay the IS DISTINCT FROM check) on every unrelated
    // profile edit — display name, school, curriculum — none of which this table is about.
    expect(flat).toContain("after update of birth_year on public.profiles");
    expect(flat).not.toMatch(/after update on public\.profiles\s+for each row execute function public\.log_birth_year_change/);
  });

  test("compares old and new with IS DISTINCT FROM, not != or <>", () => {
    // A plain `!=`/`<>` never evaluates true when either side is null in Postgres, so
    // "birth year set for the very first time" (old is null) would silently never log —
    // exactly the onboarding case this migration exists to cover.
    expect(flat).toContain("new.birth_year is distinct from old.birth_year");
  });

  test("copies terms_accepted_at from the row at the moment of the change, not from a lookup", () => {
    expect(flat).toContain("new.terms_accepted_at)");
  });
});

describe("profiles.terms_accepted_at", () => {
  test("handle_new_user() is replaced (create or replace), not duplicated as a second trigger function", () => {
    expect(flat).toContain("create or replace function public.handle_new_user()");
    // Exactly one CREATE TRIGGER for on_auth_user_created across the whole migration set
    // would be the real guarantee; scoped here to confirming this migration doesn't add a
    // second one itself.
    expect(MIGRATION.match(/create trigger on_auth_user_created/g) ?? []).toHaveLength(0);
  });

  test("the backfill only fills rows that are still null — never overwrites an existing value", () => {
    expect(flat).toContain("and p.terms_accepted_at is null");
  });

  test("the backfill sources from auth.users' raw_user_meta_data, the same field signUp() writes", () => {
    expect(flat).toContain("u.raw_user_meta_data ->> 'terms_accepted_at'");
  });
});
