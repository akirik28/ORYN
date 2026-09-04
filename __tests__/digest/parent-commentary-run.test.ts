import { beforeEach, describe, expect, test, vi } from "vitest";
import { isDueForMonthlyCommentary } from "@/lib/digest/parent-commentary-run";

/**
 * lib/digest/parent-commentary-run.ts — the parent_links-driven batch runner. Mirrors
 * __tests__/digest/run.test.ts's own structure and reasoning throughout: resolveParentMonthlyCommentary
 * is mocked directly (it has its own coverage, __tests__/digest/parent-commentary.test.ts) —
 * this suite's job is the runner's own contract, not content generation.
 *
 * Renamed from *Weekly* to *Monthly* 2026-09-04 (B3b — founder: "ayda bir AI özet versin
 * gelişimi"). That conversion added a THIRD gate this file didn't have before: no cron is
 * armed, so "monthly" has to be provable from parent_links.last_commentary_sent_at, not from
 * how often this pass happens to run — isDueForMonthlyCommentary is that proof, and it gets
 * the same standard as the other two: prove it can fail, not just that it happens to pass.
 *
 * Three gates total, each with its own proof, not one assumed from another:
 *   0. Due date (isDueForMonthlyCommentary, checked first, before resolveParentMonthlyCommentary
 *      is ever called) — a link commentaried within the last 30 days is skipped outright.
 *   1. `status = 'active'` at the QUERY level (loadCandidates' own .eq()) — a pending or
 *      revoked link must never even become a candidate, let alone reach the due-date or tier
 *      check.
 *   2. Tier (`resolveParentMonthlyCommentary`'s own not_premium outcome) — a standard-tier
 *      student's parent gets skipped before any commentary is built, mirroring
 *      __tests__/digest/run.test.ts's own "opted-out students never reach content building".
 */

describe("isDueForMonthlyCommentary — the pure gate function on its own", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  test("null (never sent) is immediately due", () => {
    expect(isDueForMonthlyCommentary(null, now)).toBe(true);
  });

  test("29 days ago is NOT yet due", () => {
    const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueForMonthlyCommentary(twentyNineDaysAgo, now)).toBe(false);
  });

  test("exactly 30 days ago IS due", () => {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueForMonthlyCommentary(thirtyDaysAgo, now)).toBe(true);
  });

  test("60 days ago is due", () => {
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDueForMonthlyCommentary(sixtyDaysAgo, now)).toBe(true);
  });

  test("a few hours ago is NOT due", () => {
    const hoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(isDueForMonthlyCommentary(hoursAgo, now)).toBe(false);
  });
});

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

vi.mock("@/lib/digest/parent-commentary", () => ({ resolveParentMonthlyCommentary: resolveMock }));

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
  periodStart: "2026-08-05T00:00:00.000Z",
  periodEnd: "2026-09-04T00:00:00.000Z",
  narrative: "A quiet month.",
  narrativeSource: "no_activity" as const,
  newMatches: [],
};

/** last_commentary_sent_at defaults to null (never sent -> always due), so every existing test
 * below that doesn't care about the due-date gate specifically is unaffected by its addition. */
function link(overrides: Partial<ParentLinkRow>): ParentLinkRow {
  return { id: "link-1", parent_user_id: "parent-1", student_user_id: "student-1", status: "active", last_commentary_sent_at: null, ...overrides };
}

beforeEach(() => {
  linksRef.current = [];
  resolveMock.mockReset();
  resolveMock.mockResolvedValue({ kind: "ok", content: COMMENTARY_CONTENT });
  updateMock.mockClear();
});

