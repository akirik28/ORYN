import { describe, expect, it } from "vitest";
import {
  applyRequirementDecision,
  decideRequirementIngestion,
  mapToRequirementVerificationState,
  NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES,
  requirementDedupKey,
  requirementRecordIdentity,
  requirementUniqueIndexKey,
  type ResearchRequirementRecord,
  type RequirementQueueRowInput,
  type RequirementWriteClient,
  type UniversityLookupRow,
} from "@/lib/requirements/ingest";
import { RequirementQualifiersSchema } from "@/lib/validation/requirements";

const EDINBURGH_ID = "11111111-1111-1111-1111-111111111111";
const METU_ID = "22222222-2222-2222-2222-222222222222";

const UNIVERSITIES: UniversityLookupRow[] = [
  { id: EDINBURGH_ID, name: "The University of Edinburgh", country: "United Kingdom", websiteUrl: "https://www.ed.ac.uk" },
  { id: METU_ID, name: "Middle East Technical University", country: "Türkiye", websiteUrl: "https://www.metu.edu.tr" },
];

/** Minimal record that lands cleanly; each test overrides only the field under examination. */
function req(overrides: Partial<ResearchRequirementRecord> = {}): ResearchRequirementRecord {
  return {
    research_requirement_id: "REQ-TEST-0001",
    university_name: "The University of Edinburgh",
    university_country: "United Kingdom",
    program_name: null,
    category: "language",
    requirement_category_db: "english_proficiency",
    requirement_text: "IELTS Academic: total 6.5 with at least 5.5 in each component.",
    text_fidelity: "verbatim_quoted",
    scope: null,
    source_url: "https://www.ed.ac.uk/study/undergraduate/entry-requirements",
    source_type: "official_university_page",
    source_authority_passes_gate: true,
    retrieved_at: "2026-08-21T00:00:00Z",
    cycle_year: 2027,
    confidence: "high",
    verification_state: "VERIFIED_CURRENT",
    ...overrides,
  } as ResearchRequirementRecord;
}

function decide(record: ResearchRequirementRecord) {
  return decideRequirementIngestion(record, UNIVERSITIES, new Set<string>(), new Map<string, readonly string[]>());
}

describe("decideRequirementIngestion — migration 0052's group columns", () => {
  it("sets every one of the four columns on an accepted row, so none is left undefined for the insert", () => {
    const decision = decide(req());
    expect(decision.outcome).toBe("accepted");
    expect(decision.row).not.toBeNull();
    expect(Object.keys(decision.row!)).toEqual(expect.arrayContaining(["is_exclusion", "clause_ref", "requirement_group_id", "group_role"]));
  });

  it("defaults an ordinary requirement to is_exclusion=false rather than leaving it unset", () => {
    expect(decide(req()).row!.is_exclusion).toBe(false);
    expect(decide(req({ is_exclusion: false })).row!.is_exclusion).toBe(false);
    expect(decide(req({ is_exclusion: null })).row!.is_exclusion).toBe(false);
  });

  it("carries is_exclusion=true through instead of discarding the record", () => {
    // Ankara University REQ-2026-08-21-9321 — the heading that governs the SAT threshold in
    // REQ-2026-08-21-9324. Dropping this while ingesting the threshold is the failure that
    // tells an ineligible student they qualify.
    const decision = decide(
      req({
        research_requirement_id: "REQ-2026-08-21-9321",
        requirement_category_db: "entrance_exam",
        scope: "international_undergraduate",
        requirement_text: "VALID EXAMINATIONS AND REQUIRED SCORES FOR PROGRAMMES EXCLUDING THE ABOVE-LISTED",
        is_exclusion: true,
      })
    );
    expect(decision.outcome).toBe("accepted");
    expect(decision.row!.is_exclusion).toBe(true);
  });

  it("stores clause_ref verbatim, and normalizes absent/blank to null", () => {
    expect(decide(req({ clause_ref: "B-b-5-a" })).row!.clause_ref).toBe("B-b-5-a");
    expect(decide(req()).row!.clause_ref).toBeNull();
    expect(decide(req({ clause_ref: "   " })).row!.clause_ref).toBeNull();
  });

  it("leaves grouping unset, because no record in this corpus states a group and inferring one is what 0052 forbids", () => {
    const decision = decide(req());
    expect(decision.row!.requirement_group_id).toBeNull();
    expect(decision.row!.group_role).toBeNull();
  });

  it("never emits a row that would violate university_requirements_group_role_consistency", () => {
    // The DB CHECK is (requirement_group_id is null) = (group_role is null). Asserted over
    // every shape this builder can produce, so a future change that sets one column without
    // the other fails here rather than at insert time.
    for (const record of [req(), req({ is_exclusion: true }), req({ clause_ref: "A-2-c-ii" }), req({ scope: "international_undergraduate" })]) {
      const row = decide(record).row!;
      expect(row.requirement_group_id === null).toBe(row.group_role === null);
    }
  });

  it("never emits a row that would violate university_requirements_exclusion_role_implies_flag", () => {
    // The DB CHECK is group_role <> 'exclusion' OR is_exclusion.
    for (const record of [req(), req({ is_exclusion: true })]) {
      const row = decide(record).row!;
      if (row.group_role === "exclusion") expect(row.is_exclusion).toBe(true);
    }
  });
});

