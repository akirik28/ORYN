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

  test("an extenuating-circumstances/appeal page is penalized below threshold — real content, wrong page", () => {
    // Real case, a 300-university batch: LSE's newly-acquired admissions_url resolved to
    // ".../Undergraduate-Admissions-Extenuating-Circumstances" — genuinely LSE, genuinely
    // about admissions, and still not what a prospective applicant needs. Reverted in the
    // database; this locks in the fix so it can't recur.
    expect(
      scoreAdmissionsCandidate({
        url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applicants/Secure/Undergraduate-Admissions-Extenuating-Circumstances",
        title: "Undergraduate Admissions - Extenuating Circumstances",
      })
    ).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/admissions/appeals-process", title: "How to appeal an admissions decision" })).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
  });

  test("a dated admissions-cycle news post is penalized below threshold, even when genuinely about admission", () => {
    // Real case: Gadjah Mada University resolved to a news post about that cycle's seat
    // count ("UGM 2026 Admissions: 10,000 Undergraduate ... Seats Available") — a durable
    // "how to apply" hub is what a prospective applicant needs, not a dated announcement.
    expect(
      scoreAdmissionsCandidate({
        url: "https://ugm.ac.id/en/news/ugm-2026-admissions-10000-undergraduate-and-applied-program-seats-available",
        title: "UGM 2026 Admissions: 10,000 Undergraduate and Applied Program Seats Available",
      })
    ).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
    expect(scoreAdmissionsCandidate({ url: "https://example.edu/undergraduate/admission-results-2023", title: "2023 Admission Results" })).toBeLessThan(ADMISSIONS_SCORE_THRESHOLD);
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

  test("prefers a comparably-scored HTML hub over a PDF, but still returns the PDF when it's the only good option", () => {
    const withHtmlAlternative = [
      { url: "https://example.edu/admissions/apply.pdf", title: "Undergraduate Admissions Guide" },
      { url: "https://example.edu/admissions/apply", title: "Undergraduate Admissions" },
    ];
    expect(pickBestAdmissionsCandidate(withHtmlAlternative)?.url).toBe("https://example.edu/admissions/apply");

    // Real cases this session: Shanghai Jiao Tong University and Gebze Technical University
    // both had a PDF as the only real admissions document Tavily found — a PDF is a valid
    // answer, never disqualified outright.
    const pdfOnly = [{ url: "https://example.edu/admissions/2026-international-undergraduate-admissions.pdf", title: "2026 International Undergraduate Admissions" }];
    expect(pickBestAdmissionsCandidate(pdfOnly)?.url).toBe("https://example.edu/admissions/2026-international-undergraduate-admissions.pdf");
  });

  test("empty candidate list returns null", () => {
    expect(pickBestAdmissionsCandidate([])).toBeNull();
  });
});

