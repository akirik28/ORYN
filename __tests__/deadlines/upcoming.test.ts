import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getUpcomingOpportunityDeadlines, deadlineDetailLabel } from "@/lib/deadlines/upcoming";

/**
 * getUpcomingOpportunityDeadlines feeds the dashboard's "Due soon" widget (Phase 23).
 * Isolated from getUpcomingDeadlines' other two sources (applications, university
 * deadlines) deliberately — this file only needs to mock the two tables this one
 * function actually touches (`saved_opportunities`, `opportunities`), following the
 * same hand-rolled chainable-mock approach __tests__/entities/search.test.ts already
 * uses for the same reason (no local Postgres to exercise the real query against).
 *
 * Written per ORYN-CEO's explicit ordering for this package: the first describe block
 * ("a normal, genuinely-open opportunity") pins what this function already returns
 * *before* the cycle_status guard is added, and must keep passing unchanged afterwards
 * — proof the fix only removes the defective rows below, not the good ones. The second
 * block encodes the defect this package fixes and is expected to fail against the
 * pre-fix code.
 */

type OpportunityRow = {
  id: string;
  title: string;
  deadline: string | null;
  cycle_status: Database["public"]["Tables"]["opportunities"]["Row"]["cycle_status"];
  /** Optional in the fixtures, defaulted to "active" by `makeSupabase` below: every real
   * row has one, and spelling it out on the dozen cases that are not about moderation would
   * bury the two that are. Set it explicitly to test the moderation gate. */
  status?: Database["public"]["Tables"]["opportunities"]["Row"]["status"];
};
type SavedOpportunityRow = { opportunity_id: string; user_id: string; status: string };

function makeQueryBuilder<T extends Record<string, unknown>>(rows: T[]) {
  let filtered = [...rows];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: keyof T, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    }),
    in: vi.fn((column: keyof T, values: unknown[]) => {
      filtered = filtered.filter((row) => values.includes(row[column]));
      return builder;
    }),
    // Mirrors search.test.ts's simplification: this suite only ever calls
    // .not(col, "is", null), so that's the only shape handled.
    not: vi.fn((column: keyof T, _operator: "is", value: null) => {
      filtered = filtered.filter((row) => row[column] !== value);
      return builder;
    }),
    gte: vi.fn((column: keyof T, value: string) => {
      filtered = filtered.filter((row) => (row[column] as string) >= value);
      return builder;
    }),
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { saved_opportunities: SavedOpportunityRow[]; opportunities: OpportunityRow[] }) {
  // Every real `opportunities` row has a moderation status, and since 2026-08-31 the
  // lifecycle gate reads it. Defaulting here keeps the cases that are about cycles and
  // deadlines saying only what they mean, while a case that sets it explicitly still wins.
  const opportunities = tables.opportunities.map((row) => ({ status: "active" as const, ...row }));
  return {
    from: vi.fn((table: "saved_opportunities" | "opportunities") =>
      table === "saved_opportunities" ? makeQueryBuilder(tables.saved_opportunities) : makeQueryBuilder(opportunities)
    ),
  } as unknown as SupabaseClient<Database>;
}

const USER_ID = "student-1";
const TODAY = "2026-08-22";

describe("getUpcomingOpportunityDeadlines — pinned current behavior", () => {
  test("a normal, genuinely-open opportunity with a future deadline is returned", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Breakthrough Junior Challenge", deadline: "2026-11-01", cycle_status: "open" }],
    });

    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);

    expect(result).toEqual([
      { id: "opportunity-opp-1", source: "opportunity", title: "Breakthrough Junior Challenge", date: "2026-11-01", href: "/opportunities", sourceUnverified: false },
    ]);
  });

  test("no saved opportunities returns an empty list without querying opportunities", async () => {
    const supabase = makeSupabase({ saved_opportunities: [], opportunities: [] });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toEqual([]);
  });

  test("a saved opportunity with no deadline is excluded (unchanged by this package)", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "No Deadline Yet", deadline: null, cycle_status: "open" }],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toEqual([]);
  });

  test("a saved opportunity with a past deadline is excluded (unchanged by this package)", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Already Closed", deadline: "2026-01-01", cycle_status: "open" }],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toEqual([]);
  });

  test("a saved opportunity that has since been disabled is not counted down to", async () => {
    // The other half of the same 2026-08-31 leak: a student can save an opportunity that is
    // later pulled, and the deadline engine would keep counting down to it. Being saved is
    // not a reason to keep surfacing a record Proxola has withdrawn.
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [
        { id: "opp-1", title: "Pulled Programme", deadline: "2026-11-01", cycle_status: "open", status: "disabled" },
      ],
    });

    expect(await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY)).toEqual([]);
  });

  test("an under_review opportunity is not counted down to either", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [
        { id: "opp-1", title: "Not Yet Vetted", deadline: "2026-11-01", cycle_status: "open", status: "under_review" },
      ],
    });

    expect(await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY)).toEqual([]);
  });

  test("cycle_status='unverified' with a future deadline is still returned — unconfirmed is not the same claim as wrong", async () => {
    // This is the load-bearing case for the fix below: applying lib/opportunities/
    // lifecycle.ts's isOpportunityActionable must not start hiding merely-unverified
    // rows, only the confirmed-non-actionable ones. Passes both before and after.
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Conrad Challenge", deadline: "2026-10-30", cycle_status: "unverified" }],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Conrad Challenge");
  });
});

