import { describe, expect, test, vi } from "vitest";

/**
 * getFeedbackReports (lib/admin/queries.ts) — migration 0113, proposed and not yet
 * applied. Returns `null`, never `[]`, when the table doesn't exist: "not measured" and
 * "measured, found zero reports" are different claims (this session's own page_views/
 * provider_health precedent). The second query (profiles.display_name, keyed off the
 * report rows' own user_id) is a best-effort join -- a report whose author later deleted
 * their account has user_id: null (migration 0113's own on delete set null) and must still
 * render, not throw.
 *
 * getFeedbackReportCount (added 2026-09-03, for the Overview screen's "Karar bekleyen"
 * panel) is a count-only sibling, same table, same null-means-unmeasured contract --
 * covered in its own describe block below rather than a separate file, since it's testing
 * the same module's same underlying not-measured/measured-zero distinction for the same
 * table.
 */

type FeedbackRow = { id: string; user_id: string | null; message: string; path: string; locale: string; plan_tier: string; created_at: string };
type ProfileRow = { id: string; display_name: string | null };

function makeAdmin(opts: { feedback: { data: FeedbackRow[] | null; error: { code?: string; message: string } | null }; profiles?: ProfileRow[] }) {
  const inMock = vi.fn((_col: string, ids: string[]) => Promise.resolve({ data: (opts.profiles ?? []).filter((r) => ids.includes(r.id)) }));
  return {
    admin: {
      from: (table: string) => {
        if (table === "feedback_reports") {
          return { select: () => ({ order: () => ({ limit: () => Promise.resolve(opts.feedback) }) }) };
        }
        if (table === "profiles") {
          return { select: () => ({ in: inMock }) };
        }
        throw new Error(`feedback-reports-query.test.ts: unexpected table "${table}"`);
      },
    } as never,
    inMock,
  };
}

describe("getFeedbackReports — table not live", () => {
  test("a PGRST205 returns null, not an empty array -- 'not measured' stays distinguishable from 'measured, zero rows'", async () => {
    const { getFeedbackReports } = await import("@/lib/admin/queries");
    const { admin, inMock } = makeAdmin({
      feedback: { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.feedback_reports' in the schema cache" } },
    });

    expect(await getFeedbackReports(admin)).toBeNull();
    expect(inMock).not.toHaveBeenCalled();
  });

  test("an unrecognized error also returns null and is logged, not silently swallowed", async () => {
    const { getFeedbackReports } = await import("@/lib/admin/queries");
    const { admin } = makeAdmin({ feedback: { data: null, error: { code: "PGRST301", message: "JWT expired" } } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getFeedbackReports(admin)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("getFeedbackReports — table live", () => {
  test("genuinely zero rows returns [], not null", async () => {
    const { getFeedbackReports } = await import("@/lib/admin/queries");
    const { admin } = makeAdmin({ feedback: { data: [], error: null } });

    expect(await getFeedbackReports(admin)).toEqual([]);
  });

  test("joins display_name from profiles, keyed off each row's own user_id", async () => {
    const { getFeedbackReports } = await import("@/lib/admin/queries");
    const { admin } = makeAdmin({
      feedback: {
        data: [{ id: "r1", user_id: "u1", message: "It crashed", path: "/dashboard", locale: "en", plan_tier: "standard", created_at: "2026-09-03T00:00:00Z" }],
        error: null,
      },
      profiles: [{ id: "u1", display_name: "Ada" }],
    });

    const result = await getFeedbackReports(admin);
    expect(result).toEqual([
      { id: "r1", userId: "u1", displayName: "Ada", message: "It crashed", path: "/dashboard", locale: "en", planTier: "standard", createdAt: "2026-09-03T00:00:00Z" },
    ]);
  });

  test("a report whose author's account was later deleted (user_id: null) renders with displayName: null, not a crash", async () => {
    const { getFeedbackReports } = await import("@/lib/admin/queries");
    const { admin, inMock } = makeAdmin({
      feedback: {
        data: [{ id: "r1", user_id: null, message: "Feedback from a now-deleted account", path: "/settings", locale: "tr", plan_tier: "standard", created_at: "2026-09-03T00:00:00Z" }],
        error: null,
      },
    });

    const result = await getFeedbackReports(admin);
    expect(result?.[0]?.displayName).toBeNull();
    expect(result?.[0]?.userId).toBeNull();
    // A null user_id must never reach the .in() filter -- it isn't a real id to look up.
    expect(inMock).not.toHaveBeenCalled();
  });

  test("a user_id present on the report but absent from the profiles join result still falls back to null, not a crash", async () => {
    const { getFeedbackReports } = await import("@/lib/admin/queries");
    const { admin } = makeAdmin({
      feedback: {
        data: [{ id: "r1", user_id: "u1", message: "test", path: "/", locale: "en", plan_tier: "standard", created_at: "2026-09-03T00:00:00Z" }],
        error: null,
      },
      profiles: [],
    });

    const result = await getFeedbackReports(admin);
    expect(result?.[0]?.displayName).toBeNull();
  });
});

function makeCountAdmin(result: { count: number | null; error: { code?: string; message: string } | null }) {
  const selectMock = vi.fn((_col: string, _opts?: Record<string, unknown>) => Promise.resolve(result));
  return {
    admin: {
      from: (table: string) => {
        if (table !== "feedback_reports") throw new Error(`feedback-reports-query.test.ts: unexpected table "${table}"`);
        return { select: selectMock };
      },
    } as never,
    selectMock,
  };
}

describe("getFeedbackReportCount", () => {
  test("a PGRST205 (table not applied yet) returns null, not 0 -- 'unmeasured' must never read as a confirmed zero", async () => {
    const { getFeedbackReportCount } = await import("@/lib/admin/queries");
    const { admin } = makeCountAdmin({ count: null, error: { code: "PGRST205", message: "Could not find the table 'public.feedback_reports' in the schema cache" } });

    expect(await getFeedbackReportCount(admin)).toBeNull();
  });

  test("an unrecognized error also returns null and is logged, not silently swallowed", async () => {
    const { getFeedbackReportCount } = await import("@/lib/admin/queries");
    const { admin } = makeCountAdmin({ count: null, error: { code: "PGRST301", message: "JWT expired" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getFeedbackReportCount(admin)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  test("a genuine zero (table live, no rows) returns 0, distinguishable from the null/unmeasured case above", async () => {
    const { getFeedbackReportCount } = await import("@/lib/admin/queries");
    const { admin } = makeCountAdmin({ count: 0, error: null });

    expect(await getFeedbackReportCount(admin)).toBe(0);
  });

  test("a real count passes through unchanged", async () => {
    const { getFeedbackReportCount } = await import("@/lib/admin/queries");
    const { admin } = makeCountAdmin({ count: 7, error: null });

    expect(await getFeedbackReportCount(admin)).toBe(7);
  });

  test("does not use head:true -- a head request against a missing table can return a false-success 204 with no error, masking the real PGRST205", async () => {
    const { getFeedbackReportCount } = await import("@/lib/admin/queries");
    const { admin, selectMock } = makeCountAdmin({ count: 3, error: null });

    await getFeedbackReportCount(admin);
    const [, options] = selectMock.mock.calls[0];
    expect(options?.head).not.toBe(true);
  });
});
