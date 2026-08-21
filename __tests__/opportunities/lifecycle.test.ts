import { describe, expect, test } from "vitest";
import {
  NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES,
  deriveCycleStatusForPassedDeadline,
  filterActionableOpportunities,
  isOpportunityActionable,
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
