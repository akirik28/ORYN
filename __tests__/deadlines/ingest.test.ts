import { describe, expect, it } from "vitest";
import {
  decideDeadlineIngestion,
  deadlineDedupKey,
  deadlineFactKeyFromRow,
  deriveBindingPolicy,
  extractSingleRecurringDate,
  recurringFactKey,
  type ResearchDeadlineRecord,
  type UniversityLookupRow,
} from "@/lib/deadlines/ingest";

const ERASMUS_ID = "11111111-1111-1111-1111-111111111111";
const UCC_ID = "22222222-2222-2222-2222-222222222222";
const MIT_ID = "33333333-3333-3333-3333-333333333333";

const UNIVERSITIES: UniversityLookupRow[] = [
  { id: ERASMUS_ID, name: "Erasmus University Rotterdam", country: "Netherlands", websiteUrl: "https://www.eur.nl" },
  { id: UCC_ID, name: "University College Cork", country: "Ireland", websiteUrl: "https://www.ucc.ie" },
  { id: MIT_ID, name: "Massachusetts Institute of Technology", country: "United States", websiteUrl: "https://web.mit.edu" },
];

/** Minimal record that lands cleanly; each test overrides only the field under examination. */
function dl(overrides: Partial<ResearchDeadlineRecord> = {}): ResearchDeadlineRecord {
  return {
    research_deadline_id: "DL-TEST-0001",
    university_name: "Erasmus University Rotterdam",
    university_country: "Netherlands",
    program_name: null,
    deadline_type: "application",
    deadline_date: "2026-10-15",
    deadline_text_verbatim: "15 October 2026",
    recurrence: "dated_specific",
    cycle_year: 2027,
    cycle_label: null,
    applies_to: "both",
    source_url: "https://www.eur.nl/en/apply",
    source_type: "official_primary",
    source_authority_passes_gate: true,
    retrieved_at: "2026-08-21",
    verification_state: "VERIFIED_CURRENT",
    ...overrides,
  } as ResearchDeadlineRecord;
}

function decide(record: ResearchDeadlineRecord, existingKeys: ReadonlySet<string> = new Set()) {
  return decideDeadlineIngestion(record, UNIVERSITIES, existingKeys);
}

describe("extractSingleRecurringDate", () => {
  it("extracts 'Month Day' with no year", () => {
    expect(extractSingleRecurringDate("Application for admission — February 1.")).toEqual({ month: 2, day: 1 });
  });

  it("extracts 'Day Month' with an ordinal suffix", () => {
    expect(extractSingleRecurringDate("The normal closing date is 1st February in the year of entry.")).toEqual({ month: 2, day: 1 });
  });

  it("extracts German 'Day. Month' — 'Bewerbungsschluss ... 15. Juli'", () => {
    expect(extractSingleRecurringDate("Bewerbungsschluss für den Studienbeginn im Wintersemester: 15. Juli")).toEqual({ month: 7, day: 15 });
  });

  it("extracts German DD.MM. — 'Winter semester: 15.03.'", () => {
    expect(extractSingleRecurringDate("Antragsfrist: 15.03.")).toEqual({ month: 3, day: 15 });
  });

  it("extracts an abbreviated month — 'Nov 9'", () => {
    expect(extractSingleRecurringDate("Fall Early Action — Materials Deadline: November 9")).toEqual({ month: 11, day: 9 });
  });

  it("the real Studielink record (DL-2026-08-21-ERA0001) — 'until 23:59 on 15 January for numerus fixus programmes'", () => {
    expect(extractSingleRecurringDate("until 23:59 on 15 January for numerus fixus programmes")).toEqual({ month: 1, day: 15 });
  });

  it("the real UCC CAO record (DL-2026-08-21-IE-UCC-001) — 'Apply through CAO (www.cao.ie) by 1 February.'", () => {
    expect(extractSingleRecurringDate("Apply through CAO (www.cao.ie) by 1 February.")).toEqual({ month: 2, day: 1 });
  });

  it("returns null for a same-fact date mentioned twice, deduping rather than flagging ambiguous", () => {
    expect(extractSingleRecurringDate("Deadline: 15 January. The 15 January deadline is strict and will not be extended.")).toEqual({ month: 1, day: 15 });
  });

  it("returns null for a genuine range — two distinct dates, either of which a naive extractor might pick wrong", () => {
    // Real corpus text (Freiburg): the closing date is 30 September, not 1 September (the
    // opening date) — collapsing this to "the first date found" would silently invert which
    // end of the window is the actual deadline.
    expect(extractSingleRecurringDate("The application period for the winter semester is from 1 September to 30 September.")).toBeNull();
  });

  it("returns null for a compound multi-fact string — application date and a document date are not the same fact", () => {
    // Real corpus text (McGill, DL-2026-08-21-CA-0104): collapsing this to one date would
    // silently discard whichever of the two facts didn't get picked.
    expect(extractSingleRecurringDate("Application for admission -- February 1; Supporting documents (as requested in checklist, excluding self-reporting) -- May 4.")).toBeNull();
  });

  it("returns null when no date-like pattern is present at all", () => {
    expect(extractSingleRecurringDate("Submit your application from early September.")).toBeNull();
  });

  it("returns null for empty/missing text", () => {
    expect(extractSingleRecurringDate(null)).toBeNull();
    expect(extractSingleRecurringDate(undefined)).toBeNull();
    expect(extractSingleRecurringDate("")).toBeNull();
  });

  it("does not extract a French or Turkish month name — a stated, deliberate scope boundary, not a silent gap", () => {
    expect(extractSingleRecurringDate("au plus tard le 28 février")).toBeNull();
  });
});

