import { describe, expect, test, vi } from "vitest";
import { buildPortfolio, getPortfolioSkills } from "@/lib/portfolio/build";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-03: readOr adoption, tier 2 -- buildPortfolio feeds the one page whose whole job
 * is showing a student everything they've built (Phase 20), plus the CV builder. A failed
 * read for one category (e.g. every award this student entered) used to render identically
 * to "no awards" -- now logged, by category name, return shape unchanged.
 */

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

function fakeClient(overrides: Record<string, QueryResult> = {}): SupabaseClient<Database> {
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => Promise.resolve(overrides[table] ?? { data: [], error: null }),
      }),
    }),
  };
  return client as unknown as SupabaseClient<Database>;
}

const USER_ID = "user-1";

describe("buildPortfolio", () => {
  test("all tables succeed and empty: returns [], logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const items = await buildPortfolio(fakeClient(), USER_ID);
    expect(items).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("real rows across categories map correctly and sort newest-first by startDate", async () => {
    const client = fakeClient({
      awards: { data: [{ id: "a1", title: "Award", organization: "Org", description: null, award_date: "2025-01-01", level: "national", created_at: "t", evidence_status: "self_reported" }], error: null },
      projects: { data: [{ id: "p1", title: "Project", organization: null, outcome_summary: "Shipped", description: null, start_date: "2026-01-01", end_date: null, ongoing: true, role: "lead", created_at: "t", evidence_status: "verified" }], error: null },
    });
    const items = await buildPortfolio(client, USER_ID);
    expect(items.map((i) => i.id)).toEqual(["p1", "a1"]); // 2026 project before 2025 award
    expect(items[1].category).toBe("awards");
    expect(items[0].category).toBe("projects");
  });

  test("activities.is_leadership_role splits into the leadership category, not activities", async () => {
    const client = fakeClient({
      activities: {
        data: [{ id: "act1", title: "Club President", organization: null, description: null, start_date: "2026-01-01", end_date: null, ongoing: true, people_led: 12, created_at: "t", evidence_status: "self_reported", is_leadership_role: true }],
        error: null,
      },
    });
    const items = await buildPortfolio(client, USER_ID);
    expect(items[0].category).toBe("leadership");
    expect(items[0].meta).toBe("Led 12 people");
  });

  test("a failed read for one category (awards) falls back to [] for just that category, logged by name, other categories unaffected", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      awards: { data: null, error: { message: "boom" } },
      projects: { data: [{ id: "p1", title: "Project", organization: null, outcome_summary: null, description: null, start_date: "2026-01-01", end_date: null, ongoing: true, role: null, created_at: "t", evidence_status: null }], error: null },
    });
    const items = await buildPortfolio(client, USER_ID);
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe("projects");
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("buildPortfolio.awards"))).toBe(true);
    spy.mockRestore();
  });

  test("multiple simultaneous category failures are each named", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      sports_experiences: { data: null, error: { message: "boom" } },
      research_experiences: { data: null, error: { message: "boom too" } },
    });
    await buildPortfolio(client, USER_ID);
    const messages = spy.mock.calls.map(([m]) => m);
    expect(messages.some((m) => typeof m === "string" && m.includes("buildPortfolio.sports"))).toBe(true);
    expect(messages.some((m) => typeof m === "string" && m.includes("buildPortfolio.research"))).toBe(true);
    spy.mockRestore();
  });
});

describe("getPortfolioSkills", () => {
  test("success: sorted by category then name, logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      skills: {
        data: [
          { id: "s1", name: "Python", category: "technical" },
          { id: "s2", name: "Public speaking", category: "communication" },
          { id: "s3", name: "Excel", category: "technical" },
        ],
        error: null,
      },
    });
    const skills = await getPortfolioSkills(client, USER_ID);
    expect(skills.map((s) => s.id)).toEqual(["s2", "s3", "s1"]); // communication before technical, then alpha within technical
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed read returns [] (unchanged) but is logged, not silent", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ skills: { data: null, error: { message: "boom" } } });
    const skills = await getPortfolioSkills(client, USER_ID);
    expect(skills).toEqual([]);
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("getPortfolioSkills"))).toBe(true);
    spy.mockRestore();
  });
});
