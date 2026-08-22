/**
 * `university_programs.degree_level` is unconstrained free text (measured 2026-08-22: 42
 * distinct values across 14,457 rows, ranging 8 to 478 characters). Most of it is a real
 * category label ("Bachelor / first-cycle"), but some of it is a researcher's working note that
 * happened to get typed into the level column during acquisition — e.g. Toronto Medicine's
 * degree_level ends "...duration in years was not found stated in a citable form during this
 * research pass, so is left null rather than assumed," and 24 VU Amsterdam pre-master's rows
 * carry a full parenthetical definition of what a pre-master's is. Neither is a degree label a
 * student should ever see next to a programme name.
 *
 * This is the render-only guard: it never rewrites, truncates, or otherwise reinterprets
 * `degree_level` — it only decides whether the value is short enough to plausibly BE a category
 * label before showing it. It says nothing about `degree_level`'s cross-university consistency
 * (e.g. "Bachelor / first-cycle" vs "Bachelor's" naming the same thing, or which universities
 * tag integrated master's as its own value) — that's a data problem, not a display bug, and
 * belongs to a canonical-vocabulary migration, not this file.
 */

/** Longest `degree_level` value treated as a plausible category label. Matches the threshold
 * used to identify the prose-shaped values in the same corpus measurement (17 of 42 distinct
 * values exceed it) — reused here rather than picked separately so "prose" means the same thing
 * in the data audit and in what actually gets suppressed from render. */
export const DEGREE_LEVEL_DISPLAY_MAX_LENGTH = 60;

export interface ProgramDegreeLabelInput {
  degreeType: string | null | undefined;
  degreeLevel: string | null | undefined;
}

/**
 * The degree label safe to show a student for one programme, or null when nothing safe exists
 * (the caller should omit the label entirely rather than show a mangled fragment of a research
 * note — a truncated note is still not a degree label, just a shorter wrong one).
 *
 * `degree_type` (a researched abbreviation like "MEng" or "BSc (Hons)") is always preferred when
 * present — it's the more specific, per-programme field. `degree_level` is used as a fallback
 * only when short enough to plausibly be a category rather than a note.
 */
export function formatProgramDegreeLabel({ degreeType, degreeLevel }: ProgramDegreeLabelInput): string | null {
  if (degreeType) return degreeType;
  if (degreeLevel && degreeLevel.length <= DEGREE_LEVEL_DISPLAY_MAX_LENGTH) return degreeLevel;
  return null;
}
