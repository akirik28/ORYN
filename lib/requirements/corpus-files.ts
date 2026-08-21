import { readdirSync } from "node:fs";

/**
 * Decides which files in the research corpus directory are requirement batches and which are
 * deadline batches — and, more importantly, refuses to let anything through unclassified.
 *
 * Why this exists as its own module rather than two `.filter()` calls in the runner:
 * scripts/ingest-requirements-deadlines.ts previously selected files with
 * `f.startsWith("requirements_batch")` / `f.startsWith("deadlines_batch")`. Those prefixes
 * match 12 of the corpus's 53 files. The other 41 — every `uk_tr_*` and `de_nl_*` file, 1,165
 * of the 1,296 records — were not rejected, not logged and not counted; they were simply
 * never seen. The run reported success over the 131 records it happened to match, and there
 * was no output anywhere from which the absence could be noticed.
 *
 * So the rule here is inverted: every directory entry must be positively classified, and
 * anything that cannot be is an error that stops the run. A file added under a new naming
 * convention will now halt ingestion with its own name in the message, rather than being
 * skipped in silence. That is the intended failure mode — a pipeline that quietly processes
 * nothing is worse than one that stops.
 *
 * NOTE ON SCOPE, since it changed: the filename decides which files are READ. It no longer
 * decides which pipeline each record goes down — see `partitionCorpusRecords` at the bottom of
 * this file, and the reason it had to stop being the filename's job.
 */
export interface CorpusFileClassification {
  requirementFiles: string[];
  deadlineFiles: string[];
}

/** Entries that are not corpus data and are known to be inert. Deliberately tiny and
 * explicit: an ignore list is the same silent-skip mechanism this module exists to remove,
 * so it holds only filesystem noise that carries no records, and callers are told when one
 * is hit rather than it vanishing. */
const IGNORED_ENTRIES = new Set([".DS_Store", ".gitkeep", "README.md"]);

export class CorpusFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusFileError";
  }
}

/** Pure half — takes the directory listing rather than reading it, so the classification
 * rules are testable without a fixture directory on disk. */
export function classifyCorpusEntries(entries: readonly string[], dirLabel = "the corpus directory"): CorpusFileClassification {
  const requirementFiles: string[] = [];
  const deadlineFiles: string[] = [];
  const unrecognized: string[] = [];
  const ignored: string[] = [];

  for (const name of [...entries].sort()) {
    if (IGNORED_ENTRIES.has(name)) {
      ignored.push(name);
      continue;
    }
    const lower = name.toLowerCase();
    if (!lower.endsWith(".jsonl")) {
      unrecognized.push(`${name} (not a .jsonl file)`);
      continue;
    }
    const looksLikeDeadlines = lower.includes("deadline");
    const looksLikeRequirements = lower.includes("requirement");
    if (looksLikeDeadlines && looksLikeRequirements) {
      // Not guessed at. A file naming itself both ways would silently have every record
      // routed to whichever branch was tested first.
      unrecognized.push(`${name} (names itself both "requirements" and "deadlines" — ambiguous)`);
    } else if (looksLikeDeadlines) {
      deadlineFiles.push(name);
    } else if (looksLikeRequirements) {
      requirementFiles.push(name);
    } else {
      unrecognized.push(`${name} (filename says neither "requirements" nor "deadlines")`);
    }
  }

  if (ignored.length > 0) {
    console.warn(`Ignoring ${ignored.length} known non-corpus entr(ies) in ${dirLabel}: ${ignored.join(", ")}`);
  }
  if (unrecognized.length > 0) {
    throw new CorpusFileError(
      `${unrecognized.length} file(s) in ${dirLabel} could not be classified as requirements or deadlines, so ingestion stopped rather than skipping them:\n` +
        unrecognized.map((u) => `  - ${u}`).join("\n") +
        `\nRename the file so it contains "requirements" or "deadlines", or add it to IGNORED_ENTRIES in lib/requirements/corpus-files.ts if it genuinely carries no records.`
    );
  }
  if (requirementFiles.length === 0 && deadlineFiles.length === 0) {
    throw new CorpusFileError(`${dirLabel} contains no requirement or deadline files. Refusing to report a successful run over zero records.`);
  }

  return { requirementFiles, deadlineFiles };
}

