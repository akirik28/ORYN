import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyDeadlineShapes, classifyRequirementShapes, deriveEvaluationGate, deriveExcludedProvenances, deriveRecencyRule, findUniqueSlotCollisions } from "@/lib/requirements/shape-audit";
import { classifyCorpusRecord } from "@/lib/requirements/corpus-files";
import type { ResearchRequirementRecord } from "@/lib/requirements/ingest";
import type { ResearchDeadlineRecord } from "@/lib/deadlines/ingest";

const CORPUS_DIR = "data/research/university-requirements";

/** Every genuine requirement record in the live corpus, selected on the record's OWN shape.
 * Filename would be the wrong filter: 19 requirements-named files hold deadline records. */
function realRequirementRecords(): ResearchRequirementRecord[] {
  const records: ResearchRequirementRecord[] = [];
  for (const file of readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".jsonl"))) {
    for (const line of readFileSync(`${CORPUS_DIR}/${file}`, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const record: unknown = JSON.parse(trimmed);
      if (classifyCorpusRecord(record) === "requirement") records.push(record as ResearchRequirementRecord);
    }
  }
  return records;
}

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

/**
 * `deriveEvaluationGate` decides whether a row may be evaluated at all. These two decide what
 * the row CARRIES — the direction, the boundary, the named-and-refused variant — so whoever
 * authors `structured_rule` later reads the qualifier off the row instead of missing it in
 * `requirement_research_queue.raw_payload`.
 *
 * They turn on a distinction the gate does not have to make. A gate may safely be set from
 * anything in the record, a researcher's aside included, because over-gating costs only a
 * "check this yourself". A qualifier is an assertion about what the institution published, and
 * asserting one from the wrong sentence is how a university gets recorded as refusing a test
 * variant it explicitly accepts.
 */