describe("detectApplicationSystem", () => {
  test("detects a system when the institution's own country matches its home country", () => {
    expect(detectApplicationSystem("Apply through the Common App.", "United States")?.system).toBe("Common App");
    expect(detectApplicationSystem("Visit commonapp.org to start your application.", "United States")?.system).toBe("Common App");
    expect(detectApplicationSystem("International students should apply via UCAS.", "United Kingdom")?.system).toBe("UCAS");
    expect(detectApplicationSystem("French students apply through Parcoursup.", "France")?.system).toBe("Parcoursup");
    expect(detectApplicationSystem("Dutch applicants use Studielink.", "Netherlands")?.system).toBe("Studielink");
    expect(detectApplicationSystem("International applicants need uni-assist certification.", "Germany")?.system).toBe("uni-assist");
    expect(detectApplicationSystem("Turkish students apply through YKS.", "Turkey")?.system).toBe("ÖSYM/YKS");
    expect(detectApplicationSystem("Öğrenciler YKS ile başvurabilir.", "Türkiye")?.system).toBe("ÖSYM/YKS"); // country-alias form
  });

  test("does NOT detect a system when the institution is in a different country — the real bug this guards", () => {
    // Real failure #1, a 150-university batch: Dublin City University (Ireland) was tagged
    // ÖSYM/YKS because its own international-admissions page describes accepting the
    // Turkish "Lise Diplomasi + YKS" qualification as ONE OF MANY recognized foreign quals
    // for Turkish applicants — mentioning a national exam system to describe how foreign
    // qualifications are evaluated is not the institution's own application system.
    const dcuPageExcerpt =
      "Applicants presenting both the Lise Diplomasi and the Yükseköğretim Kurumları Sınavı (YKS) may be considered for direct entry to DCU programmes.";
    expect(detectApplicationSystem(dcuPageExcerpt, "Ireland")).toBeNull();
    expect(detectApplicationSystem("Applicants who used Parcoursup in France may also apply directly.", "Germany")).toBeNull();

    // Real failure #2, a 300-university batch: Shanghai Jiao Tong University (China) was
    // tagged "Common App" from its own international-admissions PDF — Common App and UCAS
    // were originally left ungated on the theory that a broad multi-country portal was
    // unlikely to appear as a mere "recognized pathway" mention. This disproved that theory:
    // there's no legitimate reading where a Chinese university's own application route is
    // the US undergraduate portal.
    expect(detectApplicationSystem("Students admitted through our joint program with a US partner may also apply via the Common App.", "China")).toBeNull();
    expect(detectApplicationSystem("Our exchange partners in the UK accept students via UCAS.", "China")).toBeNull();
  });

  test("returns null rather than defaulting to 'direct' when nothing is mentioned", () => {
    // This is the specific anti-pattern migration 0042's column comment forbids: null means
    // unknown, never a guessed "direct".
    expect(detectApplicationSystem("Welcome to our admissions page. Learn about our programs.", "United States")).toBeNull();
  });

  test("detects the taxonomy's later additions (Ireland, Australia's state bodies, Ontario)", () => {
    expect(detectApplicationSystem("Irish applicants apply through the CAO (cao.ie).", "Ireland")?.system).toBe("CAO");
    expect(detectApplicationSystem("Apply via the Central Applications Office.", "Ireland")?.system).toBe("CAO");
    expect(detectApplicationSystem("NSW and ACT applicants apply through the Universities Admissions Centre.", "Australia")?.system).toBe("UAC");
    expect(detectApplicationSystem("Victorian students apply via VTAC.", "Australia")?.system).toBe("VTAC");
    expect(detectApplicationSystem("Queensland applicants use QTAC.", "Australia")?.system).toBe("QTAC");
    expect(detectApplicationSystem("SA and NT applicants apply through SATAC.", "Australia")?.system).toBe("SATAC");
    expect(detectApplicationSystem("WA applicants apply via TISC.", "Australia")?.system).toBe("TISC");
    expect(detectApplicationSystem("Ontario applicants apply through OUAC.", "Canada")?.system).toBe("OUAC");
  });

  test("CAO and UAC require the domain or full name, not the bare acronym — both are too generic to trust alone", () => {
    // Unlike VTAC/QTAC/SATAC/TISC/OUAC (not real words, low collision risk), a bare "CAO" or
    // "UAC" plausibly appears on a university page for an unrelated reason (an internal role
    // abbreviation, a different program's acronym) without meaning the Irish/NSW admissions
    // body at all.
    expect(detectApplicationSystem("Contact the CAO for budget approval.", "Ireland")).toBeNull();
    expect(detectApplicationSystem("The UAC committee reviews curriculum changes annually.", "Australia")).toBeNull();
  });

  test("the new systems are still country-gated, same mechanism as the original failures", () => {
    expect(detectApplicationSystem("Our partner institution in Ireland uses the CAO (cao.ie) system.", "United States")).toBeNull();
    expect(detectApplicationSystem("Exchange students from Victoria, Australia may have used VTAC.", "New Zealand")).toBeNull();
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
