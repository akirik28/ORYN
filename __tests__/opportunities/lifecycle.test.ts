import { describe, expect, test } from "vitest";
import {
  INSUFFICIENT_VERIFICATION_REASON,
  MAX_VERIFICATION_AGE_DAYS,
  NEEDS_VERIFICATION_LABEL,
  NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES,
  type OpportunityVerificationFacts,
  deriveCycleStatusForPassedDeadline,
  filterActionableOpportunities,
  hasDeadlineCommitment,
  isOpportunityActionable,
  isOpportunityRecommendable,
  isOpportunitySufficientlyVerified,
  nonActionableOpportunityReason,
  resolveStoredEligibility,
} from "@/lib/opportunities/lifecycle";
import type { Opportunity } from "@/types/database";

const REFERENCE_DATE = new Date("2026-08-22T00:00:00");

function row(overrides: Partial<Pick<Opportunity, "cycle_status" | "deadline">> = {}): Pick<Opportunity, "cycle_status" | "deadline"> {
  return {
    cycle_status: "unverified",
    deadline: null,
    ...overrides,
  };
}

describe("isOpportunityActionable", () => {
  test("is actionable when cycle_status is open and deadline is in the future", () => {
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-09-15" }), REFERENCE_DATE)).toBe(true);
  });

  test("is actionable when cycle_status is unverified and there is no deadline", () => {
    expect(isOpportunityActionable(row({ cycle_status: "unverified", deadline: null }), REFERENCE_DATE)).toBe(true);
  });

  test("is actionable when cycle_status is upcoming and there is no deadline yet", () => {
    expect(isOpportunityActionable(row({ cycle_status: "upcoming", deadline: null }), REFERENCE_DATE)).toBe(true);
  });

  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`is never actionable when cycle_status is '${cycleStatus}', even with a future deadline`, () => {
      expect(isOpportunityActionable(row({ cycle_status: cycleStatus, deadline: "2027-01-01" }), REFERENCE_DATE)).toBe(false);
    });

    test(`is never actionable when cycle_status is '${cycleStatus}' with no deadline at all`, () => {
      expect(isOpportunityActionable(row({ cycle_status: cycleStatus, deadline: null }), REFERENCE_DATE)).toBe(false);
    });
  }

  test("is not actionable once its deadline has passed, even if cycle_status was never updated (the Boston University Tanglewood case)", () => {
    // Confirmed live 2026-08-22: this exact row already carries cycle_status='historical' in
    // production, but the read-time date check must independently catch a passed deadline on
    // any row whose cycle_status hasn't (yet) been corrected -- that's the whole point of
    // defense in depth rather than trusting a single field.
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-01-25" }), REFERENCE_DATE)).toBe(false);
  });

  test("treats the deadline as actionable through the end of its own day", () => {
    const sameDayAsReference = new Date("2026-08-22T23:00:00");
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-08-22" }), sameDayAsReference)).toBe(true);
  });

  test("is not actionable the instant the deadline day has fully elapsed", () => {
    const dayAfter = new Date("2026-08-23T00:00:01");
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-08-22" }), dayAfter)).toBe(false);
  });

  test("cannot detect a closed cycle from stored data alone when cycle_status is unverified and deadline is null (the Stanford SASI case)", () => {
    // Confirmed live 2026-08-22: Stanford Anesthesia Summer Institute is active,
    // cycle_status='upcoming', deadline null, while its own page says all three 2026 tracks
    // are "APPLICATIONS NOW CLOSED." This is the honest limit of a stored-data-only rule --
    // it reads as actionable here because nothing in the row says otherwise.
    expect(isOpportunityActionable(row({ cycle_status: "upcoming", deadline: null }), REFERENCE_DATE)).toBe(true);
  });
});