describe("deriveBindingPolicy", () => {
  it("maps 'Early Decision' to binding", () => {
    expect(deriveBindingPolicy("Early Decision")).toBe("binding");
    expect(deriveBindingPolicy("Early Decision I")).toBe("binding");
  });

  it("maps 'Restrictive Early Action' and 'Single-Choice Early Action' to restrictive_single_choice", () => {
    expect(deriveBindingPolicy("Restrictive Early Action")).toBe("restrictive_single_choice");
    expect(deriveBindingPolicy("Single-Choice Early Action")).toBe("restrictive_single_choice");
  });

  it("maps a plain 'Early Action' to non_binding", () => {
    expect(deriveBindingPolicy("Early Action")).toBe("non_binding");
    expect(deriveBindingPolicy("Early Action 1")).toBe("non_binding");
  });

  it("returns null for cycle_label=null, rather than guessing from surrounding text", () => {
    expect(deriveBindingPolicy(null)).toBeNull();
    expect(deriveBindingPolicy(undefined)).toBeNull();
  });

  it("returns null for a cycle_label that merely mentions 'early' without the controlled vocabulary — real corpus false-friends", () => {
    // Real corpus cycle_labels that must NOT be classified: none of these are the US ED/EA
    // taxonomy, despite containing the word "early".
    expect(deriveBindingPolicy("Early Admission 2026-27")).toBeNull(); // UCM — a pre-registration window, not a commitment type
    expect(deriveBindingPolicy("CAO reduced-fee early application, September 2026 entry")).toBeNull(); // Maynooth
    expect(deriveBindingPolicy("QuestBridge National College Match")).toBeNull(); // deliberately not inferred even though real-world QuestBridge Match is commonly binding — the source record doesn't state it
  });
});

describe("decideDeadlineIngestion — dated_specific (unchanged shape)", () => {
  it("builds a row with every migration-0056 column populated, not left at the schema default", () => {
    const decision = decide(dl());
    expect(decision.outcome).toBe("accepted");
    const row = decision.row!;
    expect(row.deadline_date).toBe("2026-10-15");
    expect(row.recurrence).toBe("dated_specific");
    expect(row.recurrence_month).toBeNull();
    expect(row.recurrence_day).toBeNull();
    expect(row.cycle_year).toBe(2027);
    expect(row.verification_state).toBe("VERIFIED_CURRENT");
    expect(row.deadline_text_verbatim).toBe("15 October 2026");
    expect(row.source_type).toBe("official_primary");
    expect(row.research_record_id).toBe("DL-TEST-0001");
  });

  it("still refuses a dated_specific record with a null deadline_date", () => {
    const decision = decide(dl({ deadline_date: null }));
    expect(decision.outcome).toBe("not_ingestible");
  });
});

