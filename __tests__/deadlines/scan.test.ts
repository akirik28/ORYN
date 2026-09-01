import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

/**
 * scanSavedOpportunityDeadlines feeds the deadline-reminder job's saved-opportunity source
 * (Phase 24; see lib/deadlines/scan.ts's own scanDeadlines doc comment for why this is NOT
 * Phase 30 Job B). Isolated from scanDeadlines' other two sources the same way
 * upcoming.test.ts isolates its sibling read-side function — neither is touched by the code
 * under test here.
 *
 * This package changed what the function DOES with a crossed threshold (returns a
 * DeadlineHit for the caller to dedupe/aggregate instead of calling createNotification
 * directly) without touching the cycle_status actionability guard itself — see
 * scan-applications.test.ts's header for the full "one file, one concern" split this
 * reflects. The first describe block below pins that guard's already-correct behavior; the
 * second is unchanged from before this package.
 *
 * `TRANSLATORS` reproduces messages/en.json's real `applicationDeadlineApproaching` string
 * for this source's body shape (saved opportunities reuse the application source's own
 * sentence template — there's no opportunity-specific one).
 */

import { scanSavedOpportunityDeadlines } from "@/lib/deadlines/scan";

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
type ProfileRow = { id: string; preferred_language: string | null };

function makeQueryBuilder<T extends Record<string, unknown>>(rows: T[]) {
  let filtered = [...rows];
  const builder = {
    select: () => builder,
    eq: (column: keyof T, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    },
    in: (column: keyof T, values: unknown[]) => {
      filtered = filtered.filter((row) => values.includes(row[column]));
      return builder;
    },
    not: (column: keyof T, _operator: "is", value: null) => {
      filtered = filtered.filter((row) => row[column] !== value);
      return builder;
    },
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { saved_opportunities: SavedOpportunityRow[]; opportunities: OpportunityRow[]; profiles?: ProfileRow[] }) {
  const profiles = tables.profiles ?? [];
  // Every real `opportunities` row has a moderation status, and since 2026-08-31 the
  // lifecycle gate reads it. Defaulting here keeps the cases that are about cycles and
  // deadlines saying only what they mean, while a case that sets it explicitly still wins.
  const opportunities = tables.opportunities.map((row) => ({ status: "active" as const, ...row }));
  return {
    from: (table: "saved_opportunities" | "opportunities" | "profiles") => {
      if (table === "saved_opportunities") return makeQueryBuilder(tables.saved_opportunities);
      if (table === "opportunities") return makeQueryBuilder(opportunities);
      return makeQueryBuilder(profiles);
    },
  } as unknown as SupabaseClient<Database>;
}

const STUDENT_ID = "student-1";
// A fixed "today" 7 days before the deadline used throughout — 7 is one of
// REMINDER_THRESHOLDS, so a normal open opportunity is expected to produce a hit.
const TODAY = new Date("2026-08-22T00:00:00");
const DEADLINE_7_DAYS_OUT = "2026-08-29";

const TRANSLATORS: Record<Locale, (key: string, values?: Record<string, string | number>) => string> = {
  en: (key, values) => (key === "applicationDeadlineApproaching" ? `${values?.name} — application deadline approaching.` : key),
  tr: (key, values) => (key === "applicationDeadlineApproaching" ? `${values?.name} — başvuru son tarihi yaklaşıyor.` : key),
};

describe("scanSavedOpportunityDeadlines — pinned current behavior", () => {
  test("a normal, genuinely-open opportunity at a reminder threshold produces one hit", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Breakthrough Junior Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" }],
    });

    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);

    expect(result.checked).toBe(1);
    expect(result.hits).toEqual([
      {
        userId: STUDENT_ID,
        locale: "en",
        source: "opportunity",
        sourceId: "opp-1",
        daysUntil: 7,
        link: "/opportunities",
        itemLabel: "Breakthrough Junior Challenge",
        singleBody: "Breakthrough Junior Challenge — application deadline approaching.",
      },
    ]);
  });

  test("a saved opportunity whose deadline is not at any threshold does not produce a hit (unchanged by this package)", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Not Due Soon", deadline: "2026-12-25", cycle_status: "open" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 1 });
  });

  test("no saved opportunities returns zero without checking anything", async () => {
    const supabase = makeSupabase({ saved_opportunities: [], opportunities: [] });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  test("cycle_status='unverified' at a reminder threshold still produces a hit — unconfirmed is not the same claim as wrong", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Conrad Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "unverified" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result.checked).toBe(1);
    expect(result.hits).toHaveLength(1);
  });

  test("a student with preferred_language='tr' gets a Turkish body on the hit", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Conrad Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "tr" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result.hits[0].locale).toBe("tr");
    expect(result.hits[0].singleBody).toBe("Conrad Challenge — başvuru son tarihi yaklaşıyor.");
  });
});

describe("scanSavedOpportunityDeadlines — cycle_status guard (unchanged by this package)", () => {
  test("a closed-cycle opportunity at a reminder threshold does NOT produce a hit", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "LaunchX", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "closed" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  test("a historical-cycle opportunity at a reminder threshold does NOT produce a hit", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Old Program", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "historical" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ hits: [], checked: 0 });
  });

  test("one actionable and one non-actionable saved opportunity: only the actionable one is checked and produces a hit", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [
        { opportunity_id: "opp-open", user_id: STUDENT_ID, status: "saved" },
        { opportunity_id: "opp-closed", user_id: STUDENT_ID, status: "saved" },
      ],
      opportunities: [
        { id: "opp-open", title: "Still Open", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" },
        { id: "opp-closed", title: "LaunchX", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "closed" },
      ],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result.checked).toBe(1);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].sourceId).toBe("opp-open");
  });

  test("two actionable saved opportunities at a threshold for the same student produce two separate hits — aggregation happens later, not here", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [
        { opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" },
        { opportunity_id: "opp-2", user_id: STUDENT_ID, status: "saved" },
      ],
      opportunities: [
        { id: "opp-1", title: "Conrad Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" },
        { id: "opp-2", title: "Breakthrough Junior Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" },
      ],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result.hits).toHaveLength(2);
    // Both hits share the same generic `link` — exactly why dedupe (migration 0075) keys on
    // (source, source_id, threshold_days) rather than on link, unlike the pre-this-package design.
    expect(new Set(result.hits.map((h) => h.link))).toEqual(new Set(["/opportunities"]));
    expect(result.hits.map((h) => h.sourceId).sort()).toEqual(["opp-1", "opp-2"]);
  });
});
