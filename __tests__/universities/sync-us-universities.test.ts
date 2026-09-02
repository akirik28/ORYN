import { describe, expect, test } from "vitest";
import { hasUniversityDataChanged, hasStatisticsChanged } from "@/lib/universities/sync-us-universities";

/**
 * hasUniversityDataChanged is what stops syncOne from stamping last_changed_at on every
 * Job C run regardless of whether anything actually differs — see that file's own comment
 * for why an unconditional stamp would have made the university_data_changed notification
 * (lib/universities/data-change-scan.ts) fire on every scheduled sync. Only this pure
 * comparator is tested here; the surrounding fetch/upsert flow has no existing coverage and
 * adding it is outside this package's scope.
 */
function fields(overrides: Partial<Parameters<typeof hasUniversityDataChanged>[0]> = {}) {
  return {
    name: "Test University",
    city: "Testville",
    institution_type: "Public",
    website_url: "https://test.edu",
    student_size: 10000,
    external_ids: { college_scorecard_id: "12345" },
    ...overrides,
  };
}

describe("hasUniversityDataChanged", () => {
  test("identical fields report no change", () => {
    expect(hasUniversityDataChanged(fields(), fields())).toBe(false);
  });

  test("a name change is detected", () => {
    expect(hasUniversityDataChanged(fields(), fields({ name: "Renamed University" }))).toBe(true);
  });

  test("a city change is detected", () => {
    expect(hasUniversityDataChanged(fields(), fields({ city: "New City" }))).toBe(true);
  });

  test("a null-to-value change on a nullable field is detected", () => {
    expect(hasUniversityDataChanged(fields({ website_url: null }), fields({ website_url: "https://test.edu" }))).toBe(true);
  });

  test("a student_size change is detected", () => {
    expect(hasUniversityDataChanged(fields(), fields({ student_size: 12000 }))).toBe(true);
  });

  test("external_ids is compared by value, not by reference", () => {
    // Two fresh object literals with identical contents must read as unchanged — a naive
    // !== comparison on the object itself would always report true here, since a new
    // literal is never === to a previously-stored one.
    const existing = fields({ external_ids: { college_scorecard_id: "12345" } });
    const incoming = fields({ external_ids: { college_scorecard_id: "12345" } });
    expect(hasUniversityDataChanged(existing, incoming)).toBe(false);
  });

  test("a real external_ids value change is detected", () => {
    expect(hasUniversityDataChanged(fields({ external_ids: { college_scorecard_id: "12345" } }), fields({ external_ids: { college_scorecard_id: "99999" } }))).toBe(true);
  });
});


function statsFields(overrides: Partial<Parameters<typeof hasStatisticsChanged>[0]> = {}) {
  return {
    admission_rate: 0.42,
    sat_range_low: 1200,
    sat_range_high: 1450,
    act_range_low: 26,
    act_range_high: 32,
    graduation_rate: 0.88,
    cost_of_attendance: 55000,
    ...overrides,
  };
}

describe("hasStatisticsChanged", () => {
  test("identical fields report no change", () => {
    expect(hasStatisticsChanged(statsFields(), statsFields())).toBe(false);
  });

  test("an admission_rate change is detected", () => {
    expect(hasStatisticsChanged(statsFields(), statsFields({ admission_rate: 0.4 }))).toBe(true);
  });

  test("a SAT range change is detected", () => {
    expect(hasStatisticsChanged(statsFields(), statsFields({ sat_range_low: 1210 }))).toBe(true);
  });

  test("an ACT range change is detected", () => {
    expect(hasStatisticsChanged(statsFields(), statsFields({ act_range_high: 33 }))).toBe(true);
  });

  test("a graduation_rate change is detected", () => {
    expect(hasStatisticsChanged(statsFields(), statsFields({ graduation_rate: 0.9 }))).toBe(true);
  });

  test("a cost_of_attendance change is detected", () => {
    expect(hasStatisticsChanged(statsFields(), statsFields({ cost_of_attendance: 56000 }))).toBe(true);
  });

  test("a null-to-value change on a nullable field is detected", () => {
    expect(hasStatisticsChanged(statsFields({ admission_rate: null }), statsFields({ admission_rate: 0.42 }))).toBe(true);
  });
});

// isUndefinedColumnError moved to lib/supabase/errors.ts 2026-09-02 (see __tests__/supabase/errors.test.ts) -- it stopped being specific to this file the moment a second, unrelated domain needed the identical check.
