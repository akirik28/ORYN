import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Source-text pin for how recomputeCareerProfile wires the profile_update notification —
 * same approach recompute-admin-degradation.test.ts already uses for this exact function
 * and for the same reason (createClient() is request-scoped; driving this function for
 * real needs a live authenticated Supabase session this environment doesn't have). The
 * actual decision logic (threshold, aggregation, milestones) is behaviorally tested in
 * profile-update-notification.test.ts, which needs no Supabase at all — this file is
 * scoped to confirming the two things that test can't reach: where the call sits relative
 * to the snapshot write, and the onboarding exclusion.
 */

const SRC = readFileSync(join(import.meta.dirname, "..", "..", "lib", "scoring", "persist.ts"), "utf8");

describe("recomputeCareerProfile's profile_update notification wiring", () => {
  test("the notification call happens after the snapshot write, not before or in parallel with it", () => {
    const snapshotWriteIndex = SRC.indexOf('admin.from("profile_score_snapshots").insert(');
    const notificationCallIndex = SRC.indexOf("await createNotification({");
    expect(snapshotWriteIndex).toBeGreaterThan(0);
    expect(notificationCallIndex).toBeGreaterThan(snapshotWriteIndex);
  });

  test("skipped specifically for onboarding_completed, not for every snapshotReason", () => {
    const guardIndex = SRC.indexOf('opts?.snapshotReason !== "onboarding_completed"');
    expect(guardIndex).toBeGreaterThan(0);
    // Not a blanket `!opts?.snapshotReason` -- cv_import and the reason-less default path
    // (ordinary achievement/skill/language edits) must still be eligible to notify.
    expect(SRC).not.toMatch(/if \(!opts\?\.snapshotReason\)/);
  });

  test("category is profile_update, matching the schema's own NotificationCategory value", () => {
    const notificationCallIndex = SRC.indexOf("await createNotification({");
    const callBlock = SRC.slice(notificationCallIndex, notificationCallIndex + 200);
    expect(callBlock).toContain('category: "profile_update"');
  });

  test("changedMeaningfully's widened OR-clause uses NOTIFIABLE_DIMENSION_DELTA, not a second, drifting threshold", () => {
    const changedMeaningfullyIndex = SRC.indexOf("const changedMeaningfully =");
    const nextBlock = SRC.slice(changedMeaningfullyIndex, changedMeaningfullyIndex + 500);
    expect(nextBlock).toContain("NOTIFIABLE_DIMENSION_DELTA");
    expect(nextBlock).toContain("dimensionChange.improved.some(");
    expect(nextBlock).toContain("dimensionChange.declined.some(");
  });

  test("the previous-snapshot read stays on the RLS-scoped `supabase` client, matching every other read in this function", () => {
    const readIndex = SRC.indexOf('supabase.from("profile_score_snapshots")');
    expect(readIndex).toBeGreaterThan(0);
    expect(SRC).not.toContain('admin.from("profile_score_snapshots").select(');
  });
});

/**
 * 2026-09-02 progress/history audit: live data showed one account with five identical
 * score-0 "onboarding_completed" snapshots minutes apart, traced to
 * `changedMeaningfully || opts?.snapshotReason` -- any caller passing an explicit reason
 * got a snapshot on every call, whether or not the score moved. Fixed by dropping the
 * `|| opts?.snapshotReason` bypass; `changedMeaningfully`'s own `previousScore === null`
 * branch already covers the genuine first-ever computation (profiles.profile_strength_score
 * defaults to null, confirmed live), so a real baseline snapshot is unaffected.
 */
describe("recomputeCareerProfile's snapshot-write condition (2026-09-02 fix)", () => {
  test("a snapshot is written only when changedMeaningfully is true -- the reason-based bypass is gone", () => {
    expect(SRC).toContain("if (changedMeaningfully) {");
    expect(SRC).not.toMatch(/if\s*\(\s*changedMeaningfully\s*\|\|\s*opts\?\.snapshotReason\s*\)/);
  });

  test("the write condition appears after changedMeaningfully is computed, not a second, separately-defined check", () => {
    const definitionIndex = SRC.indexOf("const changedMeaningfully =");
    const conditionIndex = SRC.indexOf("if (changedMeaningfully) {");
    expect(definitionIndex).toBeGreaterThan(0);
    expect(conditionIndex).toBeGreaterThan(definitionIndex);
  });

  test("snapshot_reason itself still falls through to the caller's explicit reason when a snapshot IS written -- only the write condition changed, not what gets stored", () => {
    expect(SRC).toContain('snapshot_reason: opts?.snapshotReason ?? "profile_updated"');
  });
});