describe("decideDeadlineIngestion — recurring_annual_undated (migration 0056)", () => {
  it("lands the real Studielink numerus fixus record as recurring with month=1, day=15, and a null year — not refused, not synthesized", () => {
    const decision = decide(
      dl({
        research_deadline_id: "DL-2026-08-21-ERA0001",
        deadline_date: null,
        deadline_text_verbatim: "until 23:59 on 15 January for numerus fixus programmes",
        recurrence: "recurring_annual_undated",
        cycle_year: null,
        verification_state: "VERIFIED_RECURRING_UNDATED",
        source_url: "https://info.studielink.nl/en/how-to-use-studielink/make-sure-you-are-on-time",
      })
    );
    expect(decision.outcome).toBe("accepted");
    const row = decision.row!;
    expect(row.deadline_date).toBeNull();
    expect(row.recurrence).toBe("recurring_annual_undated");
    expect(row.recurrence_month).toBe(1);
    expect(row.recurrence_day).toBe(15);
    expect(row.cycle_year).toBeNull();
    expect(row.verification_state).toBe("VERIFIED_RECURRING_UNDATED");
  });

  it("lands the real UCC CAO record as recurring with month=2, day=1", () => {
    const decision = decide(
      dl({
        research_deadline_id: "DL-2026-08-21-IE-UCC-001",
        university_name: "University College Cork",
        university_country: "Ireland",
        deadline_date: null,
        deadline_text_verbatim: "Apply through CAO (www.cao.ie) by 1 February.",
        recurrence: "recurring_annual_undated",
        cycle_year: null,
        verification_state: "VERIFIED_RECURRING_UNDATED",
        source_url: "https://www.ucc.ie/en/study/undergrad/how-to-apply/",
      })
    );
    expect(decision.outcome).toBe("accepted");
    const row = decision.row!;
    expect(row.deadline_date).toBeNull();
    expect(row.recurrence_month).toBe(2);
    expect(row.recurrence_day).toBe(1);
  });

  it("refuses (not_ingestible) a recurring record whose text yields zero or 2+ dates, with an accurate reason — not the stale pre-0056 wording", () => {
    const ambiguous = decide(
      dl({
        deadline_date: null,
        deadline_text_verbatim: "The application period for the winter semester is from 1 September to 30 September.",
        recurrence: "recurring_annual_undated",
        verification_state: "VERIFIED_RECURRING_UNDATED",
      })
    );
    expect(ambiguous.outcome).toBe("not_ingestible");
    expect(ambiguous.row).toBeNull();
    expect(ambiguous.detail).toMatch(/could not extract exactly one/);
    expect(ambiguous.detail).not.toMatch(/needs a recurrence_rule column/); // the obsolete pre-0056 reason must be gone

    const noDate = decide(
      dl({
        deadline_date: null,
        deadline_text_verbatim: "Submit your application from early September.",
        recurrence: "recurring_annual_undated",
        verification_state: "VERIFIED_RECURRING_UNDATED",
      })
    );
    expect(noDate.outcome).toBe("not_ingestible");
    expect(noDate.detail).toMatch(/could not extract exactly one/);
  });

  it("still refuses not_published_centrally, unchanged from before 0056", () => {
    const decision = decide(dl({ deadline_date: null, recurrence: "not_published_centrally", verification_state: "CURRENT_CYCLE_NOT_PUBLISHED" }));
    expect(decision.outcome).toBe("not_ingestible");
    expect(decision.detail).toMatch(/nothing published to ingest/);
  });
});

