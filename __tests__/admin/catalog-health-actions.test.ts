import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * The write path CEO explicitly approved to run against real live data
 * (docs/catalog-health-actions-design-2026-09-02.md) — the highest-stakes new code in this
 * branch, tested accordingly. Covers every outcome `applyContaminationCleanup`'s own doc
 * comment names: a clean apply, a guard miss (row changed since 2026-09-02), a write error,
 * and an audit-write failure *after* a real update — the one case that must still report
 * `applied: false` even though the description itself was actually saved, per that function's
 * own "fails toward re-checking a fine row, not toward an unrecorded real change" reasoning.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: vi.fn() }));

const { selectMock, maybeSingleMock, updateChainMock, likeMock, updateSelectMock, insertMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  updateChainMock: vi.fn(),
  likeMock: vi.fn(),
  updateSelectMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "opportunities") {
        return {
          // getContaminationCleanupPreview / the before-row read in applyContaminationCleanup
          select: (cols: string) => {
            if (cols === "description") {
              return { eq: () => ({ maybeSingle: maybeSingleMock }) };
            }
            throw new Error(`catalog-health-actions.test.ts: unexpected opportunities select "${cols}"`);
          },
          update: updateChainMock,
        };
      }
      if (table === "admin_actions") {
        return { insert: insertMock };
      }
      throw new Error(`catalog-health-actions.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { applyContaminationCleanup } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/security/require-admin";
import { CONTAMINATION_CLEANUP_2026_09_02 } from "@/lib/opportunities/contamination-cleanup-2026-09-02";

const ADMIN_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue({ id: ADMIN_ID } as never);
  selectMock.mockReset();
  maybeSingleMock.mockReset();
  updateChainMock.mockReset();
  likeMock.mockReset();
  updateSelectMock.mockReset();
  insertMock.mockReset();
  // update(...).eq(...).like(...).select(...) — the real chain applyContaminationCleanup calls.
  updateChainMock.mockImplementation(() => ({ eq: () => ({ like: likeMock }) }));
  likeMock.mockImplementation(() => ({ select: updateSelectMock }));
});

test("CONTAMINATION_CLEANUP_2026_09_02 sanity: 35 distinct, well-formed entries", () => {
  expect(CONTAMINATION_CLEANUP_2026_09_02).toHaveLength(35);
  const ids = CONTAMINATION_CLEANUP_2026_09_02.map((e) => e.id);
  expect(new Set(ids).size).toBe(35);
  for (const entry of CONTAMINATION_CLEANUP_2026_09_02) {
    expect(entry.newDescription.length).toBeGreaterThan(0);
    expect(entry.guardPrefix.length).toBeGreaterThan(0);
  }
});

describe("applyContaminationCleanup", () => {
  test("a clean apply: real update, audit row written, reports applied true, no reason", async () => {
    maybeSingleMock.mockResolvedValue({ data: { description: "old text" } });
    updateSelectMock.mockResolvedValue({ data: [{ id: "x" }], error: null });
    insertMock.mockResolvedValue({ error: null });

    const outcomes = await applyContaminationCleanup();

    expect(outcomes).toHaveLength(35);
    expect(outcomes.every((o) => o.applied === true)).toBe(true);
    expect(outcomes.every((o) => o.reason === undefined)).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(35);
    // Every audit row records the admin who did it and both the before and after text.
    const firstCall = insertMock.mock.calls[0][0];
    expect(firstCall).toMatchObject({
      admin_user_id: ADMIN_ID,
      action: "apply_description_cleanup",
      target_table: "opportunities",
      before_value: { description: "old text" },
    });
  });

  test("a guard miss (description changed since 2026-09-02) reports applied false, names the reason, writes no audit row", async () => {
    maybeSingleMock.mockResolvedValue({ data: { description: "old text" } });
    updateSelectMock.mockResolvedValue({ data: [], error: null }); // zero rows matched the guard
    insertMock.mockResolvedValue({ error: null });

    const outcomes = await applyContaminationCleanup();

    expect(outcomes.every((o) => o.applied === false)).toBe(true);
    expect(outcomes.every((o) => o.reason?.includes("changed since"))).toBe(true);
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("row not found at all (stale id) reports applied false with its own distinct reason, never attempts the update", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });

    const outcomes = await applyContaminationCleanup();

    expect(outcomes.every((o) => o.applied === false)).toBe(true);
    expect(outcomes.every((o) => o.reason?.includes("not found"))).toBe(true);
    expect(updateChainMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("a real write error reports applied false with a write-failure reason, not the guard-miss one", async () => {
    maybeSingleMock.mockResolvedValue({ data: { description: "old text" } });
    updateSelectMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const outcomes = await applyContaminationCleanup();

    expect(outcomes.every((o) => o.applied === false)).toBe(true);
    expect(outcomes.every((o) => o.reason?.includes("Write failed"))).toBe(true);
    expect(insertMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("update succeeds but the audit write fails: still reports applied false, names it as the audit failure specifically, not a silent success", async () => {
    maybeSingleMock.mockResolvedValue({ data: { description: "old text" } });
    updateSelectMock.mockResolvedValue({ data: [{ id: "x" }], error: null });
    insertMock.mockResolvedValue({ error: { code: "23505", message: "unexpected" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const outcomes = await applyContaminationCleanup();

    // The whole point of this test: a real database change happened (updateSelectMock returned
    // a matched row), but this must NOT report success, because there is no record of it.
    expect(outcomes.every((o) => o.applied === false)).toBe(true);
    expect(outcomes.every((o) => o.reason?.includes("audit record failed"))).toBe(true);
    errorSpy.mockRestore();
  });

  test("mixed batch: one guard-miss among 35 successes is visible per-row, never folded into a bare count", async () => {
    let call = 0;
    maybeSingleMock.mockResolvedValue({ data: { description: "old text" } });
    updateSelectMock.mockImplementation(() => {
      call += 1;
      // Make exactly the 5th attempt look like a guard miss; everything else succeeds.
      return Promise.resolve(call === 5 ? { data: [], error: null } : { data: [{ id: "x" }], error: null });
    });
    insertMock.mockResolvedValue({ error: null });

    const outcomes = await applyContaminationCleanup();

    const failed = outcomes.filter((o) => !o.applied);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.id).toBe(CONTAMINATION_CLEANUP_2026_09_02[4]!.id);
    expect(outcomes.filter((o) => o.applied)).toHaveLength(34);
  });
});
