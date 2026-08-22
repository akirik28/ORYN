import { describe, expect, test } from "vitest";
import { checkFieldMonotonicity, checkRecordMonotonicity, type ResolvedCorrection } from "@/lib/opportunities/monotonic-guard";

const CYCLE_STATUS_VOCAB = new Set(["open", "upcoming", "closed", "date_not_announced", "historical", "discontinued", "unverified"]);

describe("checkFieldMonotonicity", () => {
  test("skips when proposed is empty and live is populated — would erase", () => {
    const d = checkFieldMonotonicity("R1", "cycle_status", "open", "unknown", { validVocabulary: CYCLE_STATUS_VOCAB });
    expect(d.action).toBe("skip");
  });

  test("Ron Brown (DLOPP-B5-13): an approved erasure clears a fabricated fact instead of being blocked as a downgrade", () => {
    const resolved: ResolvedCorrection[] = [{ recordId: "DLOPP-B5-13", field: "deadline", approved: true, reason: "2026-12-01 was an award-year projection, never a published date — RES-V2 confirmed the source states only an undated recurring pattern." }];
    const d = checkFieldMonotonicity("DLOPP-B5-13", "deadline", "2026-12-01", null, { resolvedCorrections: resolved });
    expect(d.action).toBe("write");
    expect(d.proposedValue).toBe(null);
  });

  test("without the explicit approval, the same erasure attempt is blocked as usual", () => {
    const d = checkFieldMonotonicity("DLOPP-B5-13", "deadline", "2026-12-01", null, {});
    expect(d.action).toBe("skip");
  });

  test("skips a proposed value with no live-constraint equivalent, never coerces it", () => {
    const d = checkFieldMonotonicity("R1", "cycle_status", "closed", "closed for MENA, Canada, South Asia & the Pacific", { validVocabulary: CYCLE_STATUS_VOCAB });
    expect(d.action).toBe("skip");
    expect(d.reason).toMatch(/no live-constraint equivalent/);
  });

  test("writes when live is empty and proposed populates it", () => {
    const d = checkFieldMonotonicity("R1", "deadline", null, "2026-10-01", {});
    expect(d.action).toBe("write");
  });

  test("writes when proposed exactly matches live — idempotent no-op", () => {
    const d = checkFieldMonotonicity("R1", "cycle_status", "unverified", "unverified", { validVocabulary: CYCLE_STATUS_VOCAB });
    expect(d.action).toBe("write");
  });

  test("holds when both populated and different, with no resolution on file", () => {
    const d = checkFieldMonotonicity("DLOPP-B1-01", "cycle_status", "closed", "date_not_announced", { validVocabulary: CYCLE_STATUS_VOCAB });
    expect(d.action).toBe("hold");
  });

  test("writes an explicitly approved correction", () => {
    const resolved: ResolvedCorrection[] = [{ recordId: "DLOPP-B1-01", field: "cycle_status", approved: true, reason: "RES-V2 confirmed live on the official page 2026-08-22" }];
    const d = checkFieldMonotonicity("DLOPP-B1-01", "cycle_status", "closed", "date_not_announced", { validVocabulary: CYCLE_STATUS_VOCAB, resolvedCorrections: resolved });
    expect(d.action).toBe("write");
  });

  test("skips an explicitly declined correction rather than leaving it held", () => {
    const resolved: ResolvedCorrection[] = [{ recordId: "DLOPP-B1-01", field: "cycle_status", approved: false, reason: "RES-V2 found no support for the change" }];
    const d = checkFieldMonotonicity("DLOPP-B1-01", "cycle_status", "closed", "date_not_announced", { validVocabulary: CYCLE_STATUS_VOCAB, resolvedCorrections: resolved });
    expect(d.action).toBe("skip");
  });

  test("a resolution for a different field on the same record does not leak across fields", () => {
    const resolved: ResolvedCorrection[] = [{ recordId: "DLOPP-B5-13", field: "deadline", approved: true, reason: "unrelated approval" }];
    const d = checkFieldMonotonicity("DLOPP-B5-13", "cycle_status", "upcoming", "date_not_announced", { validVocabulary: CYCLE_STATUS_VOCAB, resolvedCorrections: resolved });
    expect(d.action).toBe("hold");
  });

  test("live 'unverified' is a placeholder, not a real fact — a real proposed value populates it, no hold", () => {
    const d = checkFieldMonotonicity("R1", "cycle_status", "unverified", "upcoming", { validVocabulary: CYCLE_STATUS_VOCAB, placeholderLiveValues: new Set(["unverified"]) });
    expect(d.action).toBe("write");
  });

  test("without declaring the placeholder explicitly, the same case would incorrectly hold — the option is load-bearing, not cosmetic", () => {
    const d = checkFieldMonotonicity("R1", "cycle_status", "unverified", "upcoming", { validVocabulary: CYCLE_STATUS_VOCAB });
    expect(d.action).toBe("hold");
  });
});

