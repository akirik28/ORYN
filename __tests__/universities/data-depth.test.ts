import { describe, expect, test } from "vitest";
import { lacksResearchDepth, lacksApplicationDeadline, lacksAdmissionStatistics } from "@/lib/universities/data-depth";

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
