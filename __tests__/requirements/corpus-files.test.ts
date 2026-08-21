import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { classifyCorpusEntries, classifyCorpusFiles, classifyCorpusRecord, CorpusFileError, partitionCorpusRecords, type CorpusRecordInput } from "@/lib/requirements/corpus-files";

/** The 53 real filenames in data/research/university-requirements/ as of 2026-08-21, in the
 * two naming conventions that exist: the original `*_batch*` files and the country-lane
 * `uk_tr_*` / `de_nl_*` files the previous prefix filter could not see. */
const REAL_CORPUS_SAMPLE = [
  "requirements_batch1_2026-08-21.jsonl",
  "requirements_batch9_yok-esaslar_2026-08-21.jsonl",
  "deadlines_batch1_2026-08-21.jsonl",
  "uk_tr_requirements_batch1_2026-08-21.jsonl",
  "uk_tr_deadlines_batch3_2026-08-21.jsonl",
  "de_nl_requirements_heidelberg_2026-08-21.jsonl",
  "de_nl_deadlines_tuberlin_2026-08-21.jsonl",
];

describe("classifyCorpusEntries — the files the old prefix filter could not see", () => {
  it("classifies both naming conventions, not just *_batch*", () => {
    const { requirementFiles, deadlineFiles } = classifyCorpusEntries(REAL_CORPUS_SAMPLE);
    expect(requirementFiles).toEqual([
      "de_nl_requirements_heidelberg_2026-08-21.jsonl",
      "requirements_batch1_2026-08-21.jsonl",
      "requirements_batch9_yok-esaslar_2026-08-21.jsonl",
      "uk_tr_requirements_batch1_2026-08-21.jsonl",
    ]);
    expect(deadlineFiles).toEqual(["de_nl_deadlines_tuberlin_2026-08-21.jsonl", "deadlines_batch1_2026-08-21.jsonl", "uk_tr_deadlines_batch3_2026-08-21.jsonl"]);
  });

  it("accounts for every entry — nothing is silently dropped", () => {
    const { requirementFiles, deadlineFiles } = classifyCorpusEntries(REAL_CORPUS_SAMPLE);
    expect(requirementFiles.length + deadlineFiles.length).toBe(REAL_CORPUS_SAMPLE.length);
  });

  /** The load-bearing assertion is the first one: every entry in the real directory gets
   * classified, so no file is silently skipped the way the old prefix filter skipped 41 of
   * them. The count is a floor, not an equality — it guards against the directory being empty
   * or the classifier quietly narrowing, without breaking every time a research lane lands new
   * files. It was written as `toBe(53)` and broke within the hour when the US lane added 24
   * more; pinning a growing corpus to an exact number tests the calendar, not the code. */
  it("classifies every file in the real corpus directory, skipping none", () => {
    const entries = readdirSync("data/research/university-requirements");
    const { requirementFiles, deadlineFiles } = classifyCorpusEntries(entries, "data/research/university-requirements");
    expect(requirementFiles.length + deadlineFiles.length).toBe(entries.length);
    expect(entries.length).toBeGreaterThanOrEqual(53);
  });
});

describe("classifyCorpusEntries — unrecognised input is loud, not skipped", () => {
  it("throws on a .jsonl file whose name says neither requirements nor deadlines", () => {
    expect(() => classifyCorpusEntries([...REAL_CORPUS_SAMPLE, "fr_admissions_2026-08-21.jsonl"])).toThrow(CorpusFileError);
  });

  it("names the offending file in the message so the failure is actionable", () => {
    expect(() => classifyCorpusEntries([...REAL_CORPUS_SAMPLE, "fr_admissions_2026-08-21.jsonl"])).toThrow(/fr_admissions_2026-08-21\.jsonl/);
  });

  it("throws on a non-.jsonl file rather than quietly ignoring it", () => {
    expect(() => classifyCorpusEntries([...REAL_CORPUS_SAMPLE, "notes.txt"])).toThrow(/notes\.txt/);
  });

  it("refuses to guess when a filename names itself both ways", () => {
    expect(() => classifyCorpusEntries([...REAL_CORPUS_SAMPLE, "requirements_and_deadlines_2026.jsonl"])).toThrow(/ambiguous/);
  });

  it("reports every unclassifiable file at once, not just the first", () => {
    let message = "";
    try {
      classifyCorpusEntries([...REAL_CORPUS_SAMPLE, "one.txt", "two.csv"]);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("one.txt");
    expect(message).toContain("two.csv");
  });

  it("refuses to report a successful run over an empty directory", () => {
    expect(() => classifyCorpusEntries([])).toThrow(/zero records/);
  });
});

describe("classifyCorpusEntries — the declared ignore list", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("tolerates known filesystem noise but says so out loud", () => {
    const { requirementFiles, deadlineFiles } = classifyCorpusEntries([...REAL_CORPUS_SAMPLE, ".DS_Store"]);
    expect(requirementFiles.length + deadlineFiles.length).toBe(REAL_CORPUS_SAMPLE.length);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(".DS_Store"));
  });
});

describe("classifyCorpusFiles — an unreadable directory is an error, not an empty listing", () => {
  it("throws with the directory name rather than reporting zero files", () => {
    expect(() => classifyCorpusFiles("data/research/this-directory-does-not-exist")).toThrow(CorpusFileError);
    expect(() => classifyCorpusFiles("data/research/this-directory-does-not-exist")).toThrow(/this-directory-does-not-exist/);
  });
});