describe("decideRequirementIngestion — the shapes that must still be refused", () => {
  it("still blocks unsafe verification states even when the record is an exclusion", () => {
    expect(decide(req({ is_exclusion: true, verification_state: "CONFLICTING_EVIDENCE" })).outcome).toBe("not_ingestible");
  });

  it("still blocks an exclusion with no requirement_text — an unstated carve-out is not storable", () => {
    expect(decide(req({ is_exclusion: true, requirement_text: "  " })).outcome).toBe("not_ingestible");
  });

  it("still blocks an ambiguous scale", () => {
    expect(decide(req({ scale_ambiguity: "partially_unsatisfiable" })).outcome).toBe("not_ingestible");
  });
});

describe("decideRequirementIngestion — verification_state on the accepted row", () => {
  // 2026-08-31: the row builder never set this column at all, so every requirement ever
  // ingested landed as the DB default ("unverified") regardless of what the research record
  // actually said. Found while vetting an older, unapplied corpus (REQ-2026-08-22-FI-HEL-001,
  // a VERIFIED_HISTORICAL record) and confirmed live: all 1,325 rows in university_requirements
  // carried "unverified" before this fix. These tests pin the mapping so it cannot regress
  // silently the way the original omission did.

  it("maps VERIFIED_CURRENT to verified_current", () => {
    expect(decide(req({ verification_state: "VERIFIED_CURRENT" })).row!.verification_state).toBe("verified_current");
  });

  it("maps VERIFIED_HISTORICAL to verified_historical, and does NOT refuse the record — matches lib/deadlines/ingest.ts's own choice to land historical facts rather than discard them", () => {
    const decision = decide(req({ verification_state: "VERIFIED_HISTORICAL" }));
    expect(decision.outcome).toBe("accepted");
    expect(decision.row!.verification_state).toBe("verified_historical");
  });

  it("maps VERIFIED_UNDATED to verified_current — a dateless fact (an eligibility floor) is not historical and not derived", () => {
    expect(decide(req({ verification_state: "VERIFIED_UNDATED" })).row!.verification_state).toBe("verified_current");
  });

  it("maps an unrecognized state to unverified rather than guessing", () => {
    expect(mapToRequirementVerificationState("SOMETHING_NEW")).toBe("unverified");
  });

  it("NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES contains exactly verified_historical and conflicting — never unverified, which is the column's own safe default, not an assertion the fact is wrong", () => {
    expect(NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has("verified_historical")).toBe(true);
    expect(NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has("conflicting")).toBe(true);
    expect(NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has("unverified")).toBe(false);
    expect(NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has("verified_current")).toBe(false);
    expect(NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES.has("verified_derived")).toBe(false);
  });
});

