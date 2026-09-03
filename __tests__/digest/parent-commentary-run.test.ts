import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/digest/parent-commentary-run.ts — the parent_links-driven batch runner. Mirrors
 * __tests__/digest/run.test.ts's own structure and reasoning throughout: resolveParentWeeklyCommentary
 * is mocked directly (it has its own coverage, __tests__/digest/parent-commentary.test.ts) —
 * this suite's job is the runner's own contract, not content generation.
 *
 * CEO's own instruction for this feature, stated directly: "prove the gate before the
 * content — a standard-tier parent getting commentary is the failure that matters." Two
 * gates exist here, and both get their own proof, not one assumed from the other:
 *   1. `status = 'active'` at the QUERY level (loadCandidates' own .eq()) — a pending or
 *      revoked link must never even become a candidate, let alone reach the tier check.
 *   2. Tier (`resolveParentWeeklyCommentary`'s own not_premium outcome) — a standard-tier
 *      student's parent gets skipped before any commentary is built, mirroring
 *      __tests__/digest/run.test.ts's own "opted-out students never reach content building".
 */

interface ParentLinkRow {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  status: "pending" | "active" | "revoked";
  last_commentary_sent_at: string | null;
}

const { resolveMock, linksRef, updateMock } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  linksRef: { current: [] as ParentLinkRow[] },
  updateMock: vi.fn(),
}));

vi.mock("@/lib/digest/parent-commentary", () => ({ resolveParentWeeklyCommentary: resolveMock }));

/** `.eq("status", "active")` genuinely filters the fixture array here, not just accepted and
 * ignored — that's the mechanism proving gate #1 (see this file's own header). `.in("id", ids)`
 * is the linkIds override, mirroring DigestRunOptions.candidateIds's own bypass shape exactly. */
function mockAdminClient() {
  return {
    from: (table: string) => {
      if (table === "parent_links") {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              limit: async () => ({ data: linksRef.current.filter((l) => l.status === value), error: null }),
            }),
            in: (_col: string, ids: string[]) => ({
              limit: async () => ({ data: linksRef.current.filter((l) => ids.includes(l.id)), error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              updateMock({ id, payload });
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`mockAdminClient: unhandled table "${table}"`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mockAdminClient() }));

const COMMENTARY_CONTENT = {
  weekStart: "2026-09-01T00:00:00.000Z",
  weekEnd: "2026-09-04T00:00:00.000Z",
  narrative: "A quiet week.",
  narrativeSource: "no_activity" as const,
  newMatches: [],
};

function link(overrides: Partial<ParentLinkRow>): ParentLinkRow {
  return { id: "link-1", parent_user_id: "parent-1", student_user_id: "student-1", status: "active", last_commentary_sent_at: null, ...overrides };
}

beforeEach(() => {
  linksRef.current = [];
  resolveMock.mockReset();
  resolveMock.mockResolvedValue({ kind: "ok", content: COMMENTARY_CONTENT });
  updateMock.mockClear();
});

describe("runParentWeeklyCommentaryPass — gate #1: status = 'active' filtering happens before any candidate is even loaded", () => {
  test("a pending link is never a candidate — resolveParentWeeklyCommentary is never called for it", async () => {
    linksRef.current = [link({ id: "link-pending", status: "pending" })];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: true });

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.attempted).toBe(0);
  });

  test("a revoked link is never a candidate either", async () => {
    linksRef.current = [link({ id: "link-revoked", status: "revoked" })];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: true });

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.attempted).toBe(0);
  });

  test("an active link among pending/revoked ones IS a candidate — the filter is selective, not a blanket skip", async () => {
    linksRef.current = [link({ id: "link-pending", status: "pending" }), link({ id: "link-active", status: "active" }), link({ id: "link-revoked", status: "revoked" })];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: true });

    expect(resolveMock).toHaveBeenCalledTimes(1);
    expect(resolveMock).toHaveBeenCalledWith(expect.anything(), "student-1", null);
    expect(result.attempted).toBe(1);
  });
});

describe("runParentWeeklyCommentaryPass — gate #2: tier, skipped before it's recorded as sent", () => {
  test("not_premium is skipped, and dryRun:false still writes nothing for that row", async () => {
    linksRef.current = [link({ id: "link-standard" })];
    resolveMock.mockResolvedValue({ kind: "not_premium" });
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: false });

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.skippedNotPremium).toBe(1);
    expect(result.sent).toBe(0);
  });
});

describe("runParentWeeklyCommentaryPass with dryRun: true (the default)", () => {
  test("resolves real content but writes nothing at all", async () => {
    linksRef.current = [link({})];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: true });

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.wouldSend).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.rows).toEqual([{ linkId: "link-1", parentUserId: "parent-1", studentUserId: "student-1", outcome: "would_send", content: COMMENTARY_CONTENT }]);
  });

  test("the identical mocked setup DOES write when dryRun is false, so the dry-run test above can't pass by construction", async () => {
    linksRef.current = [link({})];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: false });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const call = updateMock.mock.calls[0][0] as { id: string; payload: Record<string, unknown> };
    expect(call.id).toBe("link-1");
    // Exactly one key, on exactly the one column this module is allowed to touch — matching
    // run.test.ts's own assertion shape verbatim, same reasoning: a future change that starts
    // writing anything else here would need to change this assertion, not slip past silently.
    expect(Object.keys(call.payload)).toEqual(["last_commentary_sent_at"]);
    expect(result.sent).toBe(1);
    expect(result.rows).toBeUndefined(); // same "rows only on a dry run" contract as lib/digest/run.ts
  });
});

describe("runParentWeeklyCommentaryPass — since cursor threads through unchanged", () => {
  test("a link's own last_commentary_sent_at is passed as resolveParentWeeklyCommentary's since argument", async () => {
    linksRef.current = [link({ last_commentary_sent_at: "2026-08-28T00:00:00.000Z" })];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    await runParentWeeklyCommentaryPass({ dryRun: true });

    expect(resolveMock).toHaveBeenCalledWith(expect.anything(), "student-1", "2026-08-28T00:00:00.000Z");
  });
});

describe("runParentWeeklyCommentaryPass — linkIds bypasses the status filter, not the tier gate", () => {
  test("a supplied linkId reaches the resolver even if pending, but a standard tier there still skips", async () => {
    linksRef.current = [link({ id: "link-pending-probe", status: "pending" })];
    resolveMock.mockResolvedValue({ kind: "not_premium" });
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentWeeklyCommentaryPass({ dryRun: true, linkIds: ["link-pending-probe"] });

    expect(resolveMock).toHaveBeenCalledTimes(1);
    expect(result.skippedNotPremium).toBe(1);
  });
});

describe("runParentWeeklyCommentaryPass — this module never touches anything but parent_links", () => {
  test("mockAdminClient throws on any table access this module doesn't expect — proves no hidden call to an email/messaging table exists", async () => {
    // Same reasoning as run.test.ts's identical test: a real send mechanism would necessarily
    // call .from() on something else, which would fail this suite immediately rather than
    // silently passing. Stated as its own test so the guarantee has a name.
    linksRef.current = [link({})];
    const { runParentWeeklyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");
    await expect(runParentWeeklyCommentaryPass({ dryRun: false })).resolves.toBeDefined();
  });
});
