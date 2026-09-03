import { describe, expect, test } from "vitest";
import {
  passesContentFloor,
  passesPageIdentity,
  passesApplicationVocabulary,
  checkContentGuards,
  findClosurePhrases,
  findOpeningPhrases,
  findDateCandidates,
  isFabricatedPlusOneYear,
  hasValidExcerpt,
  classifyAgainstStoredState,
  CONTENT_LENGTH_FLOOR,
} from "@/lib/opportunities/reverification/classify";

const LONG_ENOUGH = (text: string) => text.padEnd(CONTENT_LENGTH_FLOOR + 50, " filler text to pad length ");

describe("passesContentFloor -- design doc §7.2 guard 1", () => {
  test("below the floor fails -- the rockefeller.edu 0-byte shape", () => {
    expect(passesContentFloor("short")).toBe(false);
    expect(passesContentFloor("")).toBe(false);
  });

  test("at or above the floor passes", () => {
    expect(passesContentFloor("x".repeat(CONTENT_LENGTH_FLOOR))).toBe(true);
  });
});

describe("passesPageIdentity -- design doc §7.2 guard 2", () => {
  const opportunity = { title: "Boston University Summer Term", officialUrl: "https://bu.edu/summer" };

  test("a page mentioning a real word from the title passes", () => {
    expect(passesPageIdentity("Welcome to the Boston University campus this summer.", opportunity, "Boston University")).toBe(true);
  });

  test("a page mentioning only the organization passes too", () => {
    expect(passesPageIdentity("Sorry, this Boston page was not found.", opportunity, "Boston University")).toBe(true);
  });

  test("an unrelated page (redirect, cookie wall, 404-with-200) fails", () => {
    expect(passesPageIdentity("Please accept cookies to continue browsing our website.", opportunity, "Acme Corp")).toBe(false);
  });
});

describe("passesApplicationVocabulary -- design doc §7.2 guard 3", () => {
  test("a page with real application vocabulary passes", () => {
    expect(passesApplicationVocabulary("Students may apply starting in January.")).toBe(true);
  });

  test("a page with only a date-like token passes", () => {
    expect(passesApplicationVocabulary("Founded in 1998, our campus overlooks the lake.")).toBe(true);
  });

  test("a page with neither fails -- 'has not answered our question'", () => {
    expect(passesApplicationVocabulary("Our beautiful campus overlooks a lake with many trees.")).toBe(false);
  });
});

describe("checkContentGuards -- all three in order", () => {
  const opportunity = { title: "Yale Young Global Scholars", officialUrl: "https://yale.edu/ygs" };

  test("passes all three: null (no failure)", () => {
    const content = LONG_ENOUGH("Yale Young Global Scholars applications are now open. Apply by March 1st for the summer program.");
    expect(checkContentGuards(content, opportunity, "Yale University")).toBeNull();
  });

  test("too short: content_too_short, checked first", () => {
    expect(checkContentGuards("short", opportunity, "Yale University")).toBe("content_too_short");
  });

  test("long enough but unrelated content: identity_mismatch", () => {
    const content = LONG_ENOUGH("This page is a generic cookie consent notice with no relation to any programme.");
    expect(checkContentGuards(content, opportunity, "Yale University")).toBe("identity_mismatch");
  });

  test("about the right thing but no application-shaped content: no_application_vocabulary", () => {
    const content = LONG_ENOUGH("Yale Young Global Scholars is a wonderful place with a beautiful lake view every day.");
    expect(checkContentGuards(content, opportunity, "Yale University")).toBe("no_application_vocabulary");
  });
});

describe("findClosurePhrases / findOpeningPhrases -- design doc §5.1's fixed phrase sets", () => {
  test("finds a closure phrase and returns a literal substring excerpt", () => {
    const content = "Please note: applications are closed for this cycle. Check back next year.";
    const matches = findClosurePhrases(content);
    expect(matches.length).toBeGreaterThan(0);
    expect(content.includes(matches[0].excerpt)).toBe(true);
  });

  test("finds an opening phrase", () => {
    const content = "Great news -- applications open on the first of the month.";
    expect(findOpeningPhrases(content).length).toBeGreaterThan(0);
  });

  test("finds nothing when neither phrase set matches", () => {
    expect(findClosurePhrases("A page about the weather today.")).toEqual([]);
    expect(findOpeningPhrases("A page about the weather today.")).toEqual([]);
  });
});

