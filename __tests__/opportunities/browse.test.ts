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
    // Verified by default, matching this fixture's own `verification_state: "verified_current"`
    // two lines down. The two were inconsistent — the enum claimed a verification the timestamp
    // said never happened, which is precisely the live data contradiction the freshness gate
    // (lib/opportunities/lifecycle.ts) exists to catch. Left as null, every fixture here would
    // silently be in the gated shape and no test could say anything about anything else. The
    // freshness suite at the bottom of this file overrides it back to null explicitly.
    last_verified_at: "2026-08-20T00:00:00Z",
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
    languages_of_instruction: [],
    image_url: null,
    image_source_url: null,
    image_attribution: null,
    current_cycle_label: null,
    verified_at: null,
    source_verified_at: null,
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
    eligibility_notes: [],
    relevance_score: 50,
    profile_need_score: 50,
    effort_estimate: null,
    match_confidence: null,
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
      opportunity_matches: [match({ opportunity_id: "opp-1", eligible: true, eligibility_notes: [], match_score: 77 })],
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
      opportunity_matches: [match({ opportunity_id: "opp-1", eligible: true, eligibility_notes: [{ code: "country_unknown" }] })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes).toBe("Restricted by country — add your country to check.");
  });
});

/**
 * A stored opportunity_matches row is a snapshot of an eligibility answer computed at some
 * earlier moment, and lib/opportunities/persist-matches.ts deliberately never deletes one when
 * the opportunity later stops being actionable. Browse therefore has to re-apply the lifecycle
 * gate at read time to whatever the row says, exactly as the no-match branch below already
 * does — otherwise a cycle that closed (or a deadline that passed) after the row was written
 * keeps rendering as a live, eligible match.
 */