describe("NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES", () => {
  test("contains exactly the three cycle_status values that mean a real, correctly-sourced but non-actionable record", () => {
    expect([...NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES].sort()).toEqual(["closed", "discontinued", "historical"]);
  });

  test("does not include disabled/under_review semantics -- those live on `status`, not `cycle_status`", () => {
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("unverified")).toBe(false);
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("open")).toBe(false);
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("upcoming")).toBe(false);
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("date_not_announced")).toBe(false);
  });
});

describe("deriveCycleStatusForPassedDeadline", () => {
  test("derives 'closed' once a deadline has passed and cycle_status hasn't caught up", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "open", deadline: "2026-02-01" }), REFERENCE_DATE)).toBe("closed");
  });

  test("derives 'closed' from 'unverified' once a deadline has passed", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "unverified", deadline: "2026-02-01" }), REFERENCE_DATE)).toBe("closed");
  });

  test("proposes no change when the deadline is still in the future", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "open", deadline: "2027-01-01" }), REFERENCE_DATE)).toBeNull();
  });

  test("proposes no change when there is no deadline to reason from", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "unverified", deadline: null }), REFERENCE_DATE)).toBeNull();
  });

  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`never overwrites an already non-actionable cycle_status ('${cycleStatus}')`, () => {
      expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: cycleStatus, deadline: "2026-02-01" }), REFERENCE_DATE)).toBeNull();
    });
  }

  test("never invents 'historical' or 'discontinued' -- a passed date alone only ever proposes 'closed'", () => {
    const result = deriveCycleStatusForPassedDeadline(row({ cycle_status: "open", deadline: "2020-01-01" }), REFERENCE_DATE);
    expect(result).toBe("closed");
  });
});

describe("nonActionableOpportunityReason", () => {
  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`names the cycle status when that is the reason ('${cycleStatus}')`, () => {
      expect(nonActionableOpportunityReason(row({ cycle_status: cycleStatus }))).toBe(
        `This opportunity's current cycle is ${cycleStatus}.`
      );
    });
  }

  test("names the passed deadline, never the cycle status, when the cycle status is still actionable", () => {
    // The GENIUS Olympiad case: describing this row by its cycle_status would produce "next
    // dates not announced" -- true, and no help at all in explaining why the student can't act.
    const reason = nonActionableOpportunityReason(row({ cycle_status: "date_not_announced", deadline: "2026-03-07" }));
    expect(reason).toBe("This opportunity's application deadline has passed.");
  });

  test("never claims a cycle is open one sentence away from an ineligible verdict", () => {
    expect(nonActionableOpportunityReason(row({ cycle_status: "open", deadline: "2020-01-01" }))).not.toMatch(/current cycle is open/i);
  });

  test("renders a multi-word cycle status readably rather than as a raw enum value", () => {
    expect(nonActionableOpportunityReason(row({ cycle_status: "historical" }))).not.toMatch(/_/);
  });
});

/**
 * The read-time gate over a stored opportunity_matches verdict. persist-matches.ts never
 * deletes a match row once its opportunity stops being actionable, so `eligible: true` written
 * before a cycle closed persists indefinitely -- 74 opportunities across 259 (student,
 * opportunity) pairs live on 2026-08-23.
 */
