import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readdirSync } from "node:fs";
import { classifyCorpusEntries, classifyCorpusFiles, CorpusFileError } from "@/lib/requirements/corpus-files";

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

  it("reads the whole real corpus directory as 53 classified files", () => {
    const entries = readdirSync("data/research/university-requirements");
    const { requirementFiles, deadlineFiles } = classifyCorpusEntries(entries, "data/research/university-requirements");
    expect(requirementFiles.length + deadlineFiles.length).toBe(entries.length);
    expect(entries.length).toBe(53);
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