describe("requirementDedupKey", () => {
  it("groups rows by university+type+scope, treating null scope and empty scope as one bucket", () => {
    expect(requirementDedupKey(EDINBURGH_ID, "english_proficiency", null)).toBe(requirementDedupKey(EDINBURGH_ID, "english_proficiency", ""));
  });

  it("keeps genuinely different alternatives in the same bucket so title similarity, not the DB, separates them", () => {
    // Edinburgh's four routes all share university+type+scope. Migration 0056 is what lets
    // them coexist as rows; this key is only the bucket the title check runs within.
    const key = requirementDedupKey(EDINBURGH_ID, "english_proficiency", null);
    const titles = [
      "IELTS Academic: total 6.5 with at least 5.5 in each component.",
      "TOEFL-iBT (including Home Edition) from 21 January 2026: total 4.5 with at least 4.0 in each component.",
      "C1 Advanced (CAE) / C2 Proficiency (CPE): total 176 with at least 162 in each component.",
    ];
    const existing = new Map<string, readonly string[]>([[key, titles]]);
    const fourth = req({ requirement_text: "TOEFL-iBT (including Home Edition) before 21 January 2026: total 92 with at least 20 in each component." });
    expect(decideRequirementIngestion(fourth, UNIVERSITIES, new Set(), existing).outcome).toBe("accepted");
  });

  it("still catches a re-ingest of the same fact", () => {
    const key = requirementDedupKey(EDINBURGH_ID, "english_proficiency", null);
    const existing = new Map<string, readonly string[]>([[key, ["IELTS Academic: total 6.5 with at least 5.5 in each component."]]]);
    expect(decideRequirementIngestion(req(), UNIVERSITIES, new Set(), existing).outcome).toBe("duplicate");
  });
});

describe("requirementUniqueIndexKey", () => {
  it("mirrors the APPLIED index, so two alternatives with different titles are different rows", () => {
    // 0056 replaced UNIQUE(university, type, coalesce(scope,'')) with the same plus
    // md5(coalesce(title,'')). The pair below shares everything except the title, and under
    // the old index one of them was destroyed on insert.
    const a = requirementUniqueIndexKey(EDINBURGH_ID, "english_proficiency", null, "IELTS Academic: total 6.5 with at least 5.5 in each component.");
    const b = requirementUniqueIndexKey(EDINBURGH_ID, "english_proficiency", null, "TOEFL-iBT before 21 January 2026: total 92 with at least 20 in each component.");
    expect(a).not.toBe(b);
  });

  it("still collides for a byte-identical re-ingest, which is what the index is for", () => {
    const title = "IELTS Academic: total 6.5 with at least 5.5 in each component.";
    expect(requirementUniqueIndexKey(EDINBURGH_ID, "english_proficiency", null, title)).toBe(requirementUniqueIndexKey(EDINBURGH_ID, "english_proficiency", "", title));
  });

  it("is strictly finer than the application dedup bucket, and deliberately so", () => {
    // The bucket collects candidates for the fuzzy title check; the index is the backstop
    // underneath it. Modelling one with the other is what made the dry run report 705
    // destroyed rows against an index that no longer exists.
    const bucket = requirementDedupKey(EDINBURGH_ID, "english_proficiency", null);
    expect(requirementUniqueIndexKey(EDINBURGH_ID, "english_proficiency", null, "a")).not.toBe(bucket);
    expect(requirementUniqueIndexKey(EDINBURGH_ID, "english_proficiency", null, "a").startsWith(bucket)).toBe(true);
  });
});