describe("deriveRecencyRule", () => {
  it("carries METU's direction, which is the whole point of 0056 §2", () => {
    // A max-age model tells this student their fresh 2026 certificate qualifies. It is the
    // freshness that disqualifies it.
    const rule = deriveRecencyRule(req({ requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted." }));
    expect(rule).toEqual({ direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" });
  });

  it("reads the boundary date in every written form the corpus uses", () => {
    const forms = [
      ["taken on or after the 24th of December 2022 will not be accepted", "2022-12-24"],
      ["taken on or after 21 January 2026 will not be accepted", "2026-01-21"],
      ["taken on or after January 21, 2026 will not be accepted", "2026-01-21"],
      ["taken on or after 2026-01-21 will not be accepted", "2026-01-21"],
    ] as const;
    for (const [text, expected] of forms) {
      expect(deriveRecencyRule(req({ requirement_text: text }))?.boundaryDate).toBe(expected);
    }
  });

  it("omits the boundary date rather than inventing one from a bare year", () => {
    // "the 2026 cycle" states no cut-off. A fabricated 1 January would be a day-precision
    // claim the source never made, on the very row whose job is to stop exactly that.
    expect(deriveRecencyRule(req({ requirement_text: "Certificates taken on or after the start of the 2026 cycle will not be accepted." }))).toEqual({ direction: "not_valid_on_or_after" });
  });

  it("keeps Edinburgh's two anchors apart, which is why 0056 §2 is jsonb and not a max-age column", () => {
    // Two real Edinburgh rows, same length, different anchors. One column would silently
    // re-anchor whichever of them lost.
    expect(deriveRecencyRule(req({ requirement_text: "Your Mathematics qualifications must have been achieved no more than two academic years prior to entry." }))).toEqual({
      direction: "max_age",
      value: 2,
      unit: "years",
      anchor: "entry",
    });
    expect(
      deriveRecencyRule(
        req({ requirement_text: "Qualifications from the following English language tests must be no more than two years old from the start date of this programme, regardless of your nationality" })
      )
    ).toEqual({ direction: "max_age", value: 2, unit: "years", anchor: "programme_start" });
  });

  it("reads Ankara's 'valid for 2 years from the exam date' as a max_age anchored on the exam", () => {
    expect(deriveRecencyRule(req({ requirement_category_db: "entrance_exam", requirement_text: "TR-YÖS Minimum 200 points Valid for 2 years from the exam date." }))).toEqual({
      direction: "max_age",
      value: 2,
      unit: "years",
      anchor: "exam_date",
    });
  });

  it("returns null when the record states no window at all", () => {
    expect(deriveRecencyRule(req())).toBeNull();
  });

  it("never invents a window from a researcher's note about a different institution", () => {
    // The note may still GATE the row — over-caution is free. It must not become this
    // university's published validity window.
    const record = req({
      requirement_text: "IELTS Academic overall 6.5.",
      researcher_notes: "Contrast with METU, whose page states IELTS taken on or after the 24th of December 2022 will not be accepted.",
    });
    expect(deriveRecencyRule(record)).toBeNull();
    expect(deriveEvaluationGate(record)).toBe("inverted_recency");
  });
});

describe("deriveExcludedProvenances", () => {
  it("records Edinburgh's refusal", () => {
    const record = req({
      university_name: "The University of Edinburgh",
      requirement_text: "IELTS Academic: total 6.5 with at least 5.5 in each component.We do not accept IELTS One Skill Retake to meet our English language requirements.",
    });
    expect(deriveExcludedProvenances(record)).toEqual(["one_skill_retake"]);
  });

  it("does NOT record Southampton's acceptance of the same variant, in nearly the same words", () => {
    const record = req({ university_name: "University of Southampton", requirement_text: "(IELTS) Academic UKVI SELT (including One Skill Retake)" });
    expect(deriveExcludedProvenances(record)).toBeNull();
  });

  it("does not let a researcher's note quoting ANOTHER university's refusal become this one's policy", () => {
    // A real regression, caught by running this against the live corpus: Southampton's own
    // researcher_notes quote Edinburgh verbatim in order to document the contrast, and reading
    // them recorded Southampton as refusing the variant its source page explicitly accepts.
    const record = req({
      university_name: "University of Southampton",
      requirement_text: "(IELTS) Academic UKVI SELT (including One Skill Retake)",
      researcher_notes: "DIRECT INVERSION of an existing corpus record. Edinburgh states 'We do not accept IELTS One Skill Retake to meet our English language requirements'; Southampton names One Skill Retake as accepted.",
    });
    expect(deriveExcludedProvenances(record)).toBeNull();
  });

  it("splits both polarities inside ONE record, which is why this is decided per clause", () => {
    // TU Delft REQ-2026-08-21-DEL0027, verbatim: accepts One Skill Retake, refuses IELTS
    // Online and IELTS Indicator. A per-record verdict gets one of the three wrong whichever
    // way it falls.
    const record = req({
      university_name: "Delft University of Technology",
      requirement_text:
        "An IELTS (academic version) with an overall Band score of at least 7.0 and a minimum of 6.5 for each section (IELTS One Skill Retake will be accepted. Please check in advance if this test is available at your test centre). The IELTS Online (Academic) test and the IELTS Indicator test cannot be accepted.",
    });
    const refused = deriveExcludedProvenances(record);
    expect(refused).toContain("online_edition");
    expect(refused).toContain("indicator");
    expect(refused).not.toContain("one_skill_retake");
  });

  it("reads a refusal the record carries as a structured flag rather than as a sentence", () => {
    // QMUL REQ-2026-08-21-9203: requirement_text is the bare item name, and the "not accepted"
    // framing lives in is_exclusion so the quotation stays verbatim.
    expect(deriveExcludedProvenances(req({ university_name: "Queen Mary University of London", requirement_text: "TOEFL's MyBest scores", is_exclusion: true }))).toEqual(["mybest"]);
  });

  it("names every variant in Tilburg's combined refusal, including Tilburg's own spelling of it", () => {
    const record = req({
      university_name: "Tilburg University",
      requirement_text: "We do not accept a combination of test results on different test dates, such as TOEFL's 'My Best Scores' and IELTS 1 skill retake.",
    });
    expect(deriveExcludedProvenances(record)).toEqual(["one_skill_retake", "mybest", "multi_sitting_combination"]);
  });

  it("returns null, not an empty array, when nothing is refused — null means 'none known'", () => {
    expect(deriveExcludedProvenances(req())).toBeNull();
  });

  it("is order-stable, so a re-run does not produce a spurious diff of the live column", () => {
    const record = req({ requirement_text: "We do not accept IELTS One Skill Retake, TOEFL MyBest Scores, or superscores." });
    expect(deriveExcludedProvenances(record)).toEqual(["one_skill_retake", "mybest", "superscore"]);
  });
});

/**
 * The invariant that keeps the qualifier vocabulary and the refusal vocabulary from drifting
 * apart — the failure migration 0052 already produced once, when it added `is_exclusion` on
 * the promise that the evaluator would read the flag and nothing did for weeks.
 *
 * A qualifier on a row carrying NO evaluation gate is a qualifier with nothing enforcing it:
 * evaluate.ts checks the gate first, so an ungated row goes on to be compared on its number
 * alone. Asserted over the whole live corpus rather than over fixtures, because a fixture
 * cannot drift and the corpus can.
 */
describe("qualifier/gate invariant, over the real corpus", () => {
  const records = realRequirementRecords();

  it("has a corpus to check", () => {
    expect(records.length).toBeGreaterThan(1000);
  });

  it("never names a refused provenance on a row it leaves automatically evaluable", () => {
    expect(records.filter((r) => (deriveExcludedProvenances(r)?.length ?? 0) > 0 && deriveEvaluationGate(r) === null).map((r) => r.research_requirement_id)).toEqual([]);
  });

  it("never states a validity window on a row it leaves automatically evaluable", () => {
    expect(records.filter((r) => deriveRecencyRule(r) !== null && deriveEvaluationGate(r) === null).map((r) => r.research_requirement_id)).toEqual([]);
  });

  it("keeps direction and gate consistent — an inverted window never lands under a max-age gate", () => {
    for (const record of records) {
      if (deriveRecencyRule(record)?.direction !== "not_valid_on_or_after") continue;
      // `binding_commitment` outranks every shape (a legal obligation is not a window), so it
      // is the one other gate an inverted-recency row may legitimately carry.
      expect(["inverted_recency", "binding_commitment"]).toContain(deriveEvaluationGate(record));
    }
  });
});