describe("runParentMonthlyCommentaryPass — gate #0: due date, checked before the resolver is ever called", () => {
  test("a link commentaried 10 days ago is skipped — resolveParentMonthlyCommentary never runs for it", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    linksRef.current = [link({ last_commentary_sent_at: tenDaysAgo })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.skippedNotDue).toBe(1);
    expect(result.rows).toEqual([{ linkId: "link-1", parentUserId: "parent-1", studentUserId: "student-1", outcome: "skipped_not_due", content: null }]);
  });

  test("a link commentaried 45 days ago IS due — resolveParentMonthlyCommentary runs normally", async () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    linksRef.current = [link({ last_commentary_sent_at: fortyFiveDaysAgo })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(resolveMock).toHaveBeenCalledTimes(1);
    expect(result.skippedNotDue).toBe(0);
    expect(result.wouldSend).toBe(1);
  });

  test("dryRun:false still writes nothing for a not-yet-due link", async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    linksRef.current = [link({ last_commentary_sent_at: fiveDaysAgo })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    await runParentMonthlyCommentaryPass({ dryRun: false });

    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("runParentMonthlyCommentaryPass — gate #1: status = 'active' filtering happens before any candidate is even loaded", () => {
  test("a pending link is never a candidate — resolveParentMonthlyCommentary is never called for it", async () => {
    linksRef.current = [link({ id: "link-pending", status: "pending" })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.attempted).toBe(0);
  });

  test("a revoked link is never a candidate either", async () => {
    linksRef.current = [link({ id: "link-revoked", status: "revoked" })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.attempted).toBe(0);
  });

  test("an active link among pending/revoked ones IS a candidate — the filter is selective, not a blanket skip", async () => {
    linksRef.current = [link({ id: "link-pending", status: "pending" }), link({ id: "link-active", status: "active" }), link({ id: "link-revoked", status: "revoked" })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(resolveMock).toHaveBeenCalledTimes(1);
    expect(resolveMock).toHaveBeenCalledWith(expect.anything(), "student-1", null);
    expect(result.attempted).toBe(1);
  });
});

describe("runParentMonthlyCommentaryPass — gate #2: tier, skipped before it's recorded as sent", () => {
  test("not_premium is skipped, and dryRun:false still writes nothing for that row", async () => {
    linksRef.current = [link({ id: "link-standard" })];
    resolveMock.mockResolvedValue({ kind: "not_premium" });
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: false });

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.skippedNotPremium).toBe(1);
    expect(result.sent).toBe(0);
  });
});

describe("runParentMonthlyCommentaryPass with dryRun: true (the default)", () => {
  test("resolves real content but writes nothing at all", async () => {
    linksRef.current = [link({})];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.wouldSend).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.rows).toEqual([{ linkId: "link-1", parentUserId: "parent-1", studentUserId: "student-1", outcome: "would_send", content: COMMENTARY_CONTENT }]);
  });

  test("the identical mocked setup DOES write when dryRun is false, so the dry-run test above can't pass by construction", async () => {
    linksRef.current = [link({})];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: false });

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

describe("runParentMonthlyCommentaryPass — since cursor threads through unchanged", () => {
  test("a due link's own last_commentary_sent_at is passed as resolveParentMonthlyCommentary's since argument", async () => {
    // Must be >30 days old, or gate #0 would skip it before resolveMock is ever called —
    // this test is about the value threading through, not about re-proving gate #0.
    const overThirtyDaysAgo = "2026-01-01T00:00:00.000Z";
    linksRef.current = [link({ last_commentary_sent_at: overThirtyDaysAgo })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    await runParentMonthlyCommentaryPass({ dryRun: true });

    expect(resolveMock).toHaveBeenCalledWith(expect.anything(), "student-1", overThirtyDaysAgo);
  });
});

describe("runParentMonthlyCommentaryPass — linkIds bypasses the status filter, not the tier or due-date gates", () => {
  test("a supplied linkId reaches the due-date/resolver path even if pending, but a standard tier there still skips", async () => {
    linksRef.current = [link({ id: "link-pending-probe", status: "pending" })];
    resolveMock.mockResolvedValue({ kind: "not_premium" });
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true, linkIds: ["link-pending-probe"] });

    expect(resolveMock).toHaveBeenCalledTimes(1);
    expect(result.skippedNotPremium).toBe(1);
  });

  test("a supplied linkId that isn't due yet is still skipped — linkIds bypasses status, not the calendar", async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    linksRef.current = [link({ id: "link-recent-probe", status: "pending", last_commentary_sent_at: fiveDaysAgo })];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");

    const result = await runParentMonthlyCommentaryPass({ dryRun: true, linkIds: ["link-recent-probe"] });

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.skippedNotDue).toBe(1);
  });
});

describe("runParentMonthlyCommentaryPass — this module never touches anything but parent_links", () => {
  test("mockAdminClient throws on any table access this module doesn't expect — proves no hidden call to an email/messaging table exists", async () => {
    // Same reasoning as run.test.ts's identical test: a real send mechanism would necessarily
    // call .from() on something else, which would fail this suite immediately rather than
    // silently passing. Stated as its own test so the guarantee has a name.
    linksRef.current = [link({})];
    const { runParentMonthlyCommentaryPass } = await import("@/lib/digest/parent-commentary-run");
    await expect(runParentMonthlyCommentaryPass({ dryRun: false })).resolves.toBeDefined();
  });
});
