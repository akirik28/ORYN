import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract test for migration 0064, same reasoning as every other migration
 * text-pin test in this package: no live Postgres in this environment, so this pins the
 * migration's own SQL text rather than exercising a real insert. See
 * docs/research/verification/rls-live-verification-2026-08-22.md for the live
 * confirmation of the message-branch gap this migration fixes, and this file's own
 * amendment history for the recommendation-branch gap ORYN-CEO caught in the first
 * version before it was ever applied: `message_reports` has TWO reference columns
 * (message_id, recommendation_id -- migration 0035), and the first version of this
 * migration only closed the first one. reportRecommendation()
 * (app/(app)/u/[id]/recommendation-actions.ts) inserts with recommendation_id set and
 * message_id null -- exactly the shape the message_id-only version left unconstrained.
 * These tests cover both branches, not just the one first found.
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

  test("message branch: cross-checks reported_user_id against the referenced message's real sender, only when message_id is actually set", () => {
    expect(flat).toContain("message_id is not null");
    expect(flat).toContain("reported_user_id = (select sender_id from public.messages where id = message_id)");
  });

  test("recommendation branch: cross-checks reported_user_id against the referenced recommendation's real author, only when recommendation_id is actually set", () => {
    expect(flat).toContain("recommendation_id is not null");
    expect(flat).toContain("reported_user_id = (select author_id from public.recommendations where id = recommendation_id)");
  });

  test("the two branches are OR'd -- a report needs at least one correctly-attributed reference, not both", () => {
    const checkStart = flat.indexOf("for insert with check (");
    const checkBody = flat.slice(checkStart);
    // The message branch and recommendation branch must be joined by "or", not "and" --
    // reportMessage/reportRecommendation never supply both columns in one insert.
    const messageBranchIndex = checkBody.indexOf("message_id is not null");
    const orIndex = checkBody.indexOf(") or (", messageBranchIndex);
    const recommendationBranchIndex = checkBody.indexOf("recommendation_id is not null");
    expect(orIndex).toBeGreaterThan(messageBranchIndex);
    expect(recommendationBranchIndex).toBeGreaterThan(orIndex);
  });

  test("no longer has a bare, unconstrained 'message_id is null' escape hatch -- the old version's actual defect", () => {
    // The old (first-version) shape was `... or (message_id is null)` -- an
    // unconditional pass with no attribution check at all whenever message_id was
    // absent, which is exactly the branch reportRecommendation()'s real inserts hit
    // every single time. That literal string must not reappear.
    expect(flat).not.toContain("or message_id is null");
    expect(flat).not.toMatch(/\bmessage_id is null\s*\)?\s*$/);
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

  test("documents the amendment -- the recommendation-branch gap the first version missed -- rather than silently rewriting history", () => {
    expect(MIGRATION).toContain("AMENDED before this migration was ever applied");
    expect(MIGRATION).toContain("recommendation_id");
  });
});

describe("recommendation-actions.ts's real insert shape, confirmed against the file rather than assumed", () => {
  const src = readFileSync(
    join(import.meta.dirname, "..", "..", "app", "(app)", "u", "[id]", "recommendation-actions.ts"),
    "utf8"
  );

  test("reportRecommendation sets recommendation_id and never sets message_id -- the exact shape the migration's second branch exists for", () => {
    const fnStart = src.indexOf("export async function reportRecommendation");
    const fnBody = src.slice(fnStart, src.indexOf("\n}", fnStart));
    expect(fnBody).toContain("recommendation_id: recommendationId");
    expect(fnBody).not.toContain("message_id:");
  });
});
