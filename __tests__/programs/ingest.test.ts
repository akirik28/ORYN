import { describe, expect, test, vi } from "vitest";
import {
  applyDecision,
  decideIngestion,
  judgeEvidence,
  resolveUniversity,
  looksPageConfirmed,
  programDedupKey,
  type ProgramWriteClient,
  type ResearchProgramRecord,
  type UniversityLookupRow,
} from "@/lib/programs/ingest";

const MIT: UniversityLookupRow = { id: "uni-mit", name: "Massachusetts Institute of Technology", country: "United States" };
const EDINBURGH: UniversityLookupRow = { id: "uni-edi", name: "The University of Edinburgh", country: "United Kingdom", aliases: ["University of Edinburgh"] };
const NAPIER: UniversityLookupRow = { id: "uni-nap", name: "Edinburgh Napier University", country: "United Kingdom" };
const KFUPM_A: UniversityLookupRow = { id: "uni-kfupm-a", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia" };
const KFUPM_B: UniversityLookupRow = { id: "uni-kfupm-b", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia" };
const EPFL: UniversityLookupRow = {
  id: "uni-epfl",
  name: "EPFL – École polytechnique fédérale de Lausanne",
  country: "Switzerland",
  aliases: ["EPFL"],
  websiteUrl: "https://www.epfl.ch",
};

const UNIVERSITIES = [MIT, EDINBURGH, NAPIER, KFUPM_A, KFUPM_B, EPFL];

function record(overrides: Partial<ResearchProgramRecord> = {}): ResearchProgramRecord {
  return {
    research_program_id: "RSRCH-0001",
    university_name: "Massachusetts Institute of Technology",
    university_country: "United States",
    program_name: "Computer Science",
    official_program_url: "https://cs.mit.edu",
    source_url: "https://cs.mit.edu",
    source_type: "official_primary",
    verification_status: "Verified - official page fetched and read",
    researched_at: "2026-08-17",
    ...overrides,
  };
}

describe("resolveUniversity (via lib/acquisition/identity.resolveIdentity)", () => {
  test("resolves an exact name+country match", () => {
    expect(resolveUniversity(record(), UNIVERSITIES).universityId).toBe("uni-mit");
  });

  test("does not resolve 'University of Edinburgh' to the unrelated Edinburgh Napier University", () => {
    const r = record({ university_name: "University of Edinburgh", university_country: "United Kingdom" });
    // Resolves via the registered alias on EDINBURGH, never to the unrelated Napier despite
    // both plausibly text-matching a naive search.
    expect(resolveUniversity(r, UNIVERSITIES).universityId).toBe("uni-edi");
  });

  test("resolves a well-known abbreviation via a registered alias, not a hardcoded override", () => {
    const r = record({ university_name: "EPFL", university_country: "Switzerland" });
    expect(resolveUniversity(r, UNIVERSITIES).universityId).toBe("uni-epfl");
  });

  test("refuses to resolve when two live rows share the same name and country (real duplicate case)", () => {
    const r = record({ university_name: "King Fahd University of Petroleum and Minerals", university_country: "Saudi Arabia" });
    const result = resolveUniversity(r, UNIVERSITIES);
    expect(result.universityId).toBeNull();
    expect(result.reason).toContain("duplicates must be merged");
  });

  test("returns null with a reason rather than guessing for a university not in the lookup at all", () => {
    const r = record({ university_name: "Some Unlisted College", university_country: "Nowhere" });
    const result = resolveUniversity(r, UNIVERSITIES);
    expect(result.universityId).toBeNull();
    expect(result.reason).toBeTruthy();
  });

  test("bridges a known label alias (Türkiye vs Turkey) via the shared country normalizer", () => {
    const turkish: UniversityLookupRow = { id: "uni-tr", name: "Boğaziçi University", country: "Turkey" };
    const r = record({ university_name: "Boğaziçi University", university_country: "Türkiye" });
    expect(resolveUniversity(r, [turkish]).universityId).toBe("uni-tr");
  });
});

describe("looksPageConfirmed", () => {
  test("true for an explicit official-page confirmation", () => {
    expect(looksPageConfirmed("Verified - official Bachelor/first-cycle page")).toBe(true);
  });

  test("false when the status says retrieval was blocked", () => {
    expect(looksPageConfirmed("Verified - official programme result; page retrieval blocked")).toBe(false);
  });

  test("false for anything not explicitly verified", () => {
    expect(looksPageConfirmed("Review")).toBe(false);
    expect(looksPageConfirmed("Rejected")).toBe(false);
  });
});

describe("decideIngestion", () => {
  test("accepts a well-formed, page-confirmed, resolvable record with an official-domain source", () => {
    const decision = decideIngestion(record(), UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
    expect(decision.programRow?.university_id).toBe("uni-mit");
    expect(decision.programRow?.verification_state).toBe("verified_current");
    expect(decision.programRow?.subject_taxonomy).toBe("computer_science");
    expect(decision.programRow?.source_type).toBe("official_primary");
  });

  test("never inserts a program row for an unresolved university, even with perfect evidence", () => {
    const r = record({ university_name: "Totally Unknown University", university_country: "Nowhere" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("unresolved_university");
    expect(decision.programRow).toBeNull();
    expect(decision.universityId).toBeNull();
  });

  test("rejects as insufficient_evidence when official_program_url is missing", () => {
    const r = record({ official_program_url: "" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("insufficient_evidence");
    expect(decision.programRow).toBeNull();
  });

  test("rejects as malformed_source when the source_url is not on an accepted domain for program facts", () => {
    // A Wikipedia-style or content-farm URL is never acceptable evidence for a program fact,
    // regardless of what the record's own source_type field claims.
    const r = record({ source_url: "https://en.wikipedia.org/wiki/MIT" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("malformed_source");
  });

  test("rejects as insufficient_evidence when verification_status reads as a search result only", () => {
    const r = record({ verification_status: "Verified - official programme result; page retrieval blocked" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("insufficient_evidence");
    expect(decision.programRow).toBeNull();
  });

  describe("evidence is judged independently of university resolution", () => {
    // The defect this covers: evidence used to be checked only after a record had resolved to
    // a university, so a record with both problems was audited as `unresolved_university` and
    // its evidence was never examined. Adding an alias later flipped it straight to
    // `insufficient_evidence`, making the alias fix look like the cause of a new problem when
    // the evidence had been inadequate all along.
    const BOTH_BROKEN = record({
      university_name: "Totally Unknown University",
      university_country: "Nowhere",
      verification_status: "Verified - official programme result; page retrieval blocked",
    });

    test("a record that is both unresolvable AND unevidenced reports the evidence failure", () => {
      const decision = decideIngestion(BOTH_BROKEN, UNIVERSITIES, new Set());
      expect(decision.outcome).toBe("insufficient_evidence");
      expect(decision.programRow).toBeNull();
    });

    test("...and its audit detail records the resolution failure too, not just the winning gate", () => {
      const decision = decideIngestion(BOTH_BROKEN, UNIVERSITIES, new Set());
      expect(decision.detail).toContain("page retrieval blocked");
      expect(decision.detail).toContain("university unresolved");
    });

    test("resolving the university does NOT change the outcome — the evidence problem was always the real one", () => {
      // Precisely the scenario that produced the misleading audit trail: same record, but now
      // the spine knows the institution. Before the reorder this flipped from
      // unresolved_university to insufficient_evidence; now it reads the same both times.
      const nowKnown: UniversityLookupRow = { id: "uni-unknown", name: "Totally Unknown University", country: "Nowhere" };
      const before = decideIngestion(BOTH_BROKEN, UNIVERSITIES, new Set());
      const after = decideIngestion(BOTH_BROKEN, [...UNIVERSITIES, nowKnown], new Set());
      expect(before.outcome).toBe("insufficient_evidence");
      expect(after.outcome).toBe("insufficient_evidence");
      // The resolution fact still moves, and the audit row still carries it.
      expect(before.universityId).toBeNull();
      expect(after.universityId).toBe("uni-unknown");
      expect(after.detail).toContain("university resolved");
    });

    test("an unresolved record with good evidence says so, so the two cases stay distinguishable", () => {
      const r = record({ university_name: "Totally Unknown University", university_country: "Nowhere" });
      const decision = decideIngestion(r, UNIVERSITIES, new Set());
      expect(decision.outcome).toBe("unresolved_university");
      expect(decision.detail).toContain("evidence gates passed");
    });

    test("a duplicate no longer masks an evidence failure either", () => {
      // The same masking shape one gate over: the dedup check used to run before the
      // verification_status check, so a redundant record's evidence was never examined.
      const existing = new Set([programDedupKey("uni-mit", "computer science", null, null, "https://cs.mit.edu", null)]);
      const r = record({ verification_status: "Verified - official programme result; page retrieval blocked" });
      expect(decideIngestion(r, UNIVERSITIES, existing).outcome).toBe("insufficient_evidence");
    });

    test("judgeEvidence consults nothing but the record", () => {
      expect(judgeEvidence(record()).ok).toBe(true);
      expect(judgeEvidence(record({ official_program_url: "" })).ok).toBe(false);
      expect(judgeEvidence(record({ source_url: "" })).ok).toBe(false);
      expect(judgeEvidence(record({ verification_status: "Review" })).ok).toBe(false);
      // Identical verdict for a record naming an institution that does not exist anywhere.
      expect(judgeEvidence(record({ university_name: "Nonexistent", university_country: "Nowhere" })).ok).toBe(true);
    });
  });

  test("flags a duplicate against an existing key without inserting again", () => {
    const existing = new Set([programDedupKey("uni-mit", "computer science", null, null, "https://cs.mit.edu", null)]);
    const decision = decideIngestion(record(), UNIVERSITIES, existing);
    expect(decision.outcome).toBe("duplicate");
    expect(decision.programRow).toBeNull();
  });

  test("is idempotent: ingesting the same record twice against its own first output never double-accepts", () => {
    const first = decideIngestion(record(), UNIVERSITIES, new Set());
    expect(first.outcome).toBe("accepted");
    const row = first.programRow!;
    const keyAfterFirst = new Set([programDedupKey(row.university_id, row.normalized_name, row.degree_level, row.language_of_instruction, row.official_program_url, row.degree_type)]);
    const second = decideIngestion(record(), UNIVERSITIES, keyAfterFirst);
    expect(second.outcome).toBe("duplicate");
  });

  // Regression: ingest-fixes defect 6 root cause. A Dutch/English track pair at the same
  // university, same program name and degree level, differing only by language_of_instruction,
  // used to collide on the old 3-part key (university_id|normalized_name|degree_level) — the
  // second record silently read as a "duplicate" of the first and was never inserted, with no
  // trace in either university_programs or program_research_queue.
  test("a same-name, same-degree-level, different-language pair are NOT duplicates of each other", () => {
    // EPFL (not MIT) so official_program_url can sit on its own real, non-.edu domain via the
    // websiteUrl-derived officialDomains hint — matches the "EPFL sits on .ch" acceptance tests
    // above rather than relying on MIT's built-in .edu recognition.
    const french = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      program_name: "Génie Mécanique",
      official_program_url: "https://www.epfl.ch/education/bachelor/mechanical-fr",
      source_url: "https://www.epfl.ch/education/bachelor/mechanical-fr",
      language_of_instruction: "French",
    });
    const english = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      program_name: "Génie Mécanique",
      official_program_url: "https://www.epfl.ch/education/bachelor/mechanical-en",
      source_url: "https://www.epfl.ch/education/bachelor/mechanical-en",
      language_of_instruction: "English",
    });

    const existingKeys = new Set<string>();
    const first = decideIngestion(french, UNIVERSITIES, existingKeys);
    expect(first.outcome).toBe("accepted");
    existingKeys.add(
      programDedupKey(
        first.programRow!.university_id,
        first.programRow!.normalized_name,
        first.programRow!.degree_level,
        first.programRow!.language_of_instruction,
        first.programRow!.official_program_url,
        first.programRow!.degree_type
      )
    );

    const second = decideIngestion(english, UNIVERSITIES, existingKeys);
    expect(second.outcome).toBe("accepted");
    expect(second.programRow?.language_of_instruction).toBe("English");
  });

  // A genuine re-run of the SAME language track, same URL, though, must still read as a
  // duplicate — the widened key must not accidentally stop deduplicating the case it always
  // correctly caught.
  test("a same-name, same-degree-level, same-language, same-url, SAME-degree_type repeat is still a duplicate", () => {
    const first = decideIngestion(record({ language_of_instruction: "English" }), UNIVERSITIES, new Set());
    expect(first.outcome).toBe("accepted");
    const row = first.programRow!;
    const existingKeys = new Set([programDedupKey(row.university_id, row.normalized_name, row.degree_level, row.language_of_instruction, row.official_program_url, row.degree_type)]);
    const second = decideIngestion(record({ language_of_instruction: "English" }), UNIVERSITIES, existingKeys);
    expect(second.outcome).toBe("duplicate");
  });

  // Migration 0054 (docs/handoffs/program-degree-type-key-decision.md): degree_type joined the
  // composite key because Durham/Southampton each publish the standard UK three-year Bachelor's
  // and four-year integrated Master's as separate, separately-admitted programmes sharing the
  // same name, degree level, language, AND official_program_url — real cases pulled directly
  // from a 20-file ingestion dry run, all 58 checked (not sampled) and confirmed genuinely
  // distinct, none a re-submission.
  test("a same-name/degree_level/language/url pair with a DIFFERENT degree_type is accepted as a distinct program (Durham-shaped)", () => {
    const bsc = record({ program_name: "Chemistry", degree_type: "BSc (Hons)" });
    const first = decideIngestion(bsc, UNIVERSITIES, new Set());
    expect(first.outcome).toBe("accepted");
    const row = first.programRow!;
    const existingKeys = new Set([programDedupKey(row.university_id, row.normalized_name, row.degree_level, row.language_of_instruction, row.official_program_url, row.degree_type)]);

    const mchem = record({ program_name: "Chemistry", degree_type: "MChem (Hons)" });
    const second = decideIngestion(mchem, UNIVERSITIES, existingKeys);
    expect(second.outcome).toBe("accepted");
  });

  // Migration 0053 (docs/handoffs/program-dedup-key-decision.md): official_program_url joined
  // the composite key specifically because Bologna/Padua's campus-specific programmes (same
  // name, same degree level, same language, genuinely DIFFERENT official_program_url per
  // campus — real cases pulled from program_research_queue's audit trail, all 11 rejected by
  // the database's own unique index despite decideIngestion's pre-computed snapshot saying
  // "accepted") were being forced to share one row. A same-name/degree/language pair that
  // differs ONLY by URL must now be accepted as two distinct rows, not merged.
  test("a same-name, same-degree-level, same-language pair with a DIFFERENT url is accepted as a distinct program (Bologna-shaped)", () => {
    const bologna = record({ program_name: "Nursing", degree_level: "Bachelor / first-cycle", official_program_url: "https://www.unibo.it/en/study/first-and-single-cycle-degree/programme/2026/5908" });
    const first = decideIngestion(bologna, UNIVERSITIES, new Set());
    expect(first.outcome).toBe("accepted");
    const row = first.programRow!;
    const existingKeys = new Set([programDedupKey(row.university_id, row.normalized_name, row.degree_level, row.language_of_instruction, row.official_program_url, row.degree_type)]);

    const rimini = record({ program_name: "Nursing", degree_level: "Bachelor / first-cycle", official_program_url: "https://www.unibo.it/en/study/first-and-single-cycle-degree/programme/2026/8475" });
    const second = decideIngestion(rimini, UNIVERSITIES, existingKeys);
    expect(second.outcome).toBe("accepted");
  });

  // Migration 0053: the old standalone "same official_program_url anywhere at this university
  // = duplicate, regardless of name" check (previously programUrlKey, tested here as "found
  // live: TU Delft") was removed after being measured against program_research_queue's full
  // audit history and found wrong 53 times out of 54 real firings — every other case was a
  // university publishing one shared catalogue-listing URL for its whole, genuinely distinct
  // programme list (Middle East Technical University alone: 53 real, unrelated programmes —
  // Architecture, Chemistry, History, an entire separate Northern Cyprus campus — silently
  // rejected because "Computer Engineering" happened to be accepted first at that same shared
  // URL). Two records with completely different names must now both accept, even sharing a URL.
  test("two genuinely different programs sharing one catalogue-listing URL both accept independently (METU-shaped, the defect this migration fixes)", () => {
    const existingKeys = new Set<string>();
    const computerEngineering = decideIngestion(record({ program_name: "Computer Engineering", official_program_url: "https://metu.example/tum-bolumler" }), UNIVERSITIES, existingKeys);
    expect(computerEngineering.outcome).toBe("accepted");
    existingKeys.add(
      programDedupKey(
        computerEngineering.programRow!.university_id,
        computerEngineering.programRow!.normalized_name,
        computerEngineering.programRow!.degree_level,
        computerEngineering.programRow!.language_of_instruction,
        computerEngineering.programRow!.official_program_url,
        computerEngineering.programRow!.degree_type
      )
    );

    const architecture = decideIngestion(record({ program_name: "Architecture", official_program_url: "https://metu.example/tum-bolumler" }), UNIVERSITIES, existingKeys);
    expect(architecture.outcome).toBe("accepted");
  });

  // A same-programme rename at the same URL (the one case the removed check correctly caught)
  // is a known, accepted, explicitly-documented residual cost of the fix above — it now inserts
  // as two rows rather than being auto-merged. Recorded here as documentation, not a defect:
  // occasional and human-visible beats systemic and silent (see migration 0053's design doc).
  test("a same-programme rename at the same URL (TU-Delft-shaped) now inserts as two rows — accepted, documented cost", () => {
    const existingKeys = new Set([programDedupKey("uni-mit", "computer science and engineering", null, null, "https://cs.mit.edu", null)]);
    const r = record({ program_name: "Computer Science & Engineering - English" });
    const decision = decideIngestion(r, UNIVERSITIES, existingKeys);
    expect(decision.outcome).toBe("accepted");
  });

  test("two different program names at the same university both accept independently", () => {
    const existing = new Set<string>();
    const econ = decideIngestion(record({ program_name: "Economics", official_program_url: "https://econ.mit.edu", source_url: "https://econ.mit.edu" }), UNIVERSITIES, existing);
    expect(econ.outcome).toBe("accepted");
  });

  test("accepts a resolved university's own non-.edu/.ac./.gov domain (EPFL sits on .ch)", () => {
    // Before this domain was wired as an officialDomains hint, sourceAuthority() only ever
    // recognized .edu/.ac./.gov-shaped domains, which would have wrongly rejected this as
    // malformed_source despite EPFL being correctly resolved and the source page being real.
    const r = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      official_program_url: "https://www.epfl.ch/education/bachelor/",
      source_url: "https://www.epfl.ch/education/bachelor/",
    });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
    expect(decision.programRow?.university_id).toBe("uni-epfl");
  });

  test("accepts a department subdomain of the resolved university's own domain", () => {
    const r = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      official_program_url: "https://sti.epfl.ch/bachelor/",
      source_url: "https://sti.epfl.ch/bachelor/",
    });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
  });

  test("still rejects a domain that is not the resolved university's own domain, even off .ch", () => {
    const r = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      official_program_url: "https://some-unrelated-site.ch/epfl-programs",
      source_url: "https://some-unrelated-site.ch/epfl-programs",
    });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("malformed_source");
  });
});

describe("applyDecision", () => {
  function acceptedDecision(overrides: Partial<ResearchProgramRecord> = {}) {
    const r = record(overrides);
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    if (decision.outcome !== "accepted") throw new Error("test setup expected an accepted decision");
    return { record: r, decision };
  }

  test("a normal accepted decision writes both a program row and a queue audit row with outcome 'accepted'", async () => {
    const { record: r, decision } = acceptedDecision();
    const insertProgram = vi.fn().mockResolvedValue({ id: "prog-1", error: null });
    const insertQueueRow = vi.fn().mockResolvedValue({ error: null });
    const client: ProgramWriteClient = { insertProgram, insertQueueRow };

    const result = await applyDecision(r, decision, "batch-1", client);

    expect(result).toEqual({ accepted: true, orphaned: false, programInsertError: null, queueInsertError: null });
    expect(insertProgram).toHaveBeenCalledTimes(1);
    expect(insertQueueRow).toHaveBeenCalledTimes(1);
    const queueRow = insertQueueRow.mock.calls[0][0];
    expect(queueRow.outcome).toBe("accepted");
    expect(queueRow.promoted_program_id).toBe("prog-1");
  });

  // Regression: ingest-fixes defect 6. decideIngestion decides "accepted" from a pre-computed
  // existingKeys snapshot, but the database's own unique index can still reject the insert (a
  // collision the snapshot couldn't see, or any other constraint). This must never vanish with
  // zero trace — the queue row still gets written, carrying the real DB error, with the
  // outcome downgraded to "rejected" rather than keeping the stale "accepted" label.
  test("a program insert failure still writes a queue audit row, with outcome downgraded to 'rejected'", async () => {
    const { record: r, decision } = acceptedDecision();
    const insertProgram = vi.fn().mockResolvedValue({ id: null, error: { message: "duplicate key value violates unique constraint" } });
    const insertQueueRow = vi.fn().mockResolvedValue({ error: null });
    const client: ProgramWriteClient = { insertProgram, insertQueueRow };

    const result = await applyDecision(r, decision, "batch-1", client);

    expect(result.accepted).toBe(false);
    expect(result.orphaned).toBe(false);
    expect(result.programInsertError).toContain("duplicate key value");
    expect(insertQueueRow).toHaveBeenCalledTimes(1);
    const queueRow = insertQueueRow.mock.calls[0][0];
    expect(queueRow.outcome).toBe("rejected");
    expect(queueRow.outcome_detail).toContain("university_programs insert failed");
    expect(queueRow.promoted_program_id).toBeNull();
  });

  test("a transient queue insert failure recovers on retry without being marked orphaned", async () => {
    const { record: r, decision } = acceptedDecision();
    const insertProgram = vi.fn().mockResolvedValue({ id: "prog-1", error: null });
    const insertQueueRow = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: "connection reset" } })
      .mockResolvedValueOnce({ error: null });
    const client: ProgramWriteClient = { insertProgram, insertQueueRow };

    const result = await applyDecision(r, decision, "batch-1", client, 3);

    expect(result.accepted).toBe(true);
    expect(result.orphaned).toBe(false);
    expect(result.queueInsertError).toBeNull();
    expect(insertQueueRow).toHaveBeenCalledTimes(2);
  });

  // Regression: ingest-fixes defect 7. If the queue insert fails on every retry attempt AFTER
  // the program row already landed, that program row has zero audit trail and does NOT
  // self-heal on a batch re-run (its key already satisfies existingKeys, so a re-run reads it
  // as "duplicate" and never retries the missing queue row) — this is the one case that must be
  // surfaced as `orphaned`, distinct from a plain insert failure.
  test("a queue insert that fails on every retry after a successful program insert is reported as orphaned", async () => {
    const { record: r, decision } = acceptedDecision();
    const insertProgram = vi.fn().mockResolvedValue({ id: "prog-1", error: null });
    const insertQueueRow = vi.fn().mockResolvedValue({ error: { message: "connection reset" } });
    const client: ProgramWriteClient = { insertProgram, insertQueueRow };

    const result = await applyDecision(r, decision, "batch-1", client, 2);

    expect(result.orphaned).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.queueInsertError).toContain("connection reset");
    expect(insertQueueRow).toHaveBeenCalledTimes(2);
  });

  test("a non-accepted decision (e.g. unresolved_university) never calls insertProgram, but still writes a queue audit row", async () => {
    const r = record({ university_name: "Totally Unknown University", university_country: "Nowhere" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("unresolved_university");

    const insertProgram = vi.fn().mockResolvedValue({ id: "should-not-be-called", error: null });
    const insertQueueRow = vi.fn().mockResolvedValue({ error: null });
    const client: ProgramWriteClient = { insertProgram, insertQueueRow };

    const result = await applyDecision(r, decision, "batch-1", client);

    expect(insertProgram).not.toHaveBeenCalled();
    expect(result.accepted).toBe(false);
    expect(insertQueueRow).toHaveBeenCalledTimes(1);
    const queueRow = insertQueueRow.mock.calls[0][0];
    expect(queueRow.outcome).toBe("unresolved_university");
    expect(queueRow.promoted_program_id).toBeNull();
  });
});
