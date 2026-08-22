import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity, OpportunityMatch } from "@/types/database";
import { browseOpportunities } from "@/lib/opportunities/browse";

/**
 * Package 8: pins the fix for the live "38/72-row" Browse gap (docs/founder-blocked-
 * backlog.md item 37's second live defect) — a missing opportunity_matches row previously
 * fell back to `eligible: true, eligibilityNotes: null`, asserting a confirmed-open match
 * that was never actually computed. Hand-rolled chainable mock, same approach
 * __tests__/deadlines/upcoming.test.ts already uses for the identical reason (no local
 * Postgres to exercise the real query against).
 */

function opportunity(id: string, overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title: id,
    organization: "Test Org",
    description: null,
    category: "competition",
    official_url: null,
    application_url: null,
    country: null,
    remote_allowed: null,
    minimum_age: null,
    maximum_age: null,
    eligible_countries: [],
    fields: [],
    cost: null,
    funding_available: null,
    deadline: null,
    start_date: null,
    end_date: null,
    source: null,
    source_url: null,
    source_confidence: "high",
    last_verified_at: null,
    status: "active",
    normalized_title: id,
    cycle_status: "open",
    selectivity_tier: "unknown",
    verification_state: "verified_current",
    application_open_date: null,
    eligible_grades: [],
    citizenship_restrictions: null,
    residency_restrictions: null,
    eligible_citizenships: [],
    location_mode: null,
    financial_aid_available: null,
    application_requirements: [],
    current_cycle_label: null,
    verified_at: null,
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
    country_eligibility_confirmed_open: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function match(overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: "match-1",
    user_id: "student-1",
    opportunity_id: "opp-1",
    eligible: true,
    eligibility_notes: null,
    relevance_score: 50,
    profile_need_score: 50,
    effort_estimate: null,
    match_score: 50,
    reason_codes: [],
    calculated_at: "2026-08-22T00:00:00Z",
    ...overrides,
  };
}

function makeQueryBuilder<T extends object>(rows: T[]) {
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
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { opportunities: Opportunity[]; opportunity_matches: OpportunityMatch[] }) {
  return {
    from: vi.fn((table: "opportunities" | "opportunity_matches") =>
      table === "opportunities" ? makeQueryBuilder(tables.opportunities) : makeQueryBuilder(tables.opportunity_matches)
    ),
  } as unknown as SupabaseClient<Database>;
}

const USER_ID = "student-1";

describe("browseOpportunities — pinned current behavior", () => {
  test("an opportunity with a real match row is returned exactly as computed, unaffected by this package", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-1")],
      opportunity_matches: [match({ opportunity_id: "opp-1", eligible: true, eligibility_notes: null, match_score: 77 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows).toHaveLength(1);
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes).toBeNull();
    expect(rows[0].matchScore).toBe(77);
  });

  test("a real match row carrying an unknown-eligibility note passes it through unchanged", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-1")],
      opportunity_matches: [match({ opportunity_id: "opp-1", eligible: true, eligibility_notes: "Restricted by country — add your country to check." })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes).toBe("Restricted by country — add your country to check.");
  });
});

describe("browseOpportunities — missing match row (Package 8 fix)", () => {
  test("a closed-cycle opportunity with no match row is never defaulted to eligible: true", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-closed", { cycle_status: "closed" })],
      opportunity_matches: [],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows).toHaveLength(1);
    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is closed/i);
  });

  test("a historical opportunity with no match row surfaces its actual cycle status, not a generic message", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-historical", { cycle_status: "historical" })],
      opportunity_matches: [],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is historical/i);
  });

  test("a discontinued opportunity with no match row is marked ineligible with the real reason", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-discontinued", { cycle_status: "discontinued" })],
      opportunity_matches: [],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is discontinued/i);
  });

  // isOpportunityActionable's second, independent exclusion (lib/opportunities/lifecycle.ts):
  // a deadline can quietly pass while cycle_status still says "open". The note must describe
  // THIS reason, not claim "current cycle is open" one sentence away from eligible: false.
  test("a deadline-passed opportunity whose cycle_status still says open gets deadline-specific wording, not a self-contradicting one", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-passed-deadline", { cycle_status: "open", deadline: "2020-01-01" })],
      opportunity_matches: [],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/deadline has passed/i);
    expect(rows[0].eligibilityNotes).not.toMatch(/current cycle is open/i);
  });

  // Verified against oryn-qa-scratch (2026-08-22): this case is empirically 0/271 live rows
  // today (refreshOpportunityMatches runs before browseOpportunities on every real page
  // load), but the code must still answer honestly if it ever happens — e.g. the admin
  // client being unavailable (see refreshOpportunityMatches's own docstring).
  test("an actionable opportunity with no match row (match refresh hasn't run) reads as unknown, not confirmed eligible", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-unmatched", { cycle_status: "open", deadline: null })],
      opportunity_matches: [],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(true); // unknown must never read as a known exclusion either
    expect(rows[0].eligibilityNotes).toMatch(/hasn't been checked/i);
  });

  test("a mix of matched and unmatched opportunities only changes the unmatched rows", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-matched", { cycle_status: "open" }), opportunity("opp-closed", { cycle_status: "closed" })],
      opportunity_matches: [match({ opportunity_id: "opp-matched", eligible: true, eligibility_notes: null, match_score: 90 })],
    });

    const { rows, total } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(total).toBe(2);
    const matched = rows.find((r) => r.opportunity.id === "opp-matched")!;
    const closed = rows.find((r) => r.opportunity.id === "opp-closed")!;
    expect(matched.eligible).toBe(true);
    expect(matched.eligibilityNotes).toBeNull();
    expect(closed.eligible).toBe(false);
    expect(closed.eligibilityNotes).toMatch(/closed/i);
  });
});