describe("resolveStoredEligibility", () => {
  test("passes an actionable opportunity's stored eligible verdict through untouched", () => {
    const resolved = resolveStoredEligibility(
      row({ cycle_status: "open", deadline: "2026-09-15" }),
      { eligible: true, notes: null },
      REFERENCE_DATE
    );
    expect(resolved).toEqual({ eligible: true, notes: null, notActionable: false });
  });

  test("passes an actionable opportunity's stored INELIGIBLE verdict through untouched -- the gate only ever removes a claim", () => {
    const resolved = resolveStoredEligibility(
      row({ cycle_status: "open", deadline: "2026-09-15" }),
      { eligible: false, notes: "Not currently open to students in Turkey." },
      REFERENCE_DATE
    );
    expect(resolved).toEqual({ eligible: false, notes: "Not currently open to students in Turkey.", notActionable: false });
  });

  test("preserves an actionable opportunity's unknown-eligibility note", () => {
    const resolved = resolveStoredEligibility(
      row({ cycle_status: "upcoming", deadline: null }),
      { eligible: true, notes: "Restricted by country -- add your country to check." },
      REFERENCE_DATE
    );
    expect(resolved.eligible).toBe(true);
    expect(resolved.notes).toBe("Restricted by country -- add your country to check.");
  });

  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`overrides a stale eligible: true once the cycle is '${cycleStatus}'`, () => {
      const resolved = resolveStoredEligibility(row({ cycle_status: cycleStatus }), { eligible: true, notes: null }, REFERENCE_DATE);
      expect(resolved.eligible).toBe(false);
      expect(resolved.notes).toBe(`This opportunity's current cycle is ${cycleStatus}.`);
      expect(resolved.notActionable).toBe(true);
    });
  }

  test("overrides a stale eligible: true once the deadline has passed, even with an actionable cycle_status", () => {
    const resolved = resolveStoredEligibility(
      row({ cycle_status: "date_not_announced", deadline: "2026-03-07" }),
      { eligible: true, notes: null },
      REFERENCE_DATE
    );
    expect(resolved.eligible).toBe(false);
    expect(resolved.notes).toBe("This opportunity's application deadline has passed.");
    expect(resolved.notActionable).toBe(true);
  });

  test("replaces a stale per-student note with the lifecycle reason rather than showing both", () => {
    const resolved = resolveStoredEligibility(
      row({ cycle_status: "closed" }),
      { eligible: true, notes: "Restricted by country -- add your country to check." },
      REFERENCE_DATE
    );
    expect(resolved.notes).toBe("This opportunity's current cycle is closed.");
  });

  test("marks notActionable only for the lifecycle case, so a genuine per-student mismatch still reads as 'not eligible'", () => {
    const lifecycle = resolveStoredEligibility(row({ cycle_status: "closed" }), { eligible: true, notes: null }, REFERENCE_DATE);
    const perStudent = resolveStoredEligibility(
      row({ cycle_status: "open", deadline: "2026-09-15" }),
      { eligible: false, notes: "Restricted to grades 11, 12." },
      REFERENCE_DATE
    );
    expect(lifecycle.notActionable).toBe(true);
    expect(perStudent.notActionable).toBe(false);
  });

  test("agrees with isOpportunityActionable on the deadline boundary -- still eligible through the end of the deadline day", () => {
    const sameDay = new Date("2026-08-22T23:00:00");
    expect(resolveStoredEligibility(row({ cycle_status: "open", deadline: "2026-08-22" }), { eligible: true, notes: null }, sameDay).eligible).toBe(true);
    const dayAfter = new Date("2026-08-23T00:00:01");
    expect(resolveStoredEligibility(row({ cycle_status: "open", deadline: "2026-08-22" }), { eligible: true, notes: null }, dayAfter).eligible).toBe(false);
  });
});

describe("filterActionableOpportunities", () => {
  test("removes closed-cycle and expired-deadline rows while keeping actionable ones", () => {
    const rows = [
      { id: "a", ...row({ cycle_status: "open", deadline: "2026-09-01" }) },
      { id: "b", ...row({ cycle_status: "closed", deadline: "2027-01-01" }) },
      { id: "c", ...row({ cycle_status: "open", deadline: "2026-01-01" }) },
      { id: "d", ...row({ cycle_status: "unverified", deadline: null }) },
    ];
    const result = filterActionableOpportunities(rows, REFERENCE_DATE);
    expect(result.map((r) => r.id)).toEqual(["a", "d"]);
  });

  test("returns an empty array unchanged", () => {
    expect(filterActionableOpportunities([], REFERENCE_DATE)).toEqual([]);
  });
});