describe("decideDeadlineIngestion — VERIFIED_HISTORICAL now lands (migration 0056)", () => {
  it("accepts a VERIFIED_HISTORICAL record and carries the state onto the row, so read paths can exclude it", () => {
    const decision = decide(
      dl({
        deadline_date: "2026-01-15",
        verification_state: "VERIFIED_HISTORICAL",
        deadline_text_verbatim: "15 January 2026",
      })
    );
    expect(decision.outcome).toBe("accepted");
    expect(decision.row!.verification_state).toBe("VERIFIED_HISTORICAL");
  });

  it("still refuses CONFLICTING_EVIDENCE, NEEDS_REVIEW, and CURRENT_CYCLE_NOT_PUBLISHED", () => {
    for (const state of ["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]) {
      const decision = decide(dl({ verification_state: state }));
      expect(decision.outcome).toBe("not_ingestible");
      expect(decision.detail).toBe(`verification_state=${state}`);
    }
  });
});

describe("decideDeadlineIngestion — binding_policy on the built row", () => {
  it("carries binding_policy through for an unambiguous Early Decision record", () => {
    const decision = decide(dl({ cycle_label: "Early Decision" }));
    expect(decision.row!.binding_policy).toBe("binding");
  });

  it("leaves binding_policy null for an ordinary record with no cycle_label", () => {
    const decision = decide(dl());
    expect(decision.row!.binding_policy).toBeNull();
  });
});

describe("decideDeadlineIngestion — dedup across the dated/recurring key shapes", () => {
  it("treats a recurring record as duplicate against an existing recurring key, using the recurring:MM-DD shape", () => {
    const existingKey = deadlineDedupKey(ERASMUS_ID, "application", recurringFactKey(1, 15));
    const decision = decide(
      dl({
        deadline_date: null,
        deadline_text_verbatim: "until 23:59 on 15 January for numerus fixus programmes",
        recurrence: "recurring_annual_undated",
        verification_state: "VERIFIED_RECURRING_UNDATED",
      }),
      new Set([existingKey])
    );
    expect(decision.outcome).toBe("duplicate");
  });

  it("does NOT collide a recurring Jan-15 key with a dated_specific 2026-01-15 key — different fact shapes", () => {
    const datedKey = deadlineDedupKey(ERASMUS_ID, "application", "2026-01-15");
    const decision = decide(
      dl({
        deadline_date: null,
        deadline_text_verbatim: "until 23:59 on 15 January for numerus fixus programmes",
        recurrence: "recurring_annual_undated",
        verification_state: "VERIFIED_RECURRING_UNDATED",
      }),
      new Set([datedKey])
    );
    expect(decision.outcome).toBe("accepted");
  });
});

describe("deadlineFactKeyFromRow", () => {
  it("returns the recurring:MM-DD shape for a recurring row", () => {
    expect(deadlineFactKeyFromRow({ recurrence: "recurring_annual_undated", deadline_date: null, recurrence_month: 1, recurrence_day: 15 })).toBe("recurring:01-15");
  });

  it("returns the plain ISO date for a dated_specific row", () => {
    expect(deadlineFactKeyFromRow({ recurrence: "dated_specific", deadline_date: "2026-10-15", recurrence_month: null, recurrence_day: null })).toBe("2026-10-15");
  });

  it("returns null when neither shape is complete — not a value that would silently dedup against something unrelated", () => {
    expect(deadlineFactKeyFromRow({ recurrence: "not_published_centrally", deadline_date: null, recurrence_month: null, recurrence_day: null })).toBeNull();
  });
});

describe("decideDeadlineIngestion — program linking (exact match or null)", () => {
  const PROGRAMS = [
    { id: "prog-ibeb", universityId: ERASMUS_ID, name: "International Bachelor Economics and Business Economics" },
    { id: "prog-med-a", universityId: UCC_ID, name: "Medicine" },
    { id: "prog-med-b", universityId: UCC_ID, name: "Medicine" },
  ];

  it("links program_id when program_name resolves to exactly one program at that university", () => {
    const decision = decideDeadlineIngestion(
      dl({ program_name: "International Bachelor Economics and Business Economics" }),
      UNIVERSITIES,
      new Set<string>(),
      PROGRAMS
    );
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.program_id).toBe("prog-ibeb");
    expect(decision.programLinkNote).toBeNull();
  });

  it("leaves program_id null and states why when program_name has no exact match", () => {
    const decision = decideDeadlineIngestion(dl({ program_name: "Economics BSc" }), UNIVERSITIES, new Set<string>(), PROGRAMS);
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.program_id).toBeNull();
    expect(decision.programLinkNote).toContain("no exact-match");
  });

  it("leaves program_id null and states why when program_name is ambiguous at that university", () => {
    const decision = decideDeadlineIngestion(
      dl({ university_name: "University College Cork", university_country: "Ireland", program_name: "Medicine", source_url: "https://www.ucc.ie/en/apply" }),
      UNIVERSITIES,
      new Set<string>(),
      PROGRAMS
    );
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.program_id).toBeNull();
    expect(decision.programLinkNote).toContain("ambiguous");
  });

  it("leaves program_id null with no note when program_name is absent, exactly as before this feature existed", () => {
    const decision = decideDeadlineIngestion(dl({ program_name: null }), UNIVERSITIES, new Set<string>(), PROGRAMS);
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.program_id).toBeNull();
    expect(decision.programLinkNote).toBeNull();
  });

  it("defaults to no linking at all when no programs pool is passed — every existing caller's behavior, unchanged", () => {
    const decision = decide(dl({ program_name: "International Bachelor Economics and Business Economics" }));
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.program_id).toBeNull();
  });
});

describe("decideDeadlineIngestion — officialDomainsFor (sibling of the requirements-side fix)", () => {
  // This table had the identical website_url-only officialDomains gap as
  // lib/requirements/ingest.ts, on the same day, sitting on the same already-curated domains:
  // 7 real malformed_source rows for MIT (mitadmissions.org) alone, plus 3 LMU
  // (uni-muenchen.de) and 2 UvA (auc.nl) — all fixed by wiring this file to the same
  // officialDomainsFor() helper, zero new domain verification needed.
  it("accepts a deadline sourced from MIT's official admissions domain", () => {
    const record = dl({
      research_deadline_id: "DL-MIT-0001",
      university_name: "Massachusetts Institute of Technology",
      university_country: "United States",
      source_url: "https://mitadmissions.org/apply/firstyear/deadlines-requirements/",
    });
    const decision = decide(record);
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.university_id).toBe(MIT_ID);
  });

  it("still refuses the same record for an institution with no curated addition", () => {
    const record = dl({
      research_deadline_id: "DL-ERASMUS-MITADMISSIONS-0001",
      university_name: "Erasmus University Rotterdam",
      university_country: "Netherlands",
      source_url: "https://mitadmissions.org/apply/firstyear/deadlines-requirements/",
    });
    const decision = decide(record);
    expect(decision.outcome).toBe("malformed_source");
  });
});
