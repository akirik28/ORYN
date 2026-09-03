import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * The seam CEO named directly, 2026-09-04: "a revoked parent and an active parent whose child
 * genuinely has nothing must not produce the same screen." Every get_parent_child_* RPC
 * (migration 0116) returns an empty array in BOTH cases — deliberate on the SQL side. This is
 * the test that would actually catch a regression there: not a policy test (supabase/tests/
 * parent_links_rls_manual.sql already covers that ground), but a check that the two real
 * scenarios below produce genuinely different ParentChildPanelState shapes, not two empty
 * arrays a caller has to somehow tell apart itself.
 */

const { getParentLinksForStudentMock } = vi.hoisted(() => ({ getParentLinksForStudentMock: vi.fn() }));
vi.mock("@/lib/parent/links", () => ({ getParentLinksForStudent: getParentLinksForStudentMock }));

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: rpcMock }) }));

import { getParentChildPanelState } from "@/lib/parent/child-panel";

const STUDENT_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  getParentLinksForStudentMock.mockReset();
  rpcMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getParentChildPanelState", () => {
  test("no link at all -> no_link, and the RPCs are never called", async () => {
    getParentLinksForStudentMock.mockResolvedValue([]);
    expect(await getParentChildPanelState(STUDENT_ID)).toEqual({ state: "no_link" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test("pending link -> pending, and the RPCs are never called", async () => {
    getParentLinksForStudentMock.mockResolvedValue([{ status: "pending" }]);
    expect(await getParentChildPanelState(STUDENT_ID)).toEqual({ state: "pending" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test("THE seam, half one: revoked link -> revoked, and the RPCs are never called", async () => {
    getParentLinksForStudentMock.mockResolvedValue([{ status: "revoked" }]);
    expect(await getParentChildPanelState(STUDENT_ID)).toEqual({ state: "revoked" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test("THE seam, half two: active link, child genuinely has nothing yet -> active with empty arrays", async () => {
    getParentLinksForStudentMock.mockResolvedValue([{ status: "active" }]);
    rpcMock.mockResolvedValue({ data: [], error: null });
    const result = await getParentChildPanelState(STUDENT_ID);
    expect(result).toEqual({ state: "active", profile: null, targetUniversities: [], applications: [] });
    // The actual proof CEO asked for: this test's result and the revoked test's result above
    // carry different `state` discriminants ("active" vs. "revoked") even though every array
    // in both is empty. A caller branching on `.state` physically cannot render "child has
    // done nothing" for a revoked parent, or "access ended" for an active one with a new
    // student — the two cases the empty array alone could never tell apart.
    expect(result.state).not.toBe("revoked");
  });

  test("active link with real data -> all three results populated", async () => {
    getParentLinksForStudentMock.mockResolvedValue([{ status: "active" }]);
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "get_parent_child_profile") {
        return Promise.resolve({ data: [{ display_name: "Alice", plan_tier: "standard" }], error: null });
      }
      if (fn === "get_parent_child_target_universities") {
        return Promise.resolve({ data: [{ id: "u1", status: "target" }], error: null });
      }
      if (fn === "get_parent_child_applications") {
        return Promise.resolve({ data: [{ id: "a1", status: "in_progress" }], error: null });
      }
      throw new Error(`child-panel.test.ts: unexpected rpc "${fn}"`);
    });
    const result = await getParentChildPanelState(STUDENT_ID);
    expect(result.state).toBe("active");
    if (result.state !== "active") return;
    expect(result.profile?.display_name).toBe("Alice");
    expect(result.targetUniversities).toHaveLength(1);
    expect(result.applications).toHaveLength(1);
  });

  test("get_parent_child_profile not applied yet (migration 0116 unapplied) -> active state, null profile, not a crash", async () => {
    getParentLinksForStudentMock.mockResolvedValue([{ status: "active" }]);
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "get_parent_child_profile") {
        return Promise.resolve({
          data: null,
          error: { code: "PGRST202", message: "Could not find the function public.get_parent_child_profile" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    expect(await getParentChildPanelState(STUDENT_ID)).toEqual({
      state: "active",
      profile: null,
      targetUniversities: [],
      applications: [],
    });
  });

  test("a genuinely unexpected RPC error still degrades to empty rather than throwing, and is logged", async () => {
    getParentLinksForStudentMock.mockResolvedValue([{ status: "active" }]);
    rpcMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    const result = await getParentChildPanelState(STUDENT_ID);
    expect(result).toEqual({ state: "active", profile: null, targetUniversities: [], applications: [] });
    expect(console.error).toHaveBeenCalled();
  });
});