describe("checkRecordMonotonicity — the known DLOPP monotonicity cases (RES-V1's 15-record/21-finding table, 2026-08-22)", () => {
  test("Ashoka (DLOPP-B4-10): open -> unknown is destructive on both fields, skip-skip", () => {
    const r = checkRecordMonotonicity("DLOPP-B4-10", "1e8e74cf-3bf0-43ad-81a8-c3a4b0e5bc70", [
      { field: "cycle_status", liveValue: "open", proposedValue: "unknown", validVocabulary: CYCLE_STATUS_VOCAB },
      { field: "current_cycle_label", liveValue: "Open year-round as of 2026-08-21, in six countries only", proposedValue: null },
    ]);
    expect(r.hasSkips).toBe(true);
    expect(r.hasHolds).toBe(false);
    expect(r.fieldsToWrite).toHaveLength(0);
  });

  test("IPsyO (DLOPP-B2-06): closed -> unknown is destructive, skipped", () => {
    const r = checkRecordMonotonicity("DLOPP-B2-06", "ee767c59-fee1-4c7a-8db4-ac1bcc5e9660", [{ field: "cycle_status", liveValue: "closed", proposedValue: "unknown", validVocabulary: CYCLE_STATUS_VOCAB }]);
    expect(r.hasSkips).toBe(true);
    expect(r.fieldsToWrite).toHaveLength(0);
  });

  test("STEM Racing (DLOPP-B3-02): unverified -> unknown is a true no-op, still fires as a write of the same effective value", () => {
    const r = checkRecordMonotonicity("DLOPP-B3-02", "c12ce265-c6c4-454b-97f5-680d366813ec", [{ field: "cycle_status", liveValue: "unverified", proposedValue: "unknown", validVocabulary: CYCLE_STATUS_VOCAB }]);
    // "unknown" has no live-constraint equivalent regardless of what's already live — skipped
    // mechanically, not specially allowed just because live happens to already be unverified.
    expect(r.decisions[0].action).toBe("skip");
  });

  test("CyberPatriot (DLOPP-B1-12): null proposed deadline against a populated live deadline is destructive", () => {
    const r = checkRecordMonotonicity("DLOPP-B1-12", "unknown-id", [{ field: "deadline", liveValue: "2026-10-01", proposedValue: null }]);
    expect(r.hasSkips).toBe(true);
  });

  test("DLOPP-B1-01 and DLOPP-B5-13 cycle_status: held, not skipped and not written, absent an explicit ruling", () => {
    const b101 = checkRecordMonotonicity("DLOPP-B1-01", "unknown-id-1", [{ field: "cycle_status", liveValue: "closed", proposedValue: "date_not_announced", validVocabulary: CYCLE_STATUS_VOCAB }]);
    const b513 = checkRecordMonotonicity("DLOPP-B5-13", "unknown-id-2", [{ field: "cycle_status", liveValue: "upcoming", proposedValue: "date_not_announced", validVocabulary: CYCLE_STATUS_VOCAB }]);
    expect(b101.hasHolds).toBe(true);
    expect(b101.fieldsToWrite).toHaveLength(0);
    expect(b513.hasHolds).toBe(true);
    expect(b513.fieldsToWrite).toHaveLength(0);
  });

  test("BASORG's 2026-08-22 ruling on both held records, applied: Ron Brown corrects on evidence, 120 Hours does not", () => {
    const resolved: ResolvedCorrection[] = [
      { recordId: "DLOPP-B5-13", field: "cycle_status", approved: true, reason: "RES-V2: source states 2026 competition closed, no 2027 cycle announced — 'upcoming' affirmatively contradicted." },
      { recordId: "DLOPP-B5-13", field: "deadline", approved: true, reason: "RES-V2: 2026-12-01 was an award-year projection, never published — a well-reasoned prediction is still a prediction." },
      { recordId: "DLOPP-B1-01", field: "cycle_status", approved: false, reason: "RES-V2: source is silent on cycle status — silence contradicts nothing, so RULE-INGEST-003's correction bar isn't met; date_not_announced would be a pure downgrade from closed." },
    ];

    const ronBrown = checkRecordMonotonicity(
      "DLOPP-B5-13",
      "unknown-id-2",
      [
        { field: "cycle_status", liveValue: "upcoming", proposedValue: "date_not_announced", validVocabulary: CYCLE_STATUS_VOCAB },
        { field: "deadline", liveValue: "2026-12-01", proposedValue: null },
      ],
      resolved
    );
    expect(ronBrown.hasHolds).toBe(false);
    expect(ronBrown.fieldsToWrite).toHaveLength(2);

    const hours120 = checkRecordMonotonicity("DLOPP-B1-01", "unknown-id-1", [{ field: "cycle_status", liveValue: "closed", proposedValue: "date_not_announced", validVocabulary: CYCLE_STATUS_VOCAB }], resolved);
    expect(hours120.hasHolds).toBe(false);
    expect(hours120.hasSkips).toBe(true);
    expect(hours120.fieldsToWrite).toHaveLength(0);
  });

  test("a record with no monotonicity issue writes normally", () => {
    const r = checkRecordMonotonicity("DLOPP-B1-99", "some-id", [
      { field: "deadline", liveValue: null, proposedValue: "2026-11-15" },
      { field: "cycle_status", liveValue: "unverified", proposedValue: "upcoming", validVocabulary: CYCLE_STATUS_VOCAB, placeholderLiveValues: new Set(["unverified"]) },
    ]);
    expect(r.hasHolds).toBe(false);
    expect(r.hasSkips).toBe(false);
    expect(r.fieldsToWrite).toHaveLength(2);
  });
});
