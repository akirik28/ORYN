import { describe, expect, test, vi } from "vitest";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-03: assembleScoringFacts previously turned every one of its 13 parallel reads
 * into `.data ?? []` with no `.error` check -- a failed read (RLS misconfig, a transient
 * error, a table briefly unreachable) was silently indistinguishable from "this student
 * genuinely has zero rows here," and every downstream dimension scorer would confidently
 * compute a low score from what was actually a data outage, not a real absence. These
 * tests pin the contained fix: the return shape and success behavior are unchanged, but a
 * partial failure is now logged, by name, rather than swallowed.
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

const ALL_TABLES = [
  "education_records",
  "courses",
  "test_scores",
  "activities",
  "awards",
  "certifications",
  "projects",
  "research_experiences",
  "volunteering_experiences",
  "work_experiences",
  "student_interests",
  "career_goals",
  "target_universities",
] as const;

function allSucceed(): Record<string, QueryResult> {
  return Object.fromEntries(ALL_TABLES.map((t) => [t, { data: [], error: null }]));
}

describe("assembleScoringFacts", () => {
  test("returns empty arrays and logs nothing when every read succeeds", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const facts = await assembleScoringFacts(fakeClient(allSucceed()), "user-1");
    expect(facts.activities).toEqual([]);
    expect(facts.awards).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed activities read still returns [] (unchanged behavior) but is logged by name, not swallowed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const perTable = allSucceed();
    perTable.activities = { data: null, error: { message: "relation does not exist" } };

    const facts = await assembleScoringFacts(fakeClient(perTable), "user-42");

    expect(facts.activities).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    const [message, detail] = spy.mock.calls[0];
    expect(message).toContain("partial read failure");
    expect(detail).toMatchObject({ userId: "user-42", failedCategories: ["activities"] });
    spy.mockRestore();
  });

  test("multiple simultaneous failures are all named, not just the first", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const perTable = allSucceed();
    perTable.awards = { data: null, error: { message: "boom" } };
    perTable.research_experiences = { data: null, error: { message: "boom too" } };

    await assembleScoringFacts(fakeClient(perTable), "user-1");

    const [, detail] = spy.mock.calls[0];
    expect((detail as { failedCategories: string[] }).failedCategories.sort()).toEqual(["awards", "researchExperiences"]);
    spy.mockRestore();
  });
});
