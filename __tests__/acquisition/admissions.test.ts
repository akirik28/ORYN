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

  test("an unrelated page mentioning 'undergraduate' with no admission/apply signal scores zero, not just below threshold", () => {
    // Real failure caught on a live 40-university batch: a 2019 NEWS ARTICLE about a
    // research-competition win ("AAU students won... in the Undergraduate Research
    // Competition") cleared the old threshold on the undergrad bonus alone (path +2, title
    // +1 = 3) despite containing no "admission" or "apply" anywhere. The undergrad/bachelor
    // bonus must never be independently sufficient — it can only refine a candidate that
    // already has a real admission/apply signal.
    const score = scoreAdmissionsCandidate({
      url: "https://example.edu/en/news/2019/students-won-first-place-in-the-undergraduate-research-competition",
      title: "Students Won First and Second Place in the Undergraduate Research Competition",
    });
    expect(score).toBe(0);
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
  test("detects Common App and UCAS regardless of the institution's own country (broad multi-country portals)", () => {
    expect(detectApplicationSystem("Apply through the Common App.", "United States")?.system).toBe("Common App");
    expect(detectApplicationSystem("Visit commonapp.org to start your application.", "United States")?.system).toBe("Common App");
    expect(detectApplicationSystem("International students should apply via UCAS.", "United Kingdom")?.system).toBe("UCAS");
  });

  test("detects a country-specific system when the institution's own country matches", () => {
    expect(detectApplicationSystem("French students apply through Parcoursup.", "France")?.system).toBe("Parcoursup");
    expect(detectApplicationSystem("Dutch applicants use Studielink.", "Netherlands")?.system).toBe("Studielink");
    expect(detectApplicationSystem("International applicants need uni-assist certification.", "Germany")?.system).toBe("uni-assist");
    expect(detectApplicationSystem("Turkish students apply through YKS.", "Turkey")?.system).toBe("ÖSYM/YKS");
    expect(detectApplicationSystem("Öğrenciler YKS ile başvurabilir.", "Türkiye")?.system).toBe("ÖSYM/YKS"); // country-alias form
  });

  test("does NOT detect a country-specific system when the institution is in a different country — the real bug this guards", () => {
    // Real failure caught on a live batch: Dublin City University (Ireland) was tagged
    // ÖSYM/YKS because its own international-admissions page describes accepting the
    // Turkish "Lise Diplomasi + YKS" qualification as ONE OF MANY recognized foreign
    // quals for Turkish applicants — mentioning a national exam system to describe how
    // foreign qualifications are evaluated is not the institution's own application system.
    const dcuPageExcerpt =
      "Applicants presenting both the Lise Diplomasi and the Yükseköğretim Kurumları Sınavı (YKS) may be considered for direct entry to DCU programmes.";
    expect(detectApplicationSystem(dcuPageExcerpt, "Ireland")).toBeNull();
    expect(detectApplicationSystem("Applicants who used Parcoursup in France may also apply directly.", "Germany")).toBeNull();
  });

  test("returns null rather than defaulting to 'direct' when nothing is mentioned", () => {
    // This is the specific anti-pattern migration 0042's column comment forbids: null means
    // unknown, never a guessed "direct".
    expect(detectApplicationSystem("Welcome to our admissions page. Learn about our programs.", "United States")).toBeNull();
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