/**
 * The third lifecycle gate: evidence, not dates.
 *
 * `isOpportunityActionable` can only see what a date tells it, and lifecycle.ts's own comment
 * names the blind spot it cannot close — an opportunity that quietly closed with no deadline
 * ever recorded. Confirmed live: Stanford Anesthesia Summer Institute is `active`,
 * `cycle_status='upcoming'`, `deadline` null, while its own page says applications are closed.
 *
 * Measured on the live catalogue 2026-08-23: 50 distinct opportunities are simultaneously
 * counselor-recommendable, deadline-less and never verified (`last_verified_at IS NULL`),
 * across 301 eligible (user, opportunity) pairs and all 7 users.
 *
 * These tests pin the three distinctions that make the gate honest rather than a new lie:
 * the row is NOT closed, the student is NOT ineligible, the evidence is insufficient.
 */
function freshnessRow(
  overrides: Partial<OpportunityVerificationFacts> = {}
): OpportunityVerificationFacts {
  return { deadline: null, last_verified_at: null, ...overrides };
}

describe("isOpportunitySufficientlyVerified", () => {
  // Coverage requirement 1 — a verified, current opportunity still surfaces normally.
  test("a verified opportunity with a real deadline is sufficiently verified", () => {
    expect(
      isOpportunitySufficientlyVerified(freshnessRow({ deadline: "2026-09-15", last_verified_at: "2026-08-20T00:00:00Z" }))
    ).toBe(true);
  });

  // Coverage requirement 2 — null deadline AND null verification is the gated shape.
  test("the live Stanford shape -- no deadline on file and never verified -- is NOT sufficiently verified", () => {
    expect(isOpportunitySufficientlyVerified(freshnessRow({ deadline: null, last_verified_at: null }))).toBe(false);
  });

  test("either leg alone is enough to pass -- the gate needs BOTH absences, so it stays narrow", () => {
    // A deadline on file is a dated commitment about this cycle, verified or not.
    expect(isOpportunitySufficientlyVerified(freshnessRow({ deadline: "2026-12-01", last_verified_at: null }))).toBe(true);
    // A verification timestamp means a human or job actually looked at the source page.
    expect(isOpportunitySufficientlyVerified(freshnessRow({ deadline: null, last_verified_at: "2026-08-15T00:00:00Z" }))).toBe(true);
  });

  test("an undefined last_verified_at is treated the same as null -- a row predating the column is not evidence", () => {
    // Read defensively, the same way eligibility.ts reads eligible_citizenships: a row fetched
    // from an environment whose migration hasn't run genuinely has no key at all.
    const legacy = { deadline: null } as OpportunityVerificationFacts;
    expect(isOpportunitySufficientlyVerified(legacy)).toBe(false);
  });

  test("no maximum verification age is enforced today, and the corpus proves an age rule would be a no-op", () => {
    // Measured 2026-08-23: oldest last_verified_at across the whole corpus is 2026-08-15 and
    // zero rows are older than 30 days. Shipping an age threshold now would look like a
    // working guard while excluding nothing. The seam exists; the threshold is explicitly off.
    expect(MAX_VERIFICATION_AGE_DAYS).toBeNull();
    const ancient = freshnessRow({ deadline: null, last_verified_at: "2019-01-01T00:00:00Z" });
    expect(isOpportunitySufficientlyVerified(ancient)).toBe(true);
  });
});

/**
 * Coverage requirement 4 — a verified ROLLING opportunity can pass, written against the seam
 * rather than against a schema concept that does not exist yet.
 *
 * `deadline_mode` is approved in principle and deliberately not implemented, so `Opportunity`
 * has no such column. `hasDeadlineCommitment` is the seam: it asks "is there a dated
 * commitment about intake on file?", of which a `deadline` is one form and an explicit
 * no-single-date declaration is the other. It reads `deadline_mode` defensively (optional key,
 * same pattern eligibility.ts already uses for eligible_citizenships), so these assertions hold
 * today and keep holding, unchanged, once the column is real.
 */
