import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * The recurring bug this catches leaves no untranslated *string* behind, so no string count
 * and no translation-key check can see it: a component reads an English-only
 * `Record<Type, string>` map directly instead of calling the locale-aware accessor sitting
 * beside it. The text is in `lib/`, correct, and simply never asked which language it wanted.
 *
 * Found six times by hand before this existed — `profile/page.tsx` and `progress-view.tsx`
 * reading `DIMENSION_LABELS`/`EVIDENCE_STATE_SHORT_LABELS`, `score-radar.tsx` reading
 * `DIMENSION_LABELS_SHORT`, `lib/ai/student-context.ts` writing raw dimension *keys* into a
 * model prompt (which then said "your career_exploration gap" to a student), and
 * `advisor/page.tsx` + `strategy-panel.tsx`. Every one was invisible to tooling.
 *
 * The rule is deliberately about the *mixed* state, not about the maps themselves. A file
 * with no locale awareness at all that indexes an English map is consistent — it is simply
 * untranslated, and `app/(app)/u/[id]/page.tsx` is exactly that today. What is never right is
 * a file that has been made locale-aware and still reaches past the accessor for some of its
 * text, because that ships a page that is half one language.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "features", "components"];

/** English-only maps that have a locale-aware accessor, so reaching for them is a choice. */
const MAPS_WITH_ACCESSORS = [
  "DIMENSION_LABELS",
  "DIMENSION_LABELS_SHORT",
  "EVIDENCE_STATE_LABELS",
  "EVIDENCE_STATE_SHORT_LABELS",
  "OPEN_TO_LABELS",
  "SUBJECT_LABELS",
  "REQUIREMENT_CATEGORY_LABELS",
  "SEARCH_RESULT_TYPE_LABELS",
] as const;

const LOCALE_AWARE =
  /useTranslations|getTranslations|locale === "tr"|getLegalCopy|dimensionLabel|evidenceStateLabel|openToLabel|subjectLabel|requirementCategoryLabel|searchResultTypeLabel/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function scan(): { offenders: string[]; localeAwareFiles: number } {
  const offenders: string[] = [];
  let localeAwareFiles = 0;

  for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
    const source = readFileSync(file, "utf8");
    if (!LOCALE_AWARE.test(source)) continue;
    localeAwareFiles += 1;

    for (const map of MAPS_WITH_ACCESSORS) {
      // Indexing specifically — `Object.keys(MAP)` to enumerate options is fine and common.
      if (new RegExp(`\\b${map}\\[`).test(source)) {
        offenders.push(`${relative(ROOT, file)} indexes ${map} directly`);
      }
    }
  }
  return { offenders, localeAwareFiles };
}

describe("a locale-aware file never reaches past its label accessor", () => {
  const { offenders, localeAwareFiles } = scan();

  test("the scan found locale-aware files to check", () => {
    // Guards against the regex silently matching nothing and the assertion below becoming a
    // no-op that passes forever.
    expect(localeAwareFiles).toBeGreaterThan(20);
  });

  test("no locale-aware component indexes an English-only map that has an accessor", () => {
    expect(offenders, `these ship half a page in one language:\n${offenders.join("\n")}`).toEqual([]);
  });
});
