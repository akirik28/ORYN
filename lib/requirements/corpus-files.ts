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
