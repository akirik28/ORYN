import { describe, expect, it } from "vitest";
import { classifyDeadlineShapes, classifyRequirementShapes, deriveEvaluationGate, findUniqueSlotCollisions } from "@/lib/requirements/shape-audit";
import type { ResearchRequirementRecord } from "@/lib/requirements/ingest";
import type { ResearchDeadlineRecord } from "@/lib/deadlines/ingest";

/** Minimal valid record; each test overrides only the field under examination so a failure
 * points at one shape rather than at fixture drift. */
function req(overrides: Partial<ResearchRequirementRecord> = {}): ResearchRequirementRecord {
  return {
    research_requirement_id: "REQ-TEST-0001",
    university_name: "Test University",
    university_country: "United Kingdom",
    program_name: null,
    category: "language",
    requirement_category_db: "english_proficiency",
    requirement_text: "IELTS Academic overall 6.5 with no component below 6.0.",
    text_fidelity: "verbatim_quoted",
    scope: null,
    source_url: "https://test.ac.uk/entry",
    source_type: "official_university_page",
    source_authority_passes_gate: true,
    retrieved_at: "2026-08-21T00:00:00Z",
    cycle_year: 2027,
    confidence: "high",
    verification_state: "VERIFIED_CURRENT",
    ...overrides,
  } as ResearchRequirementRecord;
}

function dl(overrides: Partial<ResearchDeadlineRecord> = {}): ResearchDeadlineRecord {
  return {
    research_deadline_id: "DL-TEST-0001",
    university_name: "Test University",
    university_country: "Germany",
    program_name: null,
    deadline_type: "application",
    deadline_date: "2027-01-15",
    deadline_text_verbatim: "Apply by 15 January 2027.",
    recurrence: "dated_specific",
    cycle_year: 2027,
    source_url: "https://test.de/apply",
    source_type: "official_university_page",
    source_authority_passes_gate: true,
    retrieved_at: "2026-08-21T00:00:00Z",
    verification_state: "VERIFIED_CURRENT",
    ...overrides,
  } as ResearchDeadlineRecord;
}

const shapesOf = (r: ResearchRequirementRecord) => classifyRequirementShapes(r).map((f) => f.shape);
const dlShapesOf = (r: ResearchDeadlineRecord) => classifyDeadlineShapes(r).map((f) => f.shape);

