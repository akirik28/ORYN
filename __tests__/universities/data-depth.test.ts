import { describe, expect, test } from "vitest";
import { lacksResearchDepth, lacksApplicationDeadline, lacksAdmissionStatistics, lacksCoreAdmissionStats, soonestApplicationDeadline } from "@/lib/universities/data-depth";

/**
 * CEO finding, 2026-09-02: 734 of 1,019 universities came from one bulk import with real
 * identity fields but nothing downstream — the detail page rendered this as silently
 * empty sections plus a stat grid of "Unavailable" cards, indistinguishable from an
 * ordinary university missing one or two unpublished figures. This predicate is the
 * gate for the new EmptyState notice on app/(app)/universities/[id]/page.tsx.
 */
describe("lacksResearchDepth", () => {
  const FULL = { hasStatistics: true, programCount: 3, requirementCount: 2, sourceCount: 1 };
  const EMPTY = { hasStatistics: false, programCount: 0, requirementCount: 0, sourceCount: 0 };

  test("true when all four signals are empty — the 734's actual shape", () => {
    expect(lacksResearchDepth(EMPTY)).toBe(true);
  });

  test("false when every signal has something", () => {
    expect(lacksResearchDepth(FULL)).toBe(false);
  });

  test("false when only statistics exist — one real signal is enough to skip the notice", () => {
    expect(lacksResearchDepth({ ...EMPTY, hasStatistics: true })).toBe(false);
  });

  test("false when only programs exist", () => {
    expect(lacksResearchDepth({ ...EMPTY, programCount: 1 })).toBe(false);
  });

  test("false when only requirements exist", () => {
    expect(lacksResearchDepth({ ...EMPTY, requirementCount: 1 })).toBe(false);
  });

  test("false when only sources exist", () => {
    expect(lacksResearchDepth({ ...EMPTY, sourceCount: 1 })).toBe(false);
  });
});

/**
 * D6 (docs/PROXOLA-PLAN.md), 2026-09-04 — CEO's own bar: prove the check can go red, not
 * just assert it would. MIT's real shape below (queried live 2026-09-04, university_id
 * ba3a30b2-c6e2-4a0f-ba32-6da028175d35) is what MOTIVATED this function, not a hypothetical
 * -- confirmed via `hasResearchDepth`-shaped row-count logic today calling MIT covered
 * on the deadlines axis (it has a row), while a student gets no answer to "when do I
 * apply." Failed here first with the real shape, then confirmed a real application date
 * (matching Caltech's own already-staged fill for the same targeted-university set --
 * data/research/sql-dry-runs/universities/d5-caltech-deadlines-2026-09-04.sql) flips it.
 */
describe("lacksApplicationDeadline", () => {
  test("RED: MIT's real current shape -- one row, type 'scholarship', no application deadline", () => {
    expect(lacksApplicationDeadline(["scholarship"])).toBe(true);
  });

  test("GREEN: the same university once a real application-type row exists", () => {
    expect(lacksApplicationDeadline(["scholarship", "application"])).toBe(false);
  });

  test("GREEN: an 'early' deadline counts as a real application deadline too -- Caltech's own REA shape", () => {
    expect(lacksApplicationDeadline(["early", "document"])).toBe(false);
  });

  test("RED: no deadline rows at all -- Caltech's shape before this pass's own fill", () => {
    expect(lacksApplicationDeadline([])).toBe(true);
  });

  test("RED: document/international/scholarship present, still no application or early row", () => {
    expect(lacksApplicationDeadline(["document", "international", "scholarship"])).toBe(true);
  });
});

/**
 * D6's second confirmed instance, in university_statistics -- Oxford's real shape (queried
 * live 2026-09-04, one row, every headline field null) is what motivated this function.
 */
describe("lacksAdmissionStatistics", () => {
  test("RED: Oxford's real current row -- exists, but every headline field is null", () => {
    expect(lacksAdmissionStatistics({ admissionRate: null, satRangeLow: null, actRangeLow: null, costOfAttendance: null })).toBe(true);
  });

  test("RED: no row at all", () => {
    expect(lacksAdmissionStatistics(null)).toBe(true);
  });

  test("GREEN: the same row once a real admission rate is recorded", () => {
    expect(lacksAdmissionStatistics({ admissionRate: 0.03, satRangeLow: null, actRangeLow: null, costOfAttendance: null })).toBe(false);
  });

  test("GREEN: a real cost figure alone is enough, even with no test-score range -- score-optional is a policy, not a data gap", () => {
    expect(lacksAdmissionStatistics({ admissionRate: null, satRangeLow: null, actRangeLow: null, costOfAttendance: 85000 })).toBe(false);
  });

  test("GREEN: fully populated", () => {
    expect(lacksAdmissionStatistics({ admissionRate: 0.04, satRangeLow: 1500, actRangeLow: 34, costOfAttendance: 82000 })).toBe(false);
  });
});

/**
 * The narrower, cost-excluded version actually wired into the university detail page's own
 * empty-state decision — see its own header comment in data-depth.ts for why. Oxford is
 * still the motivating case, but with its REAL full shape this time: cost is genuinely
 * missing from university_statistics too, but its detail page shows a real tuition figure
 * regardless (from a different table, university_profile_metrics) -- this function correctly
 * has no opinion about that at all, since it never takes cost as an input in the first place.
 */