describe("getUpcomingOpportunityDeadlines — cycle_status guard (this package's fix)", () => {
  test("a closed-cycle opportunity with a future deadline is NOT returned", async () => {
    // Confirmed live 2026-08-22 (docs/feat2-loop-audit-2026-08-22.md): LaunchX carries
    // exactly this shape in the real oryn-qa-scratch database — cycle_status='closed',
    // status='active', deadline 82 days out. Before this package's fix, this test fails
    // (the row comes back as an upcoming deadline).
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "LaunchX", deadline: "2026-11-12", cycle_status: "closed" }],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toEqual([]);
  });

  test("a historical-cycle opportunity with a future deadline is NOT returned", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Old Program", deadline: "2026-12-01", cycle_status: "historical" }],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toEqual([]);
  });

  test("a discontinued opportunity with a future deadline is NOT returned", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: USER_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Discontinued Program", deadline: "2026-12-01", cycle_status: "discontinued" }],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result).toEqual([]);
  });

  test("one actionable and one non-actionable saved opportunity: only the actionable one is returned", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [
        { opportunity_id: "opp-open", user_id: USER_ID, status: "saved" },
        { opportunity_id: "opp-closed", user_id: USER_ID, status: "saved" },
      ],
      opportunities: [
        { id: "opp-open", title: "Still Open", deadline: "2026-09-10", cycle_status: "open" },
        { id: "opp-closed", title: "LaunchX", deadline: "2026-11-12", cycle_status: "closed" },
      ],
    });
    const result = await getUpcomingOpportunityDeadlines(supabase, USER_ID, TODAY);
    expect(result.map((d) => d.title)).toEqual(["Still Open"]);
  });
});

/**
 * Regression coverage for the "four indistinguishable Yale deadlines" defect: the dashboard's
 * "Due soon" widget and the deadline-reminder notification (lib/deadlines/scan.ts) both used
 * to build their student-facing label from `deadline_type` alone — a coarse category shared by
 * every cycle of the same kind at a university, not an actual differentiator. Real Yale data
 * (confirmed live by ORYN-BASORG) has four `deadline_type: "scholarship"` rows that are
 * genuinely distinct cycles, only two of which even have distinct `cycle_label`s.
 */
describe("deadlineDetailLabel", () => {
  test("prefers deadline_text_verbatim when present, even if cycle_label also exists", () => {
    expect(
      deadlineDetailLabel({
        deadline_text_verbatim: "Early Action (US Citizens/Permanent Residents): November 1, 2026",
        cycle_label: "Single-Choice Early Action",
        deadline_type: "scholarship",
      })
    ).toBe("Early Action (US Citizens/Permanent Residents): November 1, 2026");
  });

  test("the real Yale case: two rows share deadline_type AND cycle_label — only verbatim tells them apart", () => {
    const earlyActionDomestic = deadlineDetailLabel({
      deadline_text_verbatim: "Early Action (US Citizens/Permanent Residents): November 1, 2026",
      cycle_label: "Single-Choice Early Action",
      deadline_type: "scholarship",
    });
    const earlyActionInternational = deadlineDetailLabel({
      deadline_text_verbatim: "Early Action (International Citizens): December 1, 2026",
      cycle_label: "Single-Choice Early Action",
      deadline_type: "scholarship",
    });
    expect(earlyActionDomestic).not.toBe(earlyActionInternational);
  });

  test("falls back to cycle_label when verbatim is null", () => {
    expect(
      deadlineDetailLabel({
        deadline_text_verbatim: null,
        cycle_label: "Regular Decision",
        deadline_type: "scholarship",
      })
    ).toBe("Regular Decision");
  });

  test("falls back to deadline_type when both verbatim and cycle_label are null (pre-migration-0056 rows)", () => {
    expect(
      deadlineDetailLabel({
        deadline_text_verbatim: null,
        cycle_label: null,
        deadline_type: "application",
      })
    ).toBe("application");
  });
});
