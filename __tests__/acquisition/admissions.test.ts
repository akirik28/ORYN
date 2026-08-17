import { describe, expect, test } from "vitest";
import { ADMISSIONS_SCORE_THRESHOLD, detectApplicationSystem, extractDomain, pickBestAdmissionsCandidate, scoreAdmissionsCandidate } from "@/lib/acquisition/admissions";

describe("scoreAdmissionsCandidate", () => {
  test("a URL path containing /admission scores highest", () => {
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/admissions/", title: "Home" })).toBeGreaterThanOrEqual(ADMISSIONS_SCORE_THRESHOLD);
  });

  test("a homepage with no admissions signal scores below threshold", () => {
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/", title: "Example University" })).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
  });

  test("an unrelated department page scores below threshold", () => {
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/departments/physics", title: "Physics Department" })).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
  });

  test("title-only admission mention alone does not clear the threshold", () => {
    // A news article titled "Admission requirements changing" at a generic path shouldn't
    // outrank a real /admissions/ URL just because it says the word.
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/news/2026/story", title: "Admission requirements changing" })).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
  });

  test("a graduate/Master's admissions page is penalized below threshold — wrong audience, not a partial match", () => {
    // Real failure caught on a live pilot run: a domain-restricted search for "Aarhus
    // University undergraduate admissions" still surfaced this exact URL as the top result.
    expect(scoreAdmissionsCandidate({ url: "https://masters.au.dk/how-to-apply/admission-requirements", title: "How to apply | Admission requirements" })).toBeLessThan(
      ADMISSIONS_SCORE_THRESHOLD
    );
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/graduate/admissions/apply", title: "PhD Admissions" })).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
  });

  test("'undergraduate' itself does not false-trigger the graduate-level penalty", () => {
    // \bgraduate\b must not match the substring inside "undergraduate".
    const score = scoreAdmissionsCandidate({ url: "https://example.edu/admissions/undergraduate/apply", title: "Undergraduate Admission" });
    expect(score).toBeGreaterThanOrEqual(ADMISSIONS_SCORE_THRESHOLD);
  });
});

describe("pickBestAdmissionsCandidate", () => {
  test("returns null rather than guessing when nothing clears the threshold", () => {
    const candidates = [
      { url: "https://example.edu/", title: "Home" },
      { url: "https://example.edu/about", title: "About Us" },
    ];
    expect(pickBestAdmissionsCandidate(candidates)).toBeNull();
  });

  test("picks the highest-scoring candidate among several plausible ones, correctly skipping a graduate-level distractor", () => {
    const candidates = [
      { url: "https://example.edu/about", title: "About" },
      { url: "https://example.edu/admissions/apply", title: "Apply for Undergraduate Admission" },
      { url: "https://example.edu/admissions/", title: "Admissions" },
      { url: "https://masters.example.edu/how-to-apply/admission-requirements", title: "How to apply | Admission requirements" },
    ];
    const best = pickBestAdmissionsCandidate(candidates);
    expect(best?.url).toBe("https://example.edu/admissions/apply");
  });

  test("empty candidate list returns null", () => {
    expect(pickBestAdmissionsCandidate([])).toBeNull();
  });
});

describe("detectApplicationSystem", () => {
  test("detects Common App from either wording or domain", () => {
    expect(detectApplicationSystem("Apply through the Common App.")?.system).toBe("Common App");
    expect(detectApplicationSystem("Visit commonapp.org to start your application.")?.system).toBe("Common App");
  });

  test("detects UCAS", () => {
    expect(detectApplicationSystem("International students should apply via UCAS.")?.system).toBe("UCAS");
  });

  test("detects Parcoursup, Studielink, uni-assist, OSYM/YKS", () => {
    expect(detectApplicationSystem("French students apply through Parcoursup.")?.system).toBe("Parcoursup");
    expect(detectApplicationSystem("Dutch applicants use Studielink.")?.system).toBe("Studielink");
    expect(detectApplicationSystem("International applicants need uni-assist certification.")?.system).toBe("uni-assist");
    expect(detectApplicationSystem("Turkish students apply through YKS.")?.system).toBe("ÖSYM/YKS");
  });

  test("returns null rather than defaulting to 'direct' when nothing is mentioned", () => {
    // This is the specific anti-pattern migration 0042's column comment forbids: null means
    // unknown, never a guessed "direct".
    expect(detectApplicationSystem("Welcome to our admissions page. Learn about our programs.")).toBeNull();
  });
});

describe("extractDomain", () => {
  test("strips protocol and www", () => {
    expect(extractDomain("https://www.example.edu/admissions")).toBe("example.edu");
    expect(extractDomain("https://example.edu")).toBe("example.edu");
  });

  test("returns null for an unparseable URL rather than throwing", () => {
    expect(extractDomain("not a url")).toBeNull();
  });
});