describe("hasDeadlineCommitment -- the rolling seam", () => {
  test("a concrete deadline is a commitment", () => {
    expect(hasDeadlineCommitment(freshnessRow({ deadline: "2026-11-01" }))).toBe(true);
  });

  test("no deadline and no declared mode is NOT a commitment -- this is the gap the gate detects", () => {
    expect(hasDeadlineCommitment(freshnessRow({ deadline: null }))).toBe(false);
  });

  test("an explicit rolling declaration is a commitment even with a null deadline", () => {
    // The distinction the seam exists to draw: "no deadline because there isn't one" is a
    // researched fact; "no deadline because nobody looked" is the absence of one.
    expect(hasDeadlineCommitment({ deadline: null, last_verified_at: null, deadline_mode: "rolling" })).toBe(true);
  });

  test("a verified rolling opportunity passes the freshness gate", () => {
    expect(
      isOpportunitySufficientlyVerified({ deadline: null, last_verified_at: "2026-08-20T00:00:00Z", deadline_mode: "rolling" })
    ).toBe(true);
  });

  test("an unrecognized deadline_mode is not silently treated as a commitment", () => {
    expect(hasDeadlineCommitment({ deadline: null, last_verified_at: null, deadline_mode: "sometime" })).toBe(false);
    expect(hasDeadlineCommitment({ deadline: null, last_verified_at: null, deadline_mode: null })).toBe(false);
  });
});

describe("isOpportunityRecommendable -- the composed gate every recommendation path calls", () => {
  const verifiedAndOpen = { cycle_status: "open" as const, deadline: "2026-09-15", last_verified_at: "2026-08-20T00:00:00Z" };

  test("a verified, current opportunity is recommendable", () => {
    expect(isOpportunityRecommendable(verifiedAndOpen, REFERENCE_DATE)).toBe(true);
  });

  test("the freshness gate composes with -- never replaces -- the two existing rules", () => {
    // Regression guard for #140/#141: each existing rule must still exclude on its own.
    expect(isOpportunityRecommendable({ ...verifiedAndOpen, cycle_status: "closed" }, REFERENCE_DATE)).toBe(false);
    expect(isOpportunityRecommendable({ ...verifiedAndOpen, deadline: "2026-01-01" }, REFERENCE_DATE)).toBe(false);
    expect(
      isOpportunityRecommendable({ cycle_status: "upcoming", deadline: null, last_verified_at: null }, REFERENCE_DATE)
    ).toBe(false);
  });
});

/**
 * Coverage requirement 5 (the shared half) — the wording. A gated opportunity is not closed and
 * the student is not ineligible; saying either would replace one product lie with another.
 */
describe("insufficient-verification wording", () => {
  test('the badge reads "Needs verification"', () => {
    expect(NEEDS_VERIFICATION_LABEL).toBe("Needs verification");
  });

  test("neither the label nor the note claims the opportunity is closed", () => {
    for (const copy of [NEEDS_VERIFICATION_LABEL, INSUFFICIENT_VERIFICATION_REASON]) {
      expect(copy).not.toMatch(/closed|no longer|expired|deadline has passed/i);
    }
  });

  test("neither the label nor the note tells the student they are ineligible", () => {
    for (const copy of [NEEDS_VERIFICATION_LABEL, INSUFFICIENT_VERIFICATION_REASON]) {
      expect(copy).not.toMatch(/not eligible|ineligible|don't qualify|do not qualify/i);
    }
  });

  test("the note is distinct from the two non-actionable reasons, so surfaces can't conflate them", () => {
    expect(INSUFFICIENT_VERIFICATION_REASON).not.toBe(nonActionableOpportunityReason(row({ cycle_status: "closed" })));
    expect(INSUFFICIENT_VERIFICATION_REASON).not.toBe(nonActionableOpportunityReason(row({ cycle_status: "open", deadline: "2020-01-01" })));
    expect(INSUFFICIENT_VERIFICATION_REASON).toMatch(/verif/i);
  });
});