// ---------------------------------------------------------------------------------------
// Record-level classification
// ---------------------------------------------------------------------------------------
//
// The filename classification above decides which files get READ. It must not also decide
// which pipeline each record goes down, and until now it did.
//
// 19 of the corpus's requirements-named files contain deadline records — 107 of them, objects
// carrying `research_deadline_id` and no `research_requirement_id`, across the Canada, Ireland
// and Spain/Switzerland batches. Routed on the filename, every one of those was handed to the
// requirement path, which read a field they do not have. The visible symptom was audit inserts
// failing with `null value in column "research_requirement_id"` against a record id of
// literally `undefined`; the invisible one is that 107 genuinely sourced deadlines were being
// decided by the wrong decision function and would never reach `university_deadlines`.
//
// So the record's own shape is the authority and the filename is a hint. A record that matches
// neither shape — or, worse, both — stops the run by name and position, the same inverted rule
// the filename classifier already applies: a pipeline that quietly processes the wrong thing
// is worse than one that stops.

export type CorpusRecordShape = "requirement" | "deadline";

/** Which pipeline a record belongs to, judged only on which identifier it carries. Null means
 * "cannot be told", which is a caller error rather than a value to route on. */
export function classifyCorpusRecord(record: unknown): CorpusRecordShape | null {
  if (typeof record !== "object" || record === null) return null;
  const hasRequirementId = hasNonEmptyString(record, "research_requirement_id");
  const hasDeadlineId = hasNonEmptyString(record, "research_deadline_id");
  if (hasRequirementId && hasDeadlineId) return null;
  if (hasRequirementId) return "requirement";
  if (hasDeadlineId) return "deadline";
  return null;
}

function hasNonEmptyString(record: object, key: string): boolean {
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0;
}

/** One parsed record with enough provenance to name it in an error or a misrouting report. */
export interface CorpusRecordInput {
  file: string;
  /** Position within the parsed records of that file, 1-based. Not the physical line number —
   * blank lines are skipped during parsing — which is why it is named `index`. */
  index: number;
  /** What the FILENAME claimed, kept only so a disagreement can be reported. */
  nameSaysShape: CorpusRecordShape;
  record: unknown;
}

export interface CorpusRecordPartition {
  requirementRecords: CorpusRecordInput[];
  deadlineRecords: CorpusRecordInput[];
  /** Records whose own shape contradicts their filename. Reported, not hidden: a corpus file
   * quietly containing the other lane's records is a research-handoff problem that someone has
   * to fix upstream, and the run should say so every time until they do. */
  misroutedByFilename: CorpusRecordInput[];
}

/**
 * Splits every parsed record by its own shape. Throws `CorpusFileError`, naming every
 * offending record at once, if any record carries neither identifier or both.
 *
 * Deliberately returns the two lists rather than calling either pipeline: the deadline path
 * (`lib/deadlines/ingest.ts`) is another lane's file and is under active change. This module
 * classifies; the runner routes.
 */
export function partitionCorpusRecords(inputs: readonly CorpusRecordInput[]): CorpusRecordPartition {
  const requirementRecords: CorpusRecordInput[] = [];
  const deadlineRecords: CorpusRecordInput[] = [];
  const misroutedByFilename: CorpusRecordInput[] = [];
  const unclassifiable: string[] = [];

  for (const input of inputs) {
    const shape = classifyCorpusRecord(input.record);
    if (shape === null) {
      unclassifiable.push(`${input.file} record ${input.index} (carries neither research_requirement_id nor research_deadline_id, or carries both — cannot be routed)`);
      continue;
    }
    if (shape !== input.nameSaysShape) misroutedByFilename.push(input);
    (shape === "requirement" ? requirementRecords : deadlineRecords).push(input);
  }

  if (unclassifiable.length > 0) {
    throw new CorpusFileError(
      `${unclassifiable.length} record(s) could not be classified as a requirement or a deadline, so ingestion stopped rather than guessing:\n` +
        unclassifiable.map((u) => `  - ${u}`).join("\n") +
        `\nEvery corpus record must carry exactly one of research_requirement_id / research_deadline_id.`
    );
  }

  return { requirementRecords, deadlineRecords, misroutedByFilename };
}

/** I/O half. A directory that cannot be read is an error, not an empty listing. */
export function classifyCorpusFiles(dir: string): CorpusFileClassification {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err) {
    throw new CorpusFileError(`Could not read the corpus directory "${dir}": ${(err as Error).message}`);
  }
  return classifyCorpusEntries(entries, dir);
}