describe("findDateCandidates -- design doc §5.1 step 3, explicit formats only", () => {
  test("finds an ISO date", () => {
    expect(findDateCandidates("The deadline is 2027-03-15 for all applicants.")).toContain("2027-03-15");
  });

  test("finds a Month D, YYYY date", () => {
    expect(findDateCandidates("Apply by March 15, 2027.")).toContain("March 15, 2027");
  });

  test("every candidate is a literal substring of the content, by construction", () => {
    const content = "Deadlines: 2027-03-15 and also March 20, 2027.";
    for (const candidate of findDateCandidates(content)) expect(content.includes(candidate)).toBe(true);
  });

  test("no dates found returns an empty array, not undefined or a throw", () => {
    expect(findDateCandidates("No dates here at all.")).toEqual([]);
  });
});

describe("isFabricatedPlusOneYear -- design doc §8.3's anti-fabrication rule", () => {
  test("the documented failure shape: stored 2026, detected exactly 2027-of-the-same-date, NOT in the content -- rejected", () => {
    expect(isFabricatedPlusOneYear("2026-03-15", "2027-03-15", "Some unrelated page content with no date mentioned.")).toBe(true);
  });

  test("the same +1-year date IS allowed when it genuinely appears verbatim in the content", () => {
    expect(isFabricatedPlusOneYear("2026-03-15", "2027-03-15", "The new deadline is 2027-03-15 as announced this week.")).toBe(false);
  });

  test("a detected date that is NOT exactly +1 year is never flagged by this rule", () => {
    expect(isFabricatedPlusOneYear("2026-03-15", "2026-04-01", "irrelevant content")).toBe(false);
    expect(isFabricatedPlusOneYear("2026-03-15", "2028-03-15", "irrelevant content")).toBe(false);
  });

  test("no stored deadline or no detected deadline: never flagged (nothing to compare)", () => {
    expect(isFabricatedPlusOneYear(null, "2027-03-15", "content")).toBe(false);
    expect(isFabricatedPlusOneYear("2026-03-15", null, "content")).toBe(false);
  });
});

describe("hasValidExcerpt -- design doc §8.3's excerpt-or-nothing rule", () => {
  test("a non-empty excerpt that is a literal substring passes", () => {
    expect(hasValidExcerpt("applications are closed", "Notice: applications are closed for 2026.")).toBe(true);
  });

  test("null, empty, or a non-substring excerpt all fail -- no P1 without this", () => {
    expect(hasValidExcerpt(null, "some content")).toBe(false);
    expect(hasValidExcerpt("", "some content")).toBe(false);
    expect(hasValidExcerpt("this text is not in the content", "some content")).toBe(false);
  });
});

describe("classifyAgainstStoredState -- the full deterministic decision tree", () => {
  test("agrees: stored open, page confirms with an opening phrase", () => {
    const content = LONG_ENOUGH("Great news! Applications open now for our summer research program.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "open", deadline: null });
    expect(verdict.kind).toBe("agrees");
  });

  test("agrees: stored closed, page confirms with a closure phrase", () => {
    const content = LONG_ENOUGH("Please note that applications are closed for this year's cycle.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "closed", deadline: null });
    expect(verdict.kind).toBe("agrees");
  });

  test("disagreement: stored open, page says closed -- the Stanford Anesthesia shape", () => {
    const content = LONG_ENOUGH("Notice: applications are closed for all three tracks this cycle.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "open", deadline: null });
    expect(verdict.kind).toBe("disagreement");
  });

  test("disagreement: stored closed, page says open", () => {
    const content = LONG_ENOUGH("We are pleased to announce applications open for the new cycle.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "closed", deadline: null });
    expect(verdict.kind).toBe("disagreement");
  });

  test("the '2026 closed / 2027 open' ambiguity: both phrases present -- treated as agreement with the forward-looking opening signal, not a disagreement", () => {
    const content = LONG_ENOUGH("2026 applications are closed. 2027 applications open on January 1st, apply by March.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "closed", deadline: null });
    expect(verdict.kind).toBe("agrees");
  });

  test("liveness_silent -- the ISSYP shape: readable content with neither phrase set matching anything", () => {
    const content = LONG_ENOUGH("International Applicants: Students around the world who meet the eligibility criteria are welcome to apply to this program, which has run for many years.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "unverified", deadline: null });
    // "welcome to apply" doesn't match the fixed OPENING_PHRASES set ("applications open" /
    // "apply by" / "deadline:"), and no closure phrase is present either -- liveness-silent.
    expect(verdict.kind).toBe("liveness_silent");
  });

  test("absence of closure language alone is never read as evidence of opening -- design doc §7.2 guard 3 / §7.6 mechanism 2", () => {
    // A page that merely fails to mention closing must not default to "agrees" for a stored-open row.
    const content = LONG_ENOUGH("This programme has a rich history and many distinguished alumni over the decades.");
    const verdict = classifyAgainstStoredState(content, { cycleStatus: "open", deadline: null });
    expect(verdict.kind).not.toBe("agrees");
  });
});
