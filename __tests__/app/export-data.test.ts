import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * 2026-09-03: readOr adoption, tier 2 (docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md
 * -- "a read that renders a list must distinguish 'couldn't load' from 'nothing here yet'").
 * This endpoint has no page to show a banner on -- it's a downloaded file -- so the honesty
 * lives in the file's own `meta.complete`/`meta.incompleteTables` instead. Every read
 * already fell back to `[]` on failure before this fix; that fallback is unchanged (the file
 * shape a caller depends on doesn't move), only visibility is new.
 */

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

function fakeClient(overrides: Record<string, QueryResult> = {}) {
  return {
    from: (table: string) => {
      const result = overrides[table] ?? { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
}

const { requireUserMock, createClientMock, rateLimitMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createClientMock: vi.fn(),
  rateLimitMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, assertWithinRateLimit: rateLimitMock };
});
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));

import { GET } from "@/app/api/export-data/route";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID });
  rateLimitMock.mockClear().mockResolvedValue(undefined);
});

describe("GET /api/export-data", () => {
  test("every read succeeding: meta.complete is true, no incomplete tables", async () => {
    createClientMock.mockResolvedValue(fakeClient());
    const response = await GET();
    const body = await response.json();
    expect(body.meta).toEqual({ complete: true, incompleteTables: [] });
    expect(body.data.profiles).toEqual([]);
  });

  test("a failed read on one EXPORT_TABLES entry (activities): data falls back to [] unchanged, but meta names it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createClientMock.mockResolvedValue(fakeClient({ activities: { data: null, error: { message: "boom" } } }));
    const response = await GET();
    const body = await response.json();
    expect(body.data.activities).toEqual([]);
    expect(body.meta.complete).toBe(false);
    expect(body.meta.incompleteTables).toContain("activities");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed read on a participant-pair table (messages) is named too, independently of EXPORT_TABLES", async () => {
    createClientMock.mockResolvedValue(fakeClient({ messages: { data: null, error: { message: "boom" } } }));
    const response = await GET();
    const body = await response.json();
    expect(body.data.messages).toEqual([]);
    expect(body.meta.incompleteTables).toEqual(["messages"]);
  });

  test("multiple simultaneous failures are all named, not just the first", async () => {
    createClientMock.mockResolvedValue(
      fakeClient({
        courses: { data: null, error: { message: "boom" } },
        connections: { data: null, error: { message: "boom too" } },
      })
    );
    const response = await GET();
    const body = await response.json();
    expect(body.meta.incompleteTables.sort()).toEqual(["connections", "courses"]);
  });

  test("a genuinely empty (but successful) table never counts as incomplete", async () => {
    createClientMock.mockResolvedValue(fakeClient({ skills: { data: [], error: null } }));
    const response = await GET();
    const body = await response.json();
    expect(body.data.skills).toEqual([]);
    expect(body.meta.complete).toBe(true);
  });
});