describe("classifyRequirementShapes", () => {
  it("returns no findings for a plain threshold the schema can hold", () => {
    expect(classifyRequirementShapes(req())).toEqual([]);
  });

  it("flags METU's inverted recency rather than reading it as a max-age window", () => {
    // The real record. A max-age model gets this exactly backwards: it is the freshness of
    // the certificate that disqualifies it, not its age.
    const shapes = shapesOf(req({ requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted.", is_exclusion: true }));
    expect(shapes).toContain("inverted_recency");
    expect(shapes).not.toContain("recency_window");
  });

  it("flags an ordinary max-age window separately from the inverted case", () => {
    const shapes = shapesOf(req({ requirement_text: "Test scores are valid for two years from the exam date." }));
    expect(shapes).toContain("recency_window");
    expect(shapes).not.toContain("inverted_recency");
  });

  it("flags eligibility encoded as absence from the structured field, not from prose", () => {
    // Ankara's "programmes EXCLUDING the above-listed" heading — the rule exists as a heading
    // plus the absence of any SAT/A-Level row beneath it.
    expect(shapesOf(req({ requirement_text: "VALID EXAMINATIONS AND REQUIRED SCORES FOR PROGRAMMES EXCLUDING THE ABOVE-LISTED", is_exclusion: true }))).toContain("eligibility_by_absence");
  });

  it("separates incomparable scales from merely-dropped scale qualifiers", () => {
    // Ankara: "440 points" with no denominator published anywhere.
    expect(shapesOf(req({ test_scale: "TR_YOS_SCALE_UNSTATED", requirement_text: "Minimum 440 points from TR-YÖS" }))).toContain("incomparable_scale");
    // METU: a rank, not a score.
    expect(shapesOf(req({ test_scale: "TR_YOS_PERCENTILE_RANK", requirement_text: "first 5th percentile" }))).toContain("incomparable_scale");
    // Hacettepe: 400 of 500 — a real scored threshold, but with nowhere to store the scale.
    const hacettepe = shapesOf(req({ test_scale: "TR_YOS_0_500", requirement_text: "TR-YÖS: 500 puan üzerinden en az 400 puan" }));
    expect(hacettepe).toContain("scale_qualifier_dropped");
    expect(hacettepe).not.toContain("incomparable_scale");
  });

  it("treats possibly_discontinued_instrument as ambiguous (lib/requirements/ingest.ts's own set omits it)", () => {
    expect(shapesOf(req({ scale_ambiguity: "possibly_discontinued_instrument", test_scale: "TOEFL_IBT_0_120_LEGACY" }))).toContain("incomparable_scale");
  });

  it("flags score provenance, which cannot be a global property of the test", () => {
    // Southampton accepts One Skill Retake; Edinburgh refuses it. Both official, both current.
    expect(shapesOf(req({ requirement_text: "We do not accept IELTS One Skill Retake to meet our English language requirements." }))).toContain("score_provenance");
    expect(shapesOf(req({ requirement_text: "TOEFL MyBest Scores are not taken into consideration." }))).toContain("score_provenance");
  });

  it("does not treat administrative 'online' prose as a score provenance", () => {
    // A bare /\bonline\b/ fired 38 times on this corpus, almost all of them like these.
    expect(shapesOf(req({ requirement_text: "Whether German or foreign HZB - the online application portal TUCaN is available for all applicants." }))).not.toContain("score_provenance");
    expect(shapesOf(req({ requirement_text: "You must complete the online self-test for study orientation and upload the result." }))).not.toContain("score_provenance");
    expect(shapesOf(req({ requirement_text: "Your GPA is only one indicator used when assessing an application." }))).not.toContain("score_provenance");
    // ...but the genuinely named variants still fire.
    expect(shapesOf(req({ requirement_text: "The IELTS Indicator test is not allowed." }))).toContain("score_provenance");
    expect(shapesOf(req({ requirement_text: "IELTS Online and IELTS One Skill Retake are not accepted." }))).toContain("score_provenance");
  });

  it("flags an age bar as unevaluable, because ORYN stores birth year only", () => {
    expect(shapesOf(req({ requirement_text: "Applicants must be 18 before 31st December (September Start programmes)", is_exclusion: true }))).toContain("unevaluable_age_bar");
  });

  it("flags conflicting and historical records, which have no column to survive in", () => {
    expect(shapesOf(req({ verification_state: "CONFLICTING_EVIDENCE" }))).toContain("unresolved_conflict");
    expect(shapesOf(req({ verification_state: "VERIFIED_HISTORICAL" }))).toContain("historical_as_current");
  });

  it("does not flag evidence-quality states as schema shapes", () => {
    // NEEDS_REVIEW is a research-lane judgement about evidence, not a missing column. It is a
    // safe block, and counting it as unrepresentable would inflate the number that decides
    // whether the schema needs to change.
    expect(shapesOf(req({ verification_state: "NEEDS_REVIEW" }))).toEqual([]);
  });
});

describe("classifyDeadlineShapes", () => {
  it("returns no findings for a fully dated deadline", () => {
    expect(classifyDeadlineShapes(dl())).toEqual([]);
  });

  it("flags undated recurring deadlines, which a date column cannot represent", () => {
    expect(dlShapesOf(dl({ recurrence: "recurring_annual_undated", cycle_year: null, deadline_date: null }))).toContain("undated_cycle");
    // A null cycle_year alone is enough — the convention is per-institution (TU Berlin 0%
    // undated, Heidelberg 100%), so no inference rule recovers the year.
    expect(dlShapesOf(dl({ cycle_year: null }))).toContain("undated_cycle");
  });

  it("flags binding deadline semantics, where the type carries eligibility logic", () => {
    expect(dlShapesOf(dl({ deadline_type: "early" }))).toContain("binding_semantics");
    expect(dlShapesOf(dl({ deadline_text_verbatim: "Restrictive Early Action applicants may not apply early elsewhere." }))).toContain("binding_semantics");
  });

  it("flags a confirmed-absent central date distinctly from an undated one", () => {
    expect(dlShapesOf(dl({ recurrence: "not_published_centrally", deadline_date: null, cycle_year: 2027 }))).toContain("no_date_published");
  });

  it("flags a historical deadline, which would read as live", () => {
    expect(dlShapesOf(dl({ verification_state: "VERIFIED_HISTORICAL" }))).toContain("historical_as_current");
  });
});

describe("findUniqueSlotCollisions", () => {
  it("counts every row past the first as a loss", () => {
    const collisions = findUniqueSlotCollisions(["u1|english_proficiency|", "u1|english_proficiency|", "u1|english_proficiency|", "u2|curriculum|intl"]);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({ key: "u1|english_proficiency|", count: 3, lost: 2 });
  });

  it("reports nothing when every slot is claimed once", () => {
    expect(findUniqueSlotCollisions(["u1|a|", "u1|b|", "u2|a|"])).toEqual([]);
  });
});

/**
 * The join between this audit (which counts shapes) and lib/requirements/evaluate.ts (which
 * refuses to produce a verdict for a gated row). Nothing populates the column until migration
 * 0056 is applied, so the mapping is what stops the two vocabularies drifting apart in the
 * meantime — a shape the audit reports and the evaluator has no gate for is a shape that
 * lands as an ordinary, confidently-evaluated row the day ingestion is switched on.
 */
describe("deriveEvaluationGate", () => {
  it("gates METU's 'IELTS taken on or after 24 December 2022 will not be accepted' as inverted_recency", () => {
    const record = req({
      university_name: "Middle East Technical University",
      requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted.",
    });
    expect(deriveEvaluationGate(record)).toBe("inverted_recency");
  });

  it("gates METU's TR-YÖS 'first 5th percentile' as incomparable_scale — a rank, not a score", () => {
    const record = req({
      university_name: "Middle East Technical University",
      requirement_category_db: "entrance_exam",
      requirement_text: "TR-YÖS: Having ranked in the first 5th percentile in the TR-YÖS exam taken by the applicant.",
      test_scale: "TR_YOS_PERCENTILE_RANK",
    });
    expect(deriveEvaluationGate(record)).toBe("incomparable_scale");
  });

  it("gates Ankara's undenominated 'Minimum 440 points from TR-YÖS' as incomparable_scale", () => {
    const record = req({
      university_name: "Ankara University",
      requirement_category_db: "entrance_exam",
      requirement_text: "Minimum 440 points from TR-YÖS",
      test_scale: "TR_YOS_SCALE_UNSTATED",
      scale_ambiguity: "undated_scale_assumption",
    });
    expect(deriveEvaluationGate(record)).toBe("incomparable_scale");
  });

  it("gates Edinburgh's IELTS One Skill Retake refusal as named_exclusion", () => {
    const record = req({
      university_name: "The University of Edinburgh",
      requirement_text: "IELTS Academic: total 6.5 with at least 5.5 in each component. We do not accept IELTS One Skill Retake to meet our English language requirements.",
    });
    expect(deriveEvaluationGate(record)).toBe("named_exclusion");
  });

  it("gates TU Dublin's 'must be 18 before 31st December' as age_bar", () => {
    const record = req({
      university_name: "Technological University Dublin",
      requirement_category_db: "international_requirement",
      requirement_text: "Applicants must be 18 before 31st December (September Start programmes) or 31st May (January Start programmes)",
      is_exclusion: false,
    });
    expect(deriveEvaluationGate(record)).toBe("age_bar");
  });

  it("gates a US Early Decision commitment as binding_commitment, ahead of every other shape", () => {
    const record = req({
      university_name: "Test University",
      category: "other",
      requirement_category_db: "supplemental_requirement",
      requirement_text: "Early Decision is a binding agreement. If admitted, you must enroll and withdraw all other applications.",
    });
    expect(deriveEvaluationGate(record)).toBe("binding_commitment");
  });

  it("does not gate Tilburg's explicitly non-binding matching activity", () => {
    const record = req({
      university_name: "Tilburg University",
      category: "other",
      requirement_category_db: "supplemental_requirement",
      requirement_text: "The matching activity helps you assess whether the program aligns with your interests. The advice is non-binding, so independent to your admission to the study program.",
    });
    expect(deriveEvaluationGate(record)).toBeNull();
  });

  it("leaves a clean, fully-resolved requirement ungated", () => {
    expect(deriveEvaluationGate(req({ test_scale: "IELTS_0_9", scale_ambiguity: "none" }))).toBeNull();
  });

  it("does not gate a merely-dropped scale qualifier — 0056 gives that a column, not a refusal", () => {
    // Tilburg's TOEFL_IBT_1_6 rows are correctly resolved research; gating them would block
    // every threshold the research lane actually got right.
    expect(deriveEvaluationGate(req({ test_scale: "TOEFL_IBT_1_6", scale_ambiguity: "resolved_unambiguous" }))).toBeNull();
  });

  it("returns exactly one gate for a record carrying several shapes — the column holds one", () => {
    const record = req({
      requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be accepted. We do not accept IELTS One Skill Retake.",
      verification_state: "VERIFIED_HISTORICAL",
    });
    expect(deriveEvaluationGate(record)).toBe("inverted_recency");
  });
});
