import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * The multi-child lockout (docs/parent-state-machine-trace-2026-09-04.md), written before
 * the fix so it actually exercises the bug rather than just describing it. A parent with two
 * children -- one link `active` and touched last month, one `revoked` (or `pending`) and
 * touched today -- must resolve to the active one. Before the fix, ordering by `updated_at`
 * alone with no status preference returned the more-recently-touched non-active row instead,
 * which meant `hasActiveParentLink` came back `false` for a parent who very much has active
 * access, and every entry point into /parent redirected them away from it with no way back.
 *
 * The fake query builder below filters an in-memory row set the same way PostgREST would
 * (`.eq()` narrows, `.order()` + `.limit()` + `.maybeSingle()` picks one) rather than
 * hand-scripting per-test return values -- the point of this test is the *selection logic*,
 * so the mock needs to actually apply the same filters the real client would, not just hand
 * back whatever a specific test wants to see.
 */

interface FakeLinkRow {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  status: "pending" | "active" | "revoked";
  updated_at: string;
}

function makeQueryBuilder(rows: FakeLinkRow[]) {
  let filtered = [...rows];
  let ascending = true;
  let limit: number | null = null;

  const builder = {
    eq(column: keyof FakeLinkRow, value: string) {
      filtered = filtered.filter((r) => r[column] === value);
      return builder;
    },
    order(_column: string, opts?: { ascending?: boolean }) {
      ascending = opts?.ascending ?? true;
      filtered = [...filtered].sort((a, b) => {
        const cmp = a.updated_at.localeCompare(b.updated_at);
        return ascending ? cmp : -cmp;
      });
      return builder;
    },
    limit(n: number) {
      limit = n;
      return builder;
    },
    async maybeSingle() {
      const rows2 = limit !== null ? filtered.slice(0, limit) : filtered;
      return { data: rows2[0] ?? null, error: null };
    },
  };
  return builder;
}

function mockSupabaseWithLinks(rows: FakeLinkRow[]) {
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      from: (_table: string) => ({ select: () => makeQueryBuilder(rows) }),
    }),
  }));
}

const PARENT_ID = "p1111111-1111-1111-1111-111111111111";
const STUDENT_A = "aaaaaaaa-1111-1111-1111-111111111111";
const STUDENT_B = "bbbbbbbb-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.resetModules();
});

describe("getRelevantParentLink -- the multi-child lockout", () => {
  test("active link touched last month beats a revoked link touched today", async () => {
    mockSupabaseWithLinks([
      { id: "link-a", parent_user_id: PARENT_ID, student_user_id: STUDENT_A, status: "active", updated_at: "2026-08-01T00:00:00Z" },
      { id: "link-b", parent_user_id: PARENT_ID, student_user_id: STUDENT_B, status: "revoked", updated_at: "2026-09-04T00:00:00Z" },
    ]);
    const { getRelevantParentLink, getParentLinkStatus, hasActiveParentLink, getActiveParentLink } = await import("@/lib/auth/account-role");

    const link = await getRelevantParentLink(PARENT_ID);
    expect(link?.id).toBe("link-a");
    expect(link?.student_user_id).toBe(STUDENT_A);

    const status = await getParentLinkStatus(PARENT_ID);
    expect(status).toBe("active");
    expect(hasActiveParentLink(status)).toBe(true);

    const active = await getActiveParentLink(PARENT_ID);
    expect(active?.student_user_id).toBe(STUDENT_A);
  });

  test("active link touched last month beats a pending link touched today", async () => {
    mockSupabaseWithLinks([
      { id: "link-a", parent_user_id: PARENT_ID, student_user_id: STUDENT_A, status: "active", updated_at: "2026-08-01T00:00:00Z" },
      { id: "link-b", parent_user_id: PARENT_ID, student_user_id: STUDENT_B, status: "pending", updated_at: "2026-09-04T00:00:00Z" },
    ]);
    const { getParentLinkStatus } = await import("@/lib/auth/account-role");
    expect(await getParentLinkStatus(PARENT_ID)).toBe("active");
  });

  test("two active links -- most-recently-updated wins, a deliberate choice now that it's no longer a lockout", async () => {
    mockSupabaseWithLinks([
      { id: "link-old", parent_user_id: PARENT_ID, student_user_id: STUDENT_A, status: "active", updated_at: "2026-08-01T00:00:00Z" },
      { id: "link-new", parent_user_id: PARENT_ID, student_user_id: STUDENT_B, status: "active", updated_at: "2026-09-04T00:00:00Z" },
    ]);
    const { getRelevantParentLink } = await import("@/lib/auth/account-role");
    const link = await getRelevantParentLink(PARENT_ID);
    expect(link?.student_user_id).toBe(STUDENT_B);
  });

  test("no active link at all -- falls back to the most recent of any status, same as before", async () => {
    mockSupabaseWithLinks([
      { id: "link-a", parent_user_id: PARENT_ID, student_user_id: STUDENT_A, status: "revoked", updated_at: "2026-08-01T00:00:00Z" },
      { id: "link-b", parent_user_id: PARENT_ID, student_user_id: STUDENT_B, status: "pending", updated_at: "2026-09-04T00:00:00Z" },
    ]);
    const { getParentLinkStatus } = await import("@/lib/auth/account-role");
    expect(await getParentLinkStatus(PARENT_ID)).toBe("pending");
  });

  test("no links at all -- none", async () => {
    mockSupabaseWithLinks([]);
    const { getParentLinkStatus } = await import("@/lib/auth/account-role");
    expect(await getParentLinkStatus(PARENT_ID)).toBe("none");
  });

  test("single active link -- unaffected by the fix, still resolves active", async () => {
    mockSupabaseWithLinks([
      { id: "link-a", parent_user_id: PARENT_ID, student_user_id: STUDENT_A, status: "active", updated_at: "2026-08-01T00:00:00Z" },
    ]);
    const { getParentLinkStatus } = await import("@/lib/auth/account-role");
    expect(await getParentLinkStatus(PARENT_ID)).toBe("active");
  });
});