describe("browseOpportunities — stale match row on a non-actionable opportunity", () => {
  test("a match row saying eligible: true does not survive its opportunity's cycle closing", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-closed", { cycle_status: "closed" })],
      opportunity_matches: [match({ opportunity_id: "opp-closed", eligible: true, eligibility_notes: [], match_score: 77 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is closed/i);
  });

  // The live worst case (2026-08-23): opportunity 27274e04-50f4-4e82-9b7e-c5dbaace4bbe,
  // "GENIUS Olympiad" — cycle_status 'date_not_announced' with a deadline five months gone,
  // carrying eligible = true in opportunity_matches. It rendered as "Strong match" with no
  // closure signal at all: the cycle badge said "Next dates not announced" (true, and entirely
  // beside the point) and the deadline badge is suppressed for a negative days-until. The note
  // must name the passed deadline, never the cycle status, which here would tell the student
  // nothing about why they can't act.
  test("a stale eligible row on a past-deadline opportunity is caught even when cycle_status is still a legitimately-actionable value", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-genius", { cycle_status: "date_not_announced", deadline: "2026-03-07" })],
      opportunity_matches: [match({ opportunity_id: "opp-genius", eligible: true, eligibility_notes: [], match_score: 68 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/deadline has passed/i);
    expect(rows[0].eligibilityNotes).not.toMatch(/date not announced/i);
  });

  test("a stale row's own eligibility note is replaced by the lifecycle reason, not shown alongside a false eligible: true", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-historical", { cycle_status: "historical" })],
      opportunity_matches: [
        match({ opportunity_id: "opp-historical", eligible: true, eligibility_notes: [{ code: "country_unknown" }] }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is historical/i);
  });

  test("a match row saying eligible: false on a non-actionable opportunity stays ineligible", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-discontinued", { cycle_status: "discontinued" })],
      opportunity_matches: [match({ opportunity_id: "opp-discontinued", eligible: false, eligibility_notes: [{ code: "country_not_eligible", params: { studentCountry: "Turkey" } }] })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is discontinued/i);
  });

  // The guard must not over-fire: an opportunity that is still actionable keeps whatever the
  // stored row computed, including a genuine eligible: false for a real per-student mismatch.
  test("an actionable opportunity's stored verdict is passed through untouched, in both directions", async () => {
    const supabase = makeSupabase({
      opportunities: [
        opportunity("opp-open-eligible", { cycle_status: "open", deadline: "2099-01-01" }),
        opportunity("opp-open-ineligible", { cycle_status: "upcoming", deadline: null }),
      ],
      opportunity_matches: [
        match({ id: "m1", opportunity_id: "opp-open-eligible", eligible: true, eligibility_notes: [], match_score: 90 }),
        match({ id: "m2", opportunity_id: "opp-open-ineligible", eligible: false, eligibility_notes: [{ code: "country_not_eligible", params: { studentCountry: "Turkey" } }], match_score: 10 }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    const open = rows.find((r) => r.opportunity.id === "opp-open-eligible")!;
    const ineligible = rows.find((r) => r.opportunity.id === "opp-open-ineligible")!;

    expect(open.eligible).toBe(true);
    expect(open.eligibilityNotes).toBeNull();
    expect(ineligible.eligible).toBe(false);
    expect(ineligible.eligibilityNotes).toBe("Not currently open to students from Turkey.");
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
      opportunity_matches: [match({ opportunity_id: "opp-matched", eligible: true, eligibility_notes: [], match_score: 90 })],
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

/**
 * Freshness gate — Browse DEMOTES and LABELS rather than excluding.
 *
 * Browse is the "see everything" surface and deliberately keeps ineligible rows visible
 * (browse.ts's own docstring): hiding a row here would tell a student the opportunity does not
 * exist, which is a worse lie than the one being fixed. So the gate here only (a) marks the row
 * `needsVerification`, so the card can drop its confidence tier for an honest "Needs
 * verification" badge, and (b) sorts it below every confident row at the same score.
 *
 * Critically it must NOT flip `eligible` to false. That column drives "Not eligible" wording,
 * and this is a fact about Proxola's evidence, not about the student.
 */
describe("browseOpportunities — insufficient verification is labelled, never hidden and never called ineligible", () => {
  test("a never-verified, deadline-less opportunity is flagged needsVerification but stays visible and eligible", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-stanford", { cycle_status: "upcoming", deadline: null, last_verified_at: null })],
      opportunity_matches: [match({ opportunity_id: "opp-stanford", eligible: true, eligibility_notes: [], match_score: 82 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);

    expect(rows).toHaveLength(1);
    expect(rows[0].needsVerification).toBe(true);
    // Not an eligibility claim about the student, and not a closure claim about the cycle.
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes ?? "").not.toMatch(/not eligible|ineligible|closed/i);
  });

  test("the note it carries names verification as the reason", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-stanford", { cycle_status: "upcoming", deadline: null, last_verified_at: null })],
      opportunity_matches: [match({ opportunity_id: "opp-stanford", eligible: true, eligibility_notes: [] })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligibilityNotes).toMatch(/verif/i);
  });

  test("a verified opportunity is not flagged, and its stored note is untouched", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-verified", { cycle_status: "open", deadline: null, last_verified_at: "2026-08-20T00:00:00Z" })],
      opportunity_matches: [match({ opportunity_id: "opp-verified", eligible: true, eligibility_notes: [], match_score: 60 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].needsVerification).toBe(false);
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes).toBeNull();
  });

  test("an unverified row sorts below a confident row that scored lower", async () => {
    const supabase = makeSupabase({
      opportunities: [
        opportunity("opp-unverified", { cycle_status: "upcoming", deadline: null, last_verified_at: null }),
        opportunity("opp-confident", { cycle_status: "open", deadline: "2026-12-01", last_verified_at: "2026-08-20T00:00:00Z" }),
      ],
      opportunity_matches: [
        match({ opportunity_id: "opp-unverified", match_score: 95 }),
        match({ opportunity_id: "opp-confident", match_score: 40 }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows.map((r) => r.opportunity.id)).toEqual(["opp-confident", "opp-unverified"]);
  });

  test("a closed cycle still wins the explanation -- the freshness note never displaces #140/#141 wording", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-closed", { cycle_status: "closed", deadline: null, last_verified_at: null })],
      opportunity_matches: [match({ opportunity_id: "opp-closed", eligible: true, eligibility_notes: [] })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligible).toBe(false);
    expect(rows[0].eligibilityNotes).toMatch(/current cycle is closed/i);
  });
});

/**
 * FIXED 2026-09-02 (docs/opportunity-deadline-coverage-2026-09-02.md): the sort key only
 * ever demoted `needsVerification`, but a `notActionable` row (closed cycle / passed
 * deadline) is `eligible: false` by construction (resolveStoredEligibility), which makes
 * `needsVerification` false too — so it landed in the SAME top sort bucket as a genuinely
 * open, verified row, ranked only by match score. A closed opportunity with a high score
 * could outrank an open one with a lower score, even though its own card correctly says
 * "deadline has passed". The row still isn't hidden (Browse deliberately doesn't narrow
 * what's visible) — only its ranking changed.
 */
describe("browseOpportunities — a notActionable row is demoted in sort, same as needsVerification", () => {
  test("a closed-cycle row with a higher score no longer outranks an open, verified row with a lower one", async () => {
    const supabase = makeSupabase({
      opportunities: [
        opportunity("opp-closed-high-score", { cycle_status: "closed" }),
        opportunity("opp-open-low-score", { cycle_status: "open", deadline: "2026-12-01", last_verified_at: "2026-08-20T00:00:00Z" }),
      ],
      opportunity_matches: [
        match({ opportunity_id: "opp-closed-high-score", eligible: true, eligibility_notes: [], match_score: 95 }),
        match({ opportunity_id: "opp-open-low-score", eligible: true, eligibility_notes: [], match_score: 40 }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows.map((r) => r.opportunity.id)).toEqual(["opp-open-low-score", "opp-closed-high-score"]);
  });

  test("a past-deadline row with a higher score no longer outranks a genuinely open row with a lower one", async () => {
    const supabase = makeSupabase({
      opportunities: [
        opportunity("opp-past-deadline-high-score", { cycle_status: "open", deadline: "2020-01-01" }),
        opportunity("opp-future-deadline-low-score", { cycle_status: "open", deadline: "2026-12-01", last_verified_at: "2026-08-20T00:00:00Z" }),
      ],
      opportunity_matches: [
        match({ opportunity_id: "opp-past-deadline-high-score", eligible: true, eligibility_notes: [], match_score: 90 }),
        match({ opportunity_id: "opp-future-deadline-low-score", eligible: true, eligibility_notes: [], match_score: 30 }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows.map((r) => r.opportunity.id)).toEqual(["opp-future-deadline-low-score", "opp-past-deadline-high-score"]);
  });

  test("the row keeps its place in the catalogue -- demoted, never hidden", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-closed", { cycle_status: "closed" })],
      opportunity_matches: [match({ opportunity_id: "opp-closed", eligible: true, eligibility_notes: [], match_score: 99 })],
    });

    const { rows, total } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(total).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].notActionable).toBe(true);
  });
});

describe("browseOpportunities — a stored eligibility note and the verification caveat coexist", () => {
  test("both are shown: they answer different questions and the badge would otherwise be unexplained", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-both", { cycle_status: "open", deadline: null, last_verified_at: null })],
      opportunity_matches: [
        match({ opportunity_id: "opp-both", eligible: true, eligibility_notes: [{ code: "country_unknown" }] }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].eligibilityNotes).toMatch(/Restricted by country/);
    expect(rows[0].eligibilityNotes).toMatch(/verif/i);
  });
});

/**
 * Regression (#143 follow-up) — Browse must not caveat a row for pipeline lineage.
 *
 * 51 live rows had no `last_verified_at` purely because the 0041-era pipeline recorded into
 * `verified_at` instead; all 51 are `verification_state='verified_current'` and
 * `source_confidence='high'`. Browse demoted and badged every one of them "Needs verification",
 * which told a student Proxola couldn't vouch for the most carefully researched records it has.
 *
 * The demote-and-label treatment itself is kept exactly as #143 shipped it — it is the right
 * response to a genuine absence of evidence, and the wording below is still pinned. Only the
 * signal that triggers it changed.
 */
describe("browseOpportunities — a legacy-generation row is neither demoted nor badged", () => {
  const legacyGeneration = { cycle_status: "open" as const, deadline: null, last_verified_at: null, verified_at: "2026-08-18T00:00:00Z" };

  test("verified through `verified_at` alone: not flagged, not caveated", async () => {
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-legacy", legacyGeneration)],
      opportunity_matches: [match({ opportunity_id: "opp-legacy", eligible: true, eligibility_notes: [], match_score: 82 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].needsVerification).toBe(false);
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes).toBeNull();
  });

  test("it keeps its ranking -- no longer sorted below a lower-scoring row", async () => {
    const supabase = makeSupabase({
      opportunities: [
        opportunity("opp-legacy", legacyGeneration),
        opportunity("opp-confident", { cycle_status: "open", deadline: "2026-12-01", last_verified_at: "2026-08-20T00:00:00Z" }),
      ],
      opportunity_matches: [
        match({ opportunity_id: "opp-legacy", match_score: 95 }),
        match({ opportunity_id: "opp-confident", match_score: 40 }),
      ],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows.map((r) => r.opportunity.id)).toEqual(["opp-legacy", "opp-confident"]);
  });

  test("a row with no evidence at all is still demoted and still badged truthfully", async () => {
    // The preserved half: #143's product language and treatment are intact where the gate
    // genuinely applies. Never "closed", never "not eligible".
    const supabase = makeSupabase({
      opportunities: [opportunity("opp-no-evidence", { cycle_status: "upcoming", deadline: null, last_verified_at: null, verified_at: null })],
      opportunity_matches: [match({ opportunity_id: "opp-no-evidence", eligible: true, eligibility_notes: [], match_score: 82 })],
    });

    const { rows } = await browseOpportunities(supabase, USER_ID, {}, 1);
    expect(rows[0].needsVerification).toBe(true);
    expect(rows[0].eligible).toBe(true);
    expect(rows[0].eligibilityNotes).toMatch(/verif/i);
    expect(rows[0].eligibilityNotes ?? "").not.toMatch(/not eligible|ineligible|closed/i);
  });
});
