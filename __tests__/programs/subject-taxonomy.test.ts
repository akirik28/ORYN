import { describe, expect, test } from "vitest";
import { classifySubjects } from "@/lib/programs/subject-taxonomy";

describe("classifySubjects", () => {
  test("classifies an unambiguous single-subject name", () => {
    expect(classifySubjects("Economics")).toEqual({ primary: "economics", secondary: [] });
  });

  test("picks a primary and lists further matches as secondary, in keyword-priority order", () => {
    const result = classifySubjects("Computer Science and Engineering");
    expect(result.primary).toBe("computer_science");
    expect(result.secondary).toContain("engineering");
  });

  test("falls back to 'other' with no secondary tags for a genuinely unmatched name", () => {
    // "Classics" used to be this test's example — it isn't anymore. The 2026-08-22
    // measurement found "Classics, BS" and "Classical Civilization" as real misclassified
    // rows in the `other` bucket, which is exactly the vocabulary gap arts_humanities now
    // closes (see the "real misclassified programmes" describe block below). Using a name
    // that should still be 'other' after that fix, not one the fix was built to correct.
    expect(classifySubjects("Multidisciplinary Technology")).toEqual({ primary: "other", secondary: [] });
  });

  test("is case-insensitive", () => {
    expect(classifySubjects("ARTIFICIAL INTELLIGENCE").primary).toBe("artificial_intelligence");
  });

  test("does not mis-tag 'law' as a substring of an unrelated word", () => {
    // Guards the " law" (leading-space) keyword choice in SUBJECT_KEYWORDS — "law" is a
    // common substring (e.g. "Flawless"); this must not match on that.
    expect(classifySubjects("Flawless Design Studies").primary).not.toBe("law");
  });
});

describe("classifySubjects — real programmes measured in the other bucket, 2026-08-22", () => {
  // Every name below is a real row from qtcvcflzxbuagvvwahhu's university_programs table at
  // measurement time (subject_taxonomy = 'other'), not an invented example — per instruction,
  // a test asserting Bilkent's İktisat and LSE's Economics land in the same bucket is worth
  // more than one just called "classifies economics".

  test("Bilkent's İktisat and LSE's Economics land in the same bucket", () => {
    expect(classifySubjects("İktisat").primary).toBe("economics");
    expect(classifySubjects("Economics").primary).toBe("economics");
  });

  test("closes the vocabulary gap: Biology, Chemistry, History, Education, Philosophy, Religion", () => {
    expect(classifySubjects("Biological Sciences").primary).toBe("biology");
    expect(classifySubjects("Biochemistry").primary).toBe("chemistry");
    expect(classifySubjects("Medieval Studies").primary).toBe("other"); // genuinely cross-period/discipline, stays other correctly
    expect(classifySubjects("Study of Religion").primary).toBe("arts_humanities");
    expect(classifySubjects("Elementary Education, BS").primary).toBe("education");
    expect(classifySubjects("Classics, BS").primary).toBe("arts_humanities");
    expect(classifySubjects("Environmental Science").primary).toBe("environmental_science");
  });

  test("handles a Turkish name whose own text is Turkish despite English-medium instruction", () => {
    // Real row: language_of_instruction = "English", but the programme's own name is
    // Turkish — "Çevre Mühendisliği (İngilizce)" = "Environmental Engineering (English)".
    // language_of_instruction can't be used as a routing signal; the name has to be read.
    const result = classifySubjects("Çevre Mühendisliği (İngilizce)");
    expect(result.primary).toBe("engineering");
  });

  test("handles Turkish possessive softening (mühendislik -> mühendisliği, k -> ğ)", () => {
    expect(classifySubjects("Kimya Mühendisliği (İngilizce) (Burslu)").primary).toBe("engineering");
  });

  test("routes a German 'wissenschaft' compound by its prefix, not the generic suffix", () => {
    // Real rows, both from the same sample: the suffix alone means "-science/-studies" and
    // carries no subject signal (Sportwissenschaft, Musikwissenschaft, ... are all real
    // programmes with nothing in common but the suffix) — the prefix is what matters.
    expect(classifySubjects("Politikwissenschaft").primary).toBe("political_science");
    expect(classifySubjects("Bildungswissenschaft / Pädagogik").primary).toBe("education");
    expect(classifySubjects("Biowissenschaften – Bachelor 100%").primary).toBe("biology");
  });

  test("a bare 'wissenschaft' suffix with no recognizable prefix correctly stays other", () => {
    // Real row — "Sportwissenschaft" (sports science) isn't a subject this taxonomy covers
    // at the volume measured; this should not silently absorb into an unrelated bucket.
    expect(classifySubjects("Sportwissenschaft – Bachelor 50%").primary).toBe("other");
  });

  test("a genuinely broad/faculty-level name correctly stays other, not forced into a bucket", () => {
    // Real row — "Social Sciences" as a bare umbrella term, not a specific discipline within
    // it. Forcing this into social_sciences would trade a visible gap for an invisible wrong
    // answer, which is the one thing this fix is not supposed to do.
    expect(classifySubjects("Combined Honours in Social Sciences with Foundation").primary).toBe("other");
  });

  test("a Turkish teacher-education programme is primary 'education', not the subject it teaches", () => {
    // Real rows — a first pass of this fix left these primary-matching mathematics/physics/
    // computer_science instead, because "Öğretmenliği" (teacher education) wasn't itself a
    // signal and those subject keywords are checked earlier in SUBJECT_KEYWORDS. The
    // credential these programmes grant is a teaching qualification, not a subject degree —
    // caught by re-running the dry run and reading the actual sample, not assumed correct.
    expect(classifySubjects("Matematik Öğretmenliği (İngilizce) (KKTC Uyruklu)").primary).toBe("education");
    const result = classifySubjects("Bilgisayar ve Öğretim Teknolojileri Öğretmenliği (İngilizce)");
    expect(result.primary).toBe("education");
    expect(result.secondary).toContain("computer_science");
  });

  test("the same teacher-education re-rank applies to German 'Lehramt' and 'Master of Education'", () => {
    // Real rows — caught by re-checking the dry-run sample after the Turkish fix landed:
    // the same shape exists in German (82 real `other` rows) and in English "Master of
    // Education" phrasing (73 real rows), not just Turkish.
    expect(classifySubjects("Mathematik – Lehramt an Gymnasien").primary).toBe("education");
    const result = classifySubjects("Mathematik (Master of Education (M.Ed.))");
    expect(result.primary).toBe("education");
    expect(result.secondary).toContain("mathematics");
  });

  test("a compound name resolves each side once both sides have vocabulary", () => {
    // Real row: Turkish "Politika ve Ekonomi (İngilizce)" = "Politics and Economics
    // (English)". Both economics and political_science exist in the taxonomy — the existing
    // primary+secondary mechanism already handles this once the vocabulary is closed, no new
    // compound-handling logic needed.
    const result = classifySubjects("Politika ve Ekonomi (İngilizce)");
    const tags = [result.primary, ...result.secondary];
    expect(tags).toContain("economics");
    expect(tags).toContain("political_science");
  });
});