describe("lacksCoreAdmissionStats", () => {
  test("RED: Oxford's real shape -- admission rate, both test-score ranges, and graduation rate all null", () => {
    expect(lacksCoreAdmissionStats({ admissionRate: null, satRangeLow: null, actRangeLow: null, graduationRate: null })).toBe(true);
  });

  test("RED: no row at all", () => {
    expect(lacksCoreAdmissionStats(null)).toBe(true);
  });

  test("GREEN: a real admission rate alone is enough", () => {
    expect(lacksCoreAdmissionStats({ admissionRate: 0.03, satRangeLow: null, actRangeLow: null, graduationRate: null })).toBe(false);
  });

  test("GREEN: a real graduation rate alone is enough", () => {
    expect(lacksCoreAdmissionStats({ admissionRate: null, satRangeLow: null, actRangeLow: null, graduationRate: 0.94 })).toBe(false);
  });

  test("GREEN: fully populated", () => {
    expect(lacksCoreAdmissionStats({ admissionRate: 0.04, satRangeLow: 1500, actRangeLow: 34, graduationRate: 0.96 })).toBe(false);
  });
});

/**
 * Built for the universities compare table's own honest deadline row (CEO's C7 follow-up,
 * 2026-09-04) -- `lacksApplicationDeadline` only answers "has this ever been researched", not
 * "what do I show". `today` is pinned rather than `new Date()` so these can't start failing
 * once a real date below is no longer in the future -- same reasoning
 * lib/deadlines/lifecycle.ts's own isDatedDeadlineUpcoming gives for taking `today` as a
 * parameter.
 */
describe("soonestApplicationDeadline", () => {
  const TODAY = new Date("2026-09-04T00:00:00Z");

  test("Oxford's real rows (queried live 2026-09-04) -- picks the one application row, ignores the two document rows", () => {
    const result = soonestApplicationDeadline(
      [
        { deadline_type: "application", deadline_date: "2026-10-15", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
        { deadline_type: "document", deadline_date: "2026-11-10", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
        { deadline_type: "document", deadline_date: "2027-01-12", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
      ],
      TODAY
    );
    expect(result?.deadlineType).toBe("application");
    expect(result?.date.toISOString().slice(0, 10)).toBe("2026-10-15");
  });

  test("Edinburgh's real rows (queried live 2026-09-04) -- soonest of two upcoming candidates is the 'early' one, not the earlier-listed 'application' one; the already-expired application row (Sep 1) and the wrong-type document row are both excluded", () => {
    const result = soonestApplicationDeadline(
      [
        { deadline_type: "document", deadline_date: "2026-07-15", recurrence: "dated_specific", verification_state: "VERIFIED_HISTORICAL", recurrence_month: null, recurrence_day: null },
        { deadline_type: "application", deadline_date: "2026-09-01", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
        { deadline_type: "early", deadline_date: "2026-10-15", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
        { deadline_type: "application", deadline_date: "2027-01-13", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
      ],
      TODAY
    );
    expect(result?.deadlineType).toBe("early");
    expect(result?.date.toISOString().slice(0, 10)).toBe("2026-10-15");
  });

  test("Yale's real rows (queried live 2026-09-04) -- ONLY recurring_annual_undated rows for both types, no dated row exists at all; still resolves to the soonest real next occurrence, not null", () => {
    const result = soonestApplicationDeadline(
      [
        { deadline_type: "application", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 5, recurrence_day: 1 },
        { deadline_type: "application", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 1, recurrence_day: 2 },
        { deadline_type: "early", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 11, recurrence_day: 1 },
      ],
      TODAY
    );
    // Nov 1 hasn't happened yet this year (today is Sep 4) -- picked as-is, not wrapped.
    // Jan 2 and May 1 have both already passed this year -- correctly wrapped to next year,
    // and Jan 2, 2027 (the wrapped January date) still loses to Nov 1, 2026 chronologically.
    expect(result?.deadlineType).toBe("early");
    expect(result?.date.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  test("a non-actionable verification_state excludes a row even though its own date is in the future -- state, not date, is checked first", () => {
    const result = soonestApplicationDeadline(
      [{ deadline_type: "application", deadline_date: "2099-01-01", recurrence: "dated_specific", verification_state: "VERIFIED_HISTORICAL", recurrence_month: null, recurrence_day: null }],
      TODAY
    );
    expect(result).toBeNull();
  });

  test("an expired dated row (before today) is excluded even with an actionable verification_state", () => {
    const result = soonestApplicationDeadline(
      [{ deadline_type: "application", deadline_date: "2026-01-01", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null }],
      TODAY
    );
    expect(result).toBeNull();
  });

  test("a dated candidate and a recurring candidate are compared on equal footing -- the chronologically soonest wins regardless of kind", () => {
    const result = soonestApplicationDeadline(
      [
        // Recurring Sep 10 is sooner than the dated Oct 1 below, even though it's listed second.
        { deadline_type: "application", deadline_date: "2026-10-01", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
        { deadline_type: "early", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 9, recurrence_day: 10 },
      ],
      TODAY
    );
    expect(result?.deadlineType).toBe("early");
    expect(result?.date.toISOString().slice(0, 10)).toBe("2026-09-10");
  });

  test("no application/early rows at all returns null, not a crash", () => {
    expect(soonestApplicationDeadline([], TODAY)).toBeNull();
    expect(
      soonestApplicationDeadline(
        [{ deadline_type: "scholarship", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 3, recurrence_day: 1 }],
        TODAY
      )
    ).toBeNull();
  });
});