/**
 * Migration 0056's columns, asserted on the BUILT ROW rather than on the outcome.
 *
 * The run this replaces reported 1,254 records as `accepted` and wrote every one of them with
 * these six columns unset — decided correctly, inserted successfully, and stripped of the
 * qualifier that made each one true. An outcome count of `accepted` proved nothing then and
 * proves nothing now, which is why every assertion below reads a column off `decision.row`.
 */
describe("decideRequirementIngestion — migration 0056's qualifier columns", () => {
  it("sets every one of 0056's columns on an accepted row, so none is left undefined for the insert", () => {
    // `undefined` is the specific hazard: supabase-js omits an undefined value from the
    // payload entirely, so the column silently takes its default instead of what was meant.
    const row = decide(req()).row!;
    for (const column of ["test_scale", "scale_ambiguity", "recency_rule", "excluded_provenances", "evaluation_gate", "research_record_id"] as const) {
      expect(Object.keys(row)).toContain(column);
      expect(row[column]).not.toBeUndefined();
    }
  });

  it("carries the research_record_id on every accepted row — 0056 §9's whole purpose", () => {
    // Without it a live requirement can only be traced back to its research record by matching
    // text against requirement_research_queue.raw_payload: a full-text scan over jsonb, and
    // exactly the lookup a reviewer needs to recover a dropped qualifier.
    expect(decide(req({ research_requirement_id: "REQ-2026-08-21-4008" })).row!.research_record_id).toBe("REQ-2026-08-21-4008");
  });

  it("passes test_scale and scale_ambiguity through verbatim, normalising blank to null", () => {
    const row = decide(req({ test_scale: "IELTS_0_9", scale_ambiguity: "none" })).row!;
    expect(row.test_scale).toBe("IELTS_0_9");
    expect(row.scale_ambiguity).toBe("none");
    expect(decide(req({ test_scale: "   " })).row!.test_scale).toBeNull();
    expect(decide(req()).row!.test_scale).toBeNull();
  });

  it("lands METU's IELTS record with direction not_valid_on_or_after and the inverted_recency gate", () => {
    // REQ-2026-08-21-9102, verbatim. A max-age-only model tells this student their fresh 2026
    // certificate qualifies, when it is the freshness that disqualifies it.
    const row = decide(
      req({
        research_requirement_id: "REQ-2026-08-21-9102",
        university_name: "Middle East Technical University",
        university_country: "Türkiye",
        source_url: "https://iso.metu.edu.tr/en/english-proficiency",
        scope: "english_proficiency_undergraduate",
        requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted.",
        is_exclusion: true,
        test_scale: "IELTS_0_9",
        scale_ambiguity: "none",
      })
    ).row!;
    expect(row.recency_rule).toEqual({ direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" });
    expect(row.evaluation_gate).toBe("inverted_recency");
    expect(row.test_scale).toBe("IELTS_0_9");
  });

  it("lands METU's TR-YÖS percentile record with the incomparable_scale gate and its scale intact", () => {
    // REQ-2026-08-21-9330. A rank, not a score: resolving it needs the cycle's national
    // distribution, which Oryn does not hold and cannot derive from a stored number.
    const row = decide(
      req({
        research_requirement_id: "REQ-2026-08-21-9330",
        university_name: "Middle East Technical University",
        university_country: "Türkiye",
        source_url: "https://iso.metu.edu.tr/en/system/files/odtu_iso_requirements.pdf",
        requirement_category_db: "entrance_exam",
        scope: "international_undergraduate",
        requirement_text: "TR-YÖS: Having ranked in the first 5th percentile in the TR-YÖS exam taken by the applicant.",
        test_scale: "TR_YOS_PERCENTILE_RANK",
        scale_ambiguity: "none",
      })
    ).row!;
    expect(row.evaluation_gate).toBe("incomparable_scale");
    expect(row.test_scale).toBe("TR_YOS_PERCENTILE_RANK");
  });

  it("lands Edinburgh's One Skill Retake refusal with excluded_provenances and the named_exclusion gate", () => {
    // REQ-2026-08-21-3020, verbatim including its missing space after "component."
    const row = decide(
      req({
        research_requirement_id: "REQ-2026-08-21-3020",
        requirement_text: "IELTS Academic: total 6.5 with at least 5.5 in each component.We do not accept IELTS One Skill Retake to meet our English language requirements.",
      })
    ).row!;
    expect(row.excluded_provenances).toEqual(["one_skill_retake"]);
    expect(row.evaluation_gate).toBe("named_exclusion");
  });

  it("does not record Southampton as refusing the variant it accepts, in almost the same words", () => {
    // The counterpart to the row above, and the reason provenance cannot be a global property
    // of the test: same variant, two UK universities, opposite answers, both official.
    const row = decide(
      req({
        research_requirement_id: "REQ-2026-08-21-9211",
        university_name: "The University of Edinburgh", // resolution is not what this asserts
        requirement_text: "(IELTS) Academic UKVI SELT (including One Skill Retake)",
        researcher_notes: "Edinburgh states 'We do not accept IELTS One Skill Retake to meet our English language requirements'; Southampton names One Skill Retake as accepted.",
      })
    ).row!;
    expect(row.excluded_provenances).toBeNull();
    // Still gated: provenance demonstrably matters on this row, so a human should confirm it.
    expect(row.evaluation_gate).toBe("named_exclusion");
  });

  it("writes recency_rule in the shape the READER parses, not the shape the migration sketched", () => {
    // 0056 §2's header sketches `boundary_date`; RecencyRuleSchema expects `boundaryDate`, and
    // Zod strips unknown keys rather than failing on them. Writing the migration's literal
    // shape would parse cleanly and drop the date — the same qualifier-stripping failure one
    // level down, invisible for the same reason. This asserts the round trip, not the writer.
    const row = decide(
      req({
        university_name: "Middle East Technical University",
        university_country: "Türkiye",
        source_url: "https://iso.metu.edu.tr/en/english-proficiency",
        requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted.",
      })
    ).row!;
    const readBack = RequirementQualifiersSchema.parse({
      evaluation_gate: row.evaluation_gate,
      is_exclusion: row.is_exclusion,
      test_scale: row.test_scale,
      scale_ambiguity: row.scale_ambiguity,
      recency_rule: row.recency_rule,
      excluded_provenances: row.excluded_provenances,
    });
    expect(readBack.recencyRule).toEqual({ direction: "not_valid_on_or_after", boundaryDate: "2022-12-24" });
    expect(readBack.evaluationGate).toBe("inverted_recency");
  });

  it("emits every qualifier column in a shape RequirementQualifiersSchema accepts — it fails CLOSED", () => {
    // An unreadable qualifier set makes evaluateRequirement answer needs_manual_review for
    // reasons that have nothing to do with the requirement. Asserted across the shapes this
    // builder can produce, not just the happy one.
    const records = [
      req(),
      req({ is_exclusion: true }),
      req({ test_scale: "TR_YOS_PERCENTILE_RANK" }),
      req({ requirement_text: "We do not accept IELTS One Skill Retake or TOEFL MyBest Scores." }),
      req({ requirement_text: "Qualifications must be no more than two years old from the start date of this programme." }),
      req({ requirement_text: "IELTS exams taken on or after the 24th of December 2022 will not be accepted." }),
    ];
    for (const record of records) {
      const row = decide(record).row;
      if (!row) continue;
      const parsed = RequirementQualifiersSchema.safeParse({
        evaluation_gate: row.evaluation_gate,
        is_exclusion: row.is_exclusion,
        test_scale: row.test_scale,
        scale_ambiguity: row.scale_ambiguity,
        recency_rule: row.recency_rule,
        excluded_provenances: row.excluded_provenances,
      });
      expect(parsed.success).toBe(true);
    }
  });
});

/**
 * The audit hole. Eleven inserts in the last run failed with `null value in column
 * "research_requirement_id"`, reported against a record id of literally `undefined` — the
 * value you get for a field the object does not have. 107 records across 19
 * `*_requirements_*.jsonl` files are DEADLINE records carrying `research_deadline_id`.
 *
 * Routing is fixed at source (lib/requirements/corpus-files.ts partitions on record shape, not
 * on filename). These assertions are the second lock: even reached directly, such a record is
 * identified, refused with the real reason, and still gets an audit row.
 */
describe("requirementRecordIdentity — no record can produce an unwritable audit row", () => {
  it("returns the requirement id for an ordinary record", () => {
    expect(requirementRecordIdentity(req({ research_requirement_id: "REQ-2026-08-21-9102" }))).toEqual({ id: "REQ-2026-08-21-9102", shape: "requirement" });
  });

  it("keeps a misfiled deadline record's OWN id rather than manufacturing one", () => {
    // The DL- prefix makes it self-describing in the queue, and it is the identifier that
    // actually finds the record in the corpus — the only thing an audit trail is for.
    const misfiled = { research_deadline_id: "DL-2026-08-21-CA-0101", university_name: "University of British Columbia" } as unknown as ResearchRequirementRecord;
    expect(requirementRecordIdentity(misfiled)).toEqual({ id: "DL-2026-08-21-CA-0101", shape: "misfiled_deadline" });
  });

  it("gives a record with no identifier at all a deterministic marker rather than undefined", () => {
    const nameless = { university_name: "Somewhere" } as unknown as ResearchRequirementRecord;
    const first = requirementRecordIdentity(nameless);
    expect(first.shape).toBe("unidentified");
    expect(first.id).toMatch(/^UNIDENTIFIED-[0-9a-f]{8}$/);
    expect(requirementRecordIdentity(nameless).id).toBe(first.id);
  });

  it("refuses a misfiled deadline as malformed_source, naming the routing bug rather than blaming the data", () => {
    // The old path let these fall through to `not_ingestible: requirement_text is null/empty`,
    // which reads as "a requirement with no text" and hides a routing bug behind a plausible
    // data complaint.
    const misfiled = {
      research_deadline_id: "DL-2026-08-21-CA-0101",
      university_name: "The University of Edinburgh",
      university_country: "United Kingdom",
      deadline_type: "application",
      deadline_date: "2027-01-15",
    } as unknown as ResearchRequirementRecord;
    const decision = decide(misfiled);
    expect(decision.outcome).toBe("malformed_source");
    expect(decision.detail).toContain("DL-2026-08-21-CA-0101");
    expect(decision.row).toBeNull();
  });

  it("writes an audit row with a non-null id for a record that has no research_requirement_id", async () => {
    // requirement_research_queue.research_requirement_id is NOT NULL. This is the assertion
    // that the hole is closed: the same record that produced `null value in column ...` now
    // produces a writable row.
    const written: RequirementQueueRowInput[] = [];
    const client: RequirementWriteClient = {
      async insertRequirement() {
        throw new Error("must not insert a requirement for a misfiled deadline record");
      },
      async insertQueueRow(row) {
        written.push(row);
        return { error: null };
      },
    };
    const misfiled = { research_deadline_id: "DL-2026-08-21-CA-0101", university_name: "Nowhere University", university_country: "Canada" } as unknown as ResearchRequirementRecord;
    const result = await applyRequirementDecision(misfiled, decide(misfiled), "batch-test", client);
    expect(result.queueInsertError).toBeNull();
    expect(written).toHaveLength(1);
    expect(written[0].research_requirement_id).toBe("DL-2026-08-21-CA-0101");
    expect(written[0].outcome).toBe("malformed_source");
    // Every field a misfiled record can be missing must be an explicit null, never undefined:
    // supabase-js drops undefined keys, so the column would silently take its default.
    for (const value of Object.values(written[0])) expect(value).not.toBeUndefined();
  });
});
