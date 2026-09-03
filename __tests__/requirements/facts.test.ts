import { describe, expect, test, vi } from "vitest";
import { assembleRequirementFacts } from "@/lib/requirements/facts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-03: readOr's third adoption (docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md,
 * tier 1 -- assembleRequirementFacts feeds lib/requirements/evaluate.ts's own eligibility
 * claims). Same pattern as __tests__/scoring/assemble-facts.test.ts: a failed read used to
 * be indistinguishable from "this student meets no requirements on file" -- now logged, by
 * name, with the return shape unchanged.
 */

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

function fakeClient(perTable: Record<string, QueryResult>): SupabaseClient<Database> {
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => Promise.resolve(perTable[table] ?? { data: [], error: null }),
      }),
    }),
  };
  return client as unknown as SupabaseClient<Database>;
}

const ALL_TABLES = ["education_records", "courses", "test_scores", "languages"] as const;

function allSucceed(): Record<string, QueryResult> {
  return Object.fromEntries(ALL_TABLES.map((t) => [t, { data: [], error: null }]));
}

describe("assembleRequirementFacts", () => {
  test("returns empty facts and logs nothing when every read succeeds", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const facts = await assembleRequirementFacts(fakeClient(allSucceed()), "user-1");
    expect(facts).toEqual({ curricula: [], courses: [], gpas: [], testScores: [], languages: [] });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a real education_records row is used to derive both curricula and gpas from a single read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const perTable = allSucceed();
    perTable.education_records = { data: [{ curriculum: "ib", overall_gpa: 5.5, gpa_scale: 7 }], error: null };
    const facts = await assembleRequirementFacts(fakeClient(perTable), "user-1");
    expect(facts.curricula).toEqual(["ib"]);
    expect(facts.gpas).toEqual([{ value: 5.5, scale: 7 }]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed education_records read is logged exactly once (not twice for the two derived fields) and both curricula and gpas fall back to []", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const perTable = allSucceed();
    perTable.education_records = { data: null, error: { message: "relation does not exist" } };
    const facts = await assembleRequirementFacts(fakeClient(perTable), "user-42");
    expect(facts.curricula).toEqual([]);
    expect(facts.gpas).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    const [message, detail] = spy.mock.calls[0];
    expect(message).toContain("educationRecords");
    expect(detail).toMatchObject({ userId: "user-42" });
    spy.mockRestore();
  });

  test("a failed languages read still returns [] (unchanged behavior) but is logged by its own category name", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const perTable = allSucceed();
    perTable.languages = { data: null, error: { message: "boom" } };
    const facts = await assembleRequirementFacts(fakeClient(perTable), "user-1");
    expect(facts.languages).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("assembleRequirementFacts.languages");
    spy.mockRestore();
  });

  test("multiple simultaneous failures are all named, not just the first", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const perTable = allSucceed();
    perTable.courses = { data: null, error: { message: "boom" } };
    perTable.test_scores = { data: null, error: { message: "boom too" } };
    await assembleRequirementFacts(fakeClient(perTable), "user-1");
    const messages = spy.mock.calls.map(([message]) => message);
    expect(messages.some((m) => typeof m === "string" && m.includes("courses"))).toBe(true);
    expect(messages.some((m) => typeof m === "string" && m.includes("testScores"))).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
