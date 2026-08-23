import { describe, expect, test } from "vitest";
import {
  groupJourneyByYear,
  spanLabel,
  weightFor,
  yearOf,
  type JourneyEntry,
  type JourneyKind,
} from "@/lib/profile/journey";

function entry(overrides: Partial<JourneyEntry> & { id: string; kind: JourneyKind }): JourneyEntry {
  return {
    weight: weightFor(overrides.kind),
    title: overrides.id,
    organization: null,
    description: null,
    sortDate: null,
    dateLabel: null,
    ongoing: false,
    evidenceStatus: null,
    ...overrides,
  };
}

describe("weightFor", () => {
  test("a leadership role is a story; a plain activity is not", () => {
    expect(weightFor("leadership")).toBe("story");
    expect(weightFor("activity")).toBe("experience");
  });

  test("coursework and test scores stay compact", () => {
    expect(weightFor("course")).toBe("compact");
    expect(weightFor("test_score")).toBe("compact");
    expect(weightFor("certification")).toBe("compact");
  });

  test("awards get their own treatment, distinct from stories and rows", () => {
    expect(weightFor("award")).toBe("achievement");
  });
});

describe("spanLabel", () => {
  test("formats a closed span", () => {
    expect(spanLabel({ start: "2024-09-01", end: "2025-06-30", ongoing: false })).toBe("Sep 2024 — Jun 2025");
  });

  test("collapses a span that starts and ends in the same month", () => {
    expect(spanLabel({ start: "2025-03-04", end: "2025-03-20", ongoing: false })).toBe("Mar 2025");
  });

  // A record can carry a stale end_date and still be flagged ongoing. Telling a student
  // their current role ended is worse than being vague about when it will.
  test("ongoing wins over a stale end date", () => {
    expect(spanLabel({ start: "2024-09-01", end: "2025-01-01", ongoing: true })).toBe("Sep 2024 — now");
  });

  test("ongoing with no start is still honest", () => {
    expect(spanLabel({ start: null, end: null, ongoing: true })).toBe("Ongoing");
  });

  test("falls back to whichever end of the span exists", () => {
    expect(spanLabel({ start: "2025-05-01", end: null, ongoing: false })).toBe("May 2025");
    expect(spanLabel({ start: null, end: "2025-05-01", ongoing: false })).toBe("May 2025");
  });

  test("no dates at all yields no label rather than a guess", () => {
    expect(spanLabel({ start: null, end: null, ongoing: false })).toBeNull();
  });

  // Same UTC-midnight trap as yearOf: `toLocaleDateString` on "2025-01-01" renders
  // "Dec 2024" west of UTC.
  test("a January date labels as January in every timezone", () => {
    expect(spanLabel({ start: "2025-01-01", end: null, ongoing: false })).toBe("Jan 2025");
    expect(spanLabel({ start: "2024-01-01", end: "2025-01-01", ongoing: false })).toBe("Jan 2024 — Jan 2025");
  });
});

describe("yearOf", () => {
  test("reads the year from the sort date", () => {
    expect(yearOf(entry({ id: "a", kind: "award", sortDate: "2025-04-02" }))).toBe(2025);
  });

  // Bucketing an undated record under the current year would silently assert a date the
  // student never gave.
  test("an undated record has no year, not this year", () => {
    expect(yearOf(entry({ id: "a", kind: "award", sortDate: null }))).toBeNull();
  });

  // Regression: these columns hold calendar dates, and `new Date("2025-01-01")` is UTC
  // midnight — read back with getFullYear() it reports 2024 anywhere west of UTC, filing a
  // US student's January records under the previous year. This suite runs in the machine's
  // own zone, so assert the boundary explicitly rather than relying on where CI happens to
  // live; run with `TZ=America/New_York` to see the old implementation fail.
  test("January 1st belongs to its own year in every timezone", () => {
    expect(yearOf(entry({ id: "a", kind: "award", sortDate: "2025-01-01" }))).toBe(2025);
    expect(yearOf(entry({ id: "b", kind: "award", sortDate: "2025-12-31" }))).toBe(2025);
  });

  test("a full timestamp still resolves", () => {
    expect(yearOf(entry({ id: "a", kind: "award", sortDate: "2025-06-04T10:00:00.000Z" }))).toBe(2025);
  });

  test("an unparseable date yields no year rather than NaN", () => {
    expect(yearOf(entry({ id: "a", kind: "award", sortDate: "not a date" }))).toBeNull();
  });
});

describe("groupJourneyByYear", () => {
  test("years run newest first with undated last", () => {
    const groups = groupJourneyByYear([
      entry({ id: "old", kind: "award", sortDate: "2023-01-01" }),
      entry({ id: "undated", kind: "award", sortDate: null }),
      entry({ id: "new", kind: "award", sortDate: "2025-01-01" }),
    ]);
    expect(groups.map((g) => g.year)).toEqual([2025, 2023, null]);
  });

  // The page is a narrative, not a log: a year led by "AP Microeconomics" when the student
  // also founded something that year buries the thing that matters.
  test("within a year, heavier records lead", () => {
    const groups = groupJourneyByYear([
      entry({ id: "course", kind: "course", sortDate: "2025-09-01", title: "AP Microeconomics" }),
      entry({ id: "award", kind: "award", sortDate: "2025-05-01", title: "Regional medal" }),
      entry({ id: "lead", kind: "leadership", sortDate: "2025-01-01", title: "Founded the society" }),
      entry({ id: "work", kind: "work", sortDate: "2025-07-01", title: "Internship" }),
    ]);
    expect(groups[0].entries.map((e) => e.title)).toEqual([
      "Founded the society",
      "Internship",
      "Regional medal",
      "AP Microeconomics",
    ]);
  });

  test("equal weight falls back to date, newest first", () => {
    const groups = groupJourneyByYear([
      entry({ id: "a", kind: "award", sortDate: "2025-02-01", title: "February" }),
      entry({ id: "b", kind: "award", sortDate: "2025-11-01", title: "November" }),
    ]);
    expect(groups[0].entries.map((e) => e.title)).toEqual(["November", "February"]);
  });

  test("identical weight and date fall back to title, so ordering is stable", () => {
    const groups = groupJourneyByYear([
      entry({ id: "b", kind: "award", sortDate: "2025-02-01", title: "Beta" }),
      entry({ id: "a", kind: "award", sortDate: "2025-02-01", title: "Alpha" }),
    ]);
    expect(groups[0].entries.map((e) => e.title)).toEqual(["Alpha", "Beta"]);
  });

  test("an empty journey produces no groups rather than an empty year", () => {
    expect(groupJourneyByYear([])).toEqual([]);
  });
});

describe("spanLabel ongoingLabel", () => {
  // The CV and portfolio are documents a student hands to people, where "Present" is the
  // convention; the product UI reads better as "now".
  test("a CV-style span says Present", () => {
    expect(spanLabel({ start: "2025-09-01", end: null, ongoing: true, ongoingLabel: "Present" })).toBe(
      "Sep 2025 — Present",
    );
  });

  test("an undated ongoing record still says something useful in each register", () => {
    expect(spanLabel({ start: null, end: null, ongoing: true })).toBe("Ongoing");
    expect(spanLabel({ start: null, end: null, ongoing: true, ongoingLabel: "Present" })).toBe("Present");
  });

  test("ongoingLabel does not leak into closed spans", () => {
    expect(spanLabel({ start: "2024-09-01", end: "2025-06-30", ongoing: false, ongoingLabel: "Present" })).toBe(
      "Sep 2024 — Jun 2025",
    );
  });
});
