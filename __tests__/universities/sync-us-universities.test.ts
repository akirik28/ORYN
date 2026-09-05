import { describe, expect, test } from "vitest";
import { classifyUniversityDataChange, classifyStatisticsDataChange } from "@/lib/universities/sync-us-universities";

/**
 * classifyUniversityDataChange/classifyStatisticsDataChange are what stop syncOne from
 * stamping last_changed_at on every Job C run regardless of whether anything actually
 * differs -- see that file's own comment for why an unconditional stamp would have made the
 * university_data_changed notification (lib/universities/data-change-scan.ts) fire on every
 * scheduled sync. Only these pure comparators are tested here; the surrounding fetch/upsert
 * flow has no existing coverage and adding it is outside this package's scope.
 *
 * 2026-09-05, the university-notification first-fill fix (CEO's own "Oxford hiçbir şey
 * yapmadı, biz ilk kez baktık"): these were plain booleans (`hasUniversityDataChanged`/
 * `hasStatisticsChanged`), and the tests below used to assert `true` for exactly the case
 * that turned out to be the whole bug -- a nullable field's first real value read as
 * indistinguishable from a later correction. The two tests marked "THE FIX" are the ones
 * whose expected value actually changed; every other test here asserts the same real-change
 * detection this file has always had, just spelled as "changed" instead of `true`.
 */
function fields(overrides: Partial<Parameters<typeof classifyUniversityDataChange>[0]> = {}) {
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

describe("classifyUniversityDataChange", () => {
  test("identical fields report no change", () => {
    expect(classifyUniversityDataChange(fields(), fields())).toBeNull();
  });

  test("a name change (a real prior value differing) is 'changed'", () => {
    expect(classifyUniversityDataChange(fields(), fields({ name: "Renamed University" }))).toBe("changed");
  });

  test("a city change (a real prior value differing) is 'changed'", () => {
    expect(classifyUniversityDataChange(fields(), fields({ city: "New City" }))).toBe("changed");
  });

  test("THE FIX: a null-to-value transition on a nullable field is 'added', not 'changed'", () => {
    expect(classifyUniversityDataChange(fields({ website_url: null }), fields({ website_url: "https://test.edu" }))).toBe("added");
  });

  test("a student_size change (a real prior value differing) is 'changed'", () => {
    expect(classifyUniversityDataChange(fields(), fields({ student_size: 12000 }))).toBe("changed");
  });

  test("external_ids is compared by value, not by reference", () => {
    // Two fresh object literals with identical contents must read as unchanged -- a naive
    // !== comparison on the object itself would always report a difference, since a new
    // literal is never === to a previously-stored one.
    const existing = fields({ external_ids: { college_scorecard_id: "12345" } });
    const incoming = fields({ external_ids: { college_scorecard_id: "12345" } });
    expect(classifyUniversityDataChange(existing, incoming)).toBeNull();
  });

  test("a real external_ids value change is 'changed'", () => {
    expect(classifyUniversityDataChange(fields({ external_ids: { college_scorecard_id: "12345" } }), fields({ external_ids: { college_scorecard_id: "99999" } }))).toBe("changed");
  });

  test("external_ids appearing where none existed before is 'added'", () => {
    expect(classifyUniversityDataChange(fields({ external_ids: {} }), fields({ external_ids: { college_scorecard_id: "12345" } }))).toBe("added");
  });

  test("a genuine change outranks an added field in the same sync -- one real correction is the stronger claim", () => {
    // city goes from a real value to a different real value (changed); website_url goes from
    // unset to real (added), in the same call. The overall event must report the stronger,
    // more specific claim, matching OpportunityStandingBadge's own "a real exclusion outranks
    // the caveat" precedence.
    const existing = fields({ city: "Old City", website_url: null });
    const incoming = fields({ city: "New City", website_url: "https://test.edu" });
    expect(classifyUniversityDataChange(existing, incoming)).toBe("changed");
  });

  test("multiple fields all becoming known for the first time, with no real correction among them, is 'added'", () => {
    const existing = fields({ city: null, website_url: null, student_size: null });
    const incoming = fields({ city: "Testville", website_url: "https://test.edu", student_size: 10000 });
    expect(classifyUniversityDataChange(existing, incoming)).toBe("added");
  });
});

function statsFields(overrides: Partial<Parameters<typeof classifyStatisticsDataChange>[1]> = {}) {
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

describe("classifyStatisticsDataChange", () => {
  test("identical fields report no change", () => {
    expect(classifyStatisticsDataChange(statsFields(), statsFields())).toBeNull();
  });

  test("an admission_rate change (a real prior value differing) is 'changed'", () => {
    expect(classifyStatisticsDataChange(statsFields(), statsFields({ admission_rate: 0.4 }))).toBe("changed");
  });

  test("a SAT range change is 'changed'", () => {
    expect(classifyStatisticsDataChange(statsFields(), statsFields({ sat_range_low: 1210 }))).toBe("changed");
  });

  test("an ACT range change is 'changed'", () => {
    expect(classifyStatisticsDataChange(statsFields(), statsFields({ act_range_high: 33 }))).toBe("changed");
  });

  test("a graduation_rate change is 'changed'", () => {
    expect(classifyStatisticsDataChange(statsFields(), statsFields({ graduation_rate: 0.9 }))).toBe("changed");
  });

  test("a cost_of_attendance change is 'changed'", () => {
    expect(classifyStatisticsDataChange(statsFields(), statsFields({ cost_of_attendance: 56000 }))).toBe("changed");
  });

  test("THE FIX: a null-to-value transition on a nullable field is 'added', not 'changed'", () => {
    expect(classifyStatisticsDataChange(statsFields({ admission_rate: null }), statsFields({ admission_rate: 0.42 }))).toBe("added");
  });

  test("THE OTHER FIX: no statistics row existed at all is unconditionally 'added', not folded into a boolean 'changed' at the call site", () => {
    // This is the former `!existingStats ||` special case (app-side, at syncOne's own call
    // site) -- CEO's own instruction named it "bilerek yazılmış, bilerek düzeltilecek". Folded
    // into the classifier itself so there is exactly one place that decides this, not two.
    expect(classifyStatisticsDataChange(null, statsFields())).toBe("added");
  });

  test("a genuine change outranks an added field in the same row -- one real correction is the stronger claim", () => {
    const existing = statsFields({ admission_rate: 0.5, graduation_rate: null });
    const incoming = statsFields({ admission_rate: 0.42, graduation_rate: 0.88 });
    expect(classifyStatisticsDataChange(existing, incoming)).toBe("changed");
  });
});

// isUndefinedColumnError moved to lib/supabase/errors.ts 2026-09-02 (see __tests__/supabase/errors.test.ts) -- it stopped being specific to this file the moment a second, unrelated domain needed the identical check.