/**
 * The filename decides which files are READ. It must not also decide which pipeline each
 * record goes down, and until now it did — which is how 107 deadline records reached
 * `decideRequirementIngestion`, a function that reads a `research_requirement_id` they do not
 * carry. The visible symptom was audit inserts failing against a record id of literally
 * `undefined`; the invisible one is that those 107 sourced deadlines were being decided by the
 * wrong decision function and would never have reached `university_deadlines`.
 */
describe("classifyCorpusRecord — shape, not filename", () => {
  it("reads a requirement record from its own identifier", () => {
    expect(classifyCorpusRecord({ research_requirement_id: "REQ-2026-08-21-9102" })).toBe("requirement");
  });

  it("reads a deadline record from its own identifier, whatever file it sits in", () => {
    expect(classifyCorpusRecord({ research_deadline_id: "DL-2026-08-21-CA-0101" })).toBe("deadline");
  });

  it("refuses to guess when a record carries both identifiers", () => {
    expect(classifyCorpusRecord({ research_requirement_id: "REQ-1", research_deadline_id: "DL-1" })).toBeNull();
  });

  it("refuses a record with neither, and a blank id counts as neither", () => {
    expect(classifyCorpusRecord({ university_name: "Somewhere" })).toBeNull();
    expect(classifyCorpusRecord({ research_requirement_id: "   " })).toBeNull();
    expect(classifyCorpusRecord(null)).toBeNull();
    expect(classifyCorpusRecord("REQ-1")).toBeNull();
  });
});

describe("partitionCorpusRecords", () => {
  const input = (record: unknown, nameSaysShape: "requirement" | "deadline", file = "f.jsonl", index = 1): CorpusRecordInput => ({ file, index, nameSaysShape, record });

  it("routes a deadline record out of a requirements-named file, and says it did", () => {
    const partition = partitionCorpusRecords([
      input({ research_requirement_id: "REQ-1" }, "requirement", "ie_requirements_ucc_2026-08-21.jsonl", 1),
      input({ research_deadline_id: "DL-1" }, "requirement", "ie_requirements_ucc_2026-08-21.jsonl", 2),
    ]);
    expect(partition.requirementRecords).toHaveLength(1);
    expect(partition.deadlineRecords).toHaveLength(1);
    expect(partition.misroutedByFilename).toHaveLength(1);
    expect(partition.misroutedByFilename[0].index).toBe(2);
  });

  it("reports no misrouting when shape and filename agree", () => {
    expect(partitionCorpusRecords([input({ research_requirement_id: "REQ-1" }, "requirement"), input({ research_deadline_id: "DL-1" }, "deadline")]).misroutedByFilename).toEqual([]);
  });

  it("stops the run on a record it cannot classify, naming file and position", () => {
    expect(() => partitionCorpusRecords([input({ university_name: "Somewhere" }, "requirement", "es_ch_requirements_uzh_2026-08-21.jsonl", 7)])).toThrow(CorpusFileError);
    expect(() => partitionCorpusRecords([input({ university_name: "Somewhere" }, "requirement", "es_ch_requirements_uzh_2026-08-21.jsonl", 7)])).toThrow(/es_ch_requirements_uzh_2026-08-21\.jsonl record 7/);
  });

  it("reports every unclassifiable record at once, not just the first", () => {
    let message = "";
    try {
      partitionCorpusRecords([input({}, "requirement", "a.jsonl", 1), input({}, "deadline", "b.jsonl", 4)]);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("a.jsonl record 1");
    expect(message).toContain("b.jsonl record 4");
  });

  it("accounts for every input — nothing is dropped between the two lists", () => {
    const inputs = [input({ research_requirement_id: "REQ-1" }, "requirement"), input({ research_deadline_id: "DL-1" }, "requirement"), input({ research_deadline_id: "DL-2" }, "deadline")];
    const partition = partitionCorpusRecords(inputs);
    expect(partition.requirementRecords.length + partition.deadlineRecords.length).toBe(inputs.length);
  });
});

describe("partitionCorpusRecords — over the real corpus", () => {
  function realInputs(): CorpusRecordInput[] {
    const dir = "data/research/university-requirements";
    const { requirementFiles, deadlineFiles } = classifyCorpusFiles(dir);
    const inputs: CorpusRecordInput[] = [];
    for (const [files, nameSaysShape] of [
      [requirementFiles, "requirement"],
      [deadlineFiles, "deadline"],
    ] as const) {
      for (const file of files) {
        readFileSync(`${dir}/${file}`, "utf-8")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .forEach((line, i) => inputs.push({ file, index: i + 1, nameSaysShape, record: JSON.parse(line) }));
      }
    }
    return inputs;
  }

  it("classifies every record in the corpus — none is unroutable", () => {
    const inputs = realInputs();
    const partition = partitionCorpusRecords(inputs);
    expect(partition.requirementRecords.length + partition.deadlineRecords.length).toBe(inputs.length);
  });

  it("finds the misfiled deadline records the filename was hiding", () => {
    // Floors, not equalities: the research lanes add files constantly, and pinning an exact
    // count here tests the calendar rather than the code (the same lesson the file-count
    // assertion above already learned). What must not regress to zero is the detection.
    const misrouted = partitionCorpusRecords(realInputs()).misroutedByFilename;
    expect(misrouted.length).toBeGreaterThanOrEqual(107);
    expect(new Set(misrouted.map((m) => m.file)).size).toBeGreaterThanOrEqual(19);
    // Every one of them points the same way: a deadline record inside a requirements file.
    expect(misrouted.every((m) => m.nameSaysShape === "requirement")).toBe(true);
  });
});
