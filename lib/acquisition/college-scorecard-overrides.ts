/**
 * Shared College Scorecard bulk-file constants for every US acquisition script that reads it
 * (enrich-student-counts-us.ts, acquire-university-statistics-us.ts). Lives here rather than
 * being exported from one of those scripts because every script under scripts/ in this repo
 * runs its own `main().catch(...)` unconditionally at module load — importing a name FROM a
 * script file re-executes that script's entire pipeline (a real bug caught this session: a
 * first draft of acquire-university-statistics-us.ts imported straight from
 * enrich-student-counts-us.ts and silently re-ran its full download-and-write pipeline as a
 * side effect of the import). A plain `lib/` module has no such side effect.
 */

export const BULK_FILE_URL = "https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip";

/**
 * Explicit, individually city-verified overrides — NOT fuzzy matching. IPEDS assigns a
 * separate UNITID (and a disambiguated INSTNM) to every campus of a multi-campus system, so
 * a bare spine name like "Purdue University" has zero exact-string candidates even though the
 * flagship campus is unambiguously present as "Purdue University-Main Campus". Confirmed live
 * 2026-08-17 by grepping the bulk file for each institution and cross-checking the resulting
 * UNITID's CITY/STABBR against that institution's well-known flagship location (e.g. Purdue ->
 * West Lafayette, IN; Ohio State -> Columbus, OH) before adding it here — the same
 * external-verification bar the rest of this session's identity work uses, just against the
 * bulk file's own city/state columns instead of ROR. Never extended by name-similarity alone.
 *
 * Two real multi-campus unmatched names deliberately have NO override and stay unresolved:
 *   - "City University of New York": a ~25-college system (Baruch, Hunter, Brooklyn, ...) with
 *     no single UNITID representing it — there is no correct single row to pick.
 *   - "University of Minnesota (System)": our own spine names this row as the SYSTEM total: assigning it the flagship
 *     Twin Cities campus's headcount would silently relabel a campus figure as a system figure
 *     — exactly the HEADCOUNT/FTE/SYSTEM/CAMPUS conflation this pipeline exists to prevent.
 */
export const FLAGSHIP_UNITID_OVERRIDES: Record<string, string> = {
  "Arizona State University": "104151", // Tempe, AZ
  "Colorado State University": "126818", // Fort Collins, CO
  "Columbia University": "190150", // New York, NY — "...in the City of New York"
  "Georgia Institute of Technology": "139755", // Atlanta, GA
  "Louisiana State University": "159391", // Baton Rouge, LA — "...and Agricultural & Mechanical College"
  "North Carolina State University": "199193", // Raleigh, NC
  "Oklahoma State University": "207388", // Stillwater, OK
  "Pennsylvania State University": "214777", // University Park, PA
  "Purdue University": "243780", // West Lafayette, IN
  "Stony Brook University, State University of New York": "196097", // Stony Brook, NY
  "Texas A&M University": "228723", // College Station, TX
  "The New School, New York City and Paris": "193654", // New York, NY
  "The Ohio State University": "204796", // Columbus, OH
  "Tulane University": "160755", // New Orleans, LA — "...of Louisiana"
  "University at Albany SUNY": "196060", // Albany, NY
  "University at Buffalo SUNY": "196088", // Buffalo, NY
  "University of Cincinnati": "201885", // Cincinnati, OH
  "University of Colorado Denver": "126562", // Denver, CO — "...Anschutz Medical Campus"
  "University of Hawaiʻi at Mānoa": "141574", // Honolulu, HI — bulk file has no diacritics
  "University of New Mexico": "187985", // Albuquerque, NM
  "University of Oklahoma": "207500", // Norman, OK
  "University of Pittsburgh": "215293", // Pittsburgh, PA
  "University of South Carolina": "218663", // Columbia, SC
  "University of Virginia": "234076", // Charlottesville, VA
  "University of Washington": "236948", // Seattle, WA
};
