/**
 * Measurement-only classification of how a research requirement record relates to a live
 * `university_programs` row.
 *
 * This module decides NOTHING about writes. It exists because
 * `university_requirements` has no `program_name` column (verified against production's own
 * information_schema on 2026-08-21): a row either carries a real `program_id` or carries no
 * programme identification at all. So the only question worth measuring is which corpus
 * records COULD be resolved to a programme, by what evidence, and how confidently — and the
 * answer has to be produced without ever letting a name that merely looks similar stand in
 * for an identity check.
 *
 * The hard-won rules encoded here, each from a real miss:
 *
 *   1. Name matching is EXACT on the normalized form, never substring, never ranked-best.
 *      `ILIKE '%ITU%'` matched Georgia Tech for İTÜ; a ranked name search returned Uşak
 *      University first for "Anadolu". A ranked search always returns something, which is
 *      precisely the failure mode — it cannot express "no".
 *
 *   2. A name match only counts when the SOURCE's own degree-level statement agrees with the
 *      programme's. Ankara publishes two unrelated programmes both displayed as "Bitki
 *      Koruma" — one Lisans under the Faculty of Agriculture, one Önlisans under a vocational
 *      school. Name-only matching binds the wrong record to the right row, silently. When the
 *      source states no level at all, the match is NOT promoted: it is reported as
 *      level-unverified, because absence of a discriminator is not agreement.
 *
 *   3. A URL only identifies a programme when it is unique among that university's
 *      programmes. Manchester publishes one course-search page for 294 programmes and the
 *      Turkish records point at the YÖK Atlas root; on those, URL equality carries no
 *      identifying information whatsoever and must never be treated as a match.
 */

import { normalizeProgramName } from "@/lib/programs/normalize";

/** Coarse degree level, the only granularity at which source-side and programme-side
 * statements are reliably comparable across ten national systems. Deliberately NOT finer:
 * "Bachelor / first-cycle (integrated master's)" and "Bachelor / first-cycle" are both
 * undergraduate entry, and a finer scheme would manufacture disagreements that the sources
 * themselves do not make. */
export type DegreeLevelSignal = "undergraduate" | "graduate" | "sub_degree";

/** How a corpus record relates to the live programme table. Mutually exclusive and total. */
export type ProgramLinkageClass =
  /** Record is a deadline, not a requirement (some are misfiled into requirement-named files). */
  | "not_a_requirement_record"
  /** No live `universities` row could be resolved, so no programme lookup is even possible. */
  | "unresolved_university"
  /** `program_name` is absent — a university-wide rule. Correctly has no programme. */
  | "no_programme_stated"
  /** Exactly one live programme matches by exact normalized name AND agrees on degree level. */
  | "name_match_confirmed"
  /** Exactly one name match, but the source states no degree level, so rule 2 cannot clear it. */
  | "name_match_level_unverified"
  /** Name match(es) exist but every one disagrees with the source's own stated degree level. */
  | "name_match_level_conflict"
  /** More than one live programme matches by name and level — no discriminator available. */
  | "name_match_ambiguous"
  /** Programme is stated but no live programme matches by name at that university. */
  | "naming_mismatch";

/** How (and whether) a record's `source_url` identifies a live programme. Only the two
 * `*_unique` classes are resolutions; the rest are explicitly not. */
export type UrlLinkageClass =
  /** `source_url` equals exactly one programme's `official_program_url` at that university. */
  | "program_url_unique"
  /** `source_url` equals exactly one programme's `admissions_url` at that university. A
   * requirement is usually researched off the admissions page rather than the programme
   * page, so this is the tier most likely to carry real linkage — where it is populated. */
  | "admissions_url_unique"
  /** `source_url` equals a programme URL that 2+ programmes at that university share. */
  | "shared_url_ambiguous"
  /** `source_url` sits strictly under exactly one live programme URL's path (e.g. the
   * programme page plus `/admission`). A CANDIDATE for human verification, not a match. */
  | "descendant_candidate"
  /** Same, but 2+ programme URLs are ancestors — no candidate can be singled out. */
  | "descendant_ambiguous"
  /** No relationship to any live programme URL at that university. */
  | "no_url_relation";

export interface LinkageProgram {
  id: string;
  universityId: string;
  name: string;
  degreeLevel: string | null;
  officialProgramUrl: string | null;
  /** `university_programs.admissions_url` — populated on 11% of live rows, but it is the page
   * a requirement is actually researched from, so it is checked as its own evidence tier. */
  admissionsUrl?: string | null;
}

/** The subset of a corpus requirement record this module reads. Kept structural rather than
 * importing `ResearchRequirementRecord` so the classifier can be unit-tested on literals. */
export interface LinkageRecord {
  programName: string | null | undefined;
  scope: string | null | undefined;
  sourceUrl: string | null | undefined;
}

/** Maps a live `university_programs.degree_level` onto the coarse comparison scale. Returns
 * null when the value says nothing usable — treated downstream as "cannot compare", never as
 * "agrees". */
export function programDegreeLevelSignal(degreeLevel: string | null | undefined): DegreeLevelSignal | null {
  const v = (degreeLevel ?? "").toLowerCase();
  if (!v.trim()) return null;
  // Order matters: "Bachelor / first-cycle (integrated master's)" contains "master" but is an
  // undergraduate-entry programme, so the bachelor test has to win.
  if (v.includes("short-cycle") || v.includes("önlisans") || v.includes("onlisans") || v.includes("associate")) return "sub_degree";
  if (v.includes("bachelor") || v.includes("first-cycle") || v.includes("licence") || v.includes("grado") || v.includes("lisans")) return "undergraduate";
  if (v.includes("single-cycle") || v.includes("staatsexamen") || v.includes("long-cycle")) return "undergraduate";
  if (v.includes("master") || v.includes("second-cycle") || v.includes("doctor") || v.includes("phd")) return "graduate";
  return null;
}

/**
 * Level markers a requirement record can state about ITSELF, in the two fields that can carry
 * one (`scope`, and a degree prefix inside `program_name` such as "BSc Economics"). Nothing is
 * inferred from the university, the country, or the requirement category — an inferred level
 * is not the source's own statement, and rule 2 is specifically about the source's own
 * statement.
 *
 * Every marker is matched on WORD BOUNDARIES against a haystack whose separators have been
 * flattened to spaces. Substring matching is wrong here and was wrong in practice: the first
 * version of this function read Glasgow's `scope: "international_undergraduate"` as GRADUATE,
 * because "undergraduate" contains "graduate" — and then reported those two records as
 * degree-level conflicts, which is a fabricated finding. Boundary matching makes
 * " undergraduate " and " graduate " genuinely different strings.
 *
 * Three degree abbreviations are deliberately ABSENT from these lists because they do not
 * mean one level across the markets this product covers:
 *   MA    — an undergraduate degree at the ancient Scottish universities (Glasgow, Edinburgh,
 *           St Andrews), a Master's almost everywhere else.
 *   MEng, MSci, MPhys — UK integrated Master's, which are undergraduate-ENTRY four-year
 *           programmes; the live table records them as "Bachelor / first-cycle (integrated
 *           master's)".
 * Reading any of them as a level would produce confident wrong answers, so a record carrying
 * only one of them is reported as stating no level at all. That is the honest result.
 */
const SUB_DEGREE_MARKERS = ["önlisans", "onlisans", "ön lisans", "associate degree", "short-cycle", "foundation degree", "meslek yüksekokulu"];
const GRADUATE_MARKERS = ["master", "masters", "msc", "m.sc.", "llm", "mba", "graduate", "postgraduate", "yukseklisans", "doctoral", "doctorate", "phd", "second-cycle"];
const UNDERGRADUATE_MARKERS = ["undergraduate", "bachelor", "bachelors", "bsc", "b.sc.", "ba", "b.a.", "beng", "llb", "first-cycle", "lisans", "licence", "grado", "freshman", "first-year", "first year", "integratedmasters"];

/** Flattens separators to spaces and folds the two-word compounds whose parts would otherwise
 * be read as the opposite level. Returns a space-padded string so markers can be tested with
 * space-delimited boundaries. */
function levelHaystack(raw: string): string {
  const flattened = raw
    .toLowerCase()
    .replace(/[_/\\,;:()[\]{}|"'’]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const folded = flattened
    // "yüksek lisans" is a Master's; its second word alone is Turkish for a Bachelor's.
    .replace(/y[uü]ksek lisans/g, "yukseklisans")
    // "integrated master's" is an undergraduate-entry programme, not a Master's.
    .replace(/integrated master s|integrated masters|integrated master/g, "integratedmasters");
  return ` ${folded} `;
}

function statesLevel(haystack: string, markers: readonly string[]): boolean {
  return markers.some((m) => haystack.includes(` ${m} `));
}

/** Reads the record's OWN degree-level statement. Returns null when it makes none — which is
 * the common case and must stay distinguishable from "states undergraduate". */
export function recordDegreeLevelSignal(record: LinkageRecord): DegreeLevelSignal | null {
  for (const raw of [record.scope ?? "", record.programName ?? ""]) {
    const v = levelHaystack(raw);
    if (!v.trim()) continue;
    if (statesLevel(v, SUB_DEGREE_MARKERS)) return "sub_degree";
    if (statesLevel(v, UNDERGRADUATE_MARKERS)) return "undergraduate";
    if (statesLevel(v, GRADUATE_MARKERS)) return "graduate";
  }
  return null;
}

/** Canonical form for comparing two URLs as identifiers of the same page. Lowercases scheme
 * and host, drops a fragment and a trailing slash, and keeps the query string — Hamburg's 197
 * programme URLs differ ONLY in their query string (`studiengang.html?1525352964`), so a
 * normalizer that strips queries would collapse 197 distinct programmes into one. Returns ""
 * for anything unparseable, which never compares equal to a real URL. */
export function normalizeProgramUrl(url: string | null | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
}

/** True when `candidate` sits strictly below `ancestor` in the same origin's path tree.
 * Requires a real extra path segment, so `/econ` is not an ancestor of `/economics`. Any URL
 * carrying a query string is refused as an ancestor: for sources like Hamburg the query IS
 * the programme identifier, and treating the bare path as an ancestor would make one
 * programme page the parent of every other. */
export function isPathDescendant(candidate: string, ancestor: string): boolean {
  if (!candidate || !ancestor || candidate === ancestor) return false;
  let c: URL;
  let a: URL;
  try {
    c = new URL(candidate);
    a = new URL(ancestor);
  } catch {
    return false;
  }
  if (c.host.toLowerCase() !== a.host.toLowerCase()) return false;
  if (a.search) return false;
  const ancestorPath = a.pathname.replace(/\/+$/, "");
  const candidatePath = c.pathname.replace(/\/+$/, "");
  if (ancestorPath === "" || ancestorPath === "/") return false; // a site root is nobody's programme page
  return candidatePath.startsWith(`${ancestorPath}/`);
}

/** URL evidence alone, independent of names — so the two lines of evidence can be measured
 * against each other rather than one silently backstopping the other. */
export function classifyUrlLinkage(sourceUrl: string | null | undefined, programsAtUniversity: readonly LinkageProgram[]): { url: UrlLinkageClass; urlProgramId: string | null } {
  const src = normalizeProgramUrl(sourceUrl);
  if (!src) return { url: "no_url_relation", urlProgramId: null };

  const byUrl = new Map<string, LinkageProgram[]>();
  const byAdmissionsUrl = new Map<string, LinkageProgram[]>();
  for (const p of programsAtUniversity) {
    const n = normalizeProgramUrl(p.officialProgramUrl);
    if (n) byUrl.set(n, [...(byUrl.get(n) ?? []), p]);
    const a = normalizeProgramUrl(p.admissionsUrl);
    if (a) byAdmissionsUrl.set(a, [...(byAdmissionsUrl.get(a) ?? []), p]);
  }

  const exact = byUrl.get(src);
  if (exact) {
    return exact.length === 1 ? { url: "program_url_unique", urlProgramId: exact[0].id } : { url: "shared_url_ambiguous", urlProgramId: null };
  }
  const exactAdmissions = byAdmissionsUrl.get(src);
  if (exactAdmissions) {
    return exactAdmissions.length === 1 ? { url: "admissions_url_unique", urlProgramId: exactAdmissions[0].id } : { url: "shared_url_ambiguous", urlProgramId: null };
  }

  const ancestors = [...byUrl.entries()].filter(([u]) => isPathDescendant(src, u));
  if (ancestors.length === 1) {
    const [, programs] = ancestors[0];
    // An ancestor page shared by several programmes identifies none of them.
    return programs.length === 1 ? { url: "descendant_candidate", urlProgramId: programs[0].id } : { url: "descendant_ambiguous", urlProgramId: null };
  }
  if (ancestors.length > 1) return { url: "descendant_ambiguous", urlProgramId: null };

  return { url: "no_url_relation", urlProgramId: null };
}

export interface ProgramLinkageResult {
  linkage: ProgramLinkageClass;
  /** Programme this record would resolve to, when and only when `linkage` is
   * `name_match_confirmed`. Every other class resolves to nothing on purpose. */
  resolvedProgramId: string | null;
  /** Every live programme matching by exact normalized name, before the level test. */
  nameMatchIds: string[];
  recordLevel: DegreeLevelSignal | null;
  url: UrlLinkageClass;
  /** Programme the URL evidence points at, for `unique` and `descendant_candidate` only. */
  urlProgramId: string | null;
}

/**
 * Classifies one record against the live programmes of ONE already-resolved university.
 *
 * `programsAtUniversity` must already be restricted to that university — the caller resolves
 * the institution (via `resolveRequirementUniversity`, which goes through the shared
 * alias/external-id identity layer), and this function never searches across institutions.
 * That separation is deliberate: cross-institution name search is exactly what produced the
 * Georgia-Tech-for-İTÜ result.
 */
export function classifyProgramLinkage(record: LinkageRecord, programsAtUniversity: readonly LinkageProgram[]): ProgramLinkageResult {
  const recordLevel = recordDegreeLevelSignal(record);
  const { url, urlProgramId } = classifyUrlLinkage(record.sourceUrl, programsAtUniversity);
  const base = { recordLevel, url, urlProgramId };

  const stated = (record.programName ?? "").trim();
  if (!stated) {
    return { linkage: "no_programme_stated", resolvedProgramId: null, nameMatchIds: [], ...base };
  }

  const key = normalizeProgramName(stated);
  const nameMatches = key ? programsAtUniversity.filter((p) => normalizeProgramName(p.name) === key) : [];
  const nameMatchIds = nameMatches.map((p) => p.id);

  if (nameMatches.length === 0) {
    return { linkage: "naming_mismatch", resolvedProgramId: null, nameMatchIds, ...base };
  }
  if (recordLevel === null) {
    // Rule 2: no statement from the source means the level test cannot be run. Not a match.
    return { linkage: "name_match_level_unverified", resolvedProgramId: null, nameMatchIds, ...base };
  }

  const agreeing = nameMatches.filter((p) => programDegreeLevelSignal(p.degreeLevel) === recordLevel);
  if (agreeing.length === 0) {
    return { linkage: "name_match_level_conflict", resolvedProgramId: null, nameMatchIds, ...base };
  }
  if (agreeing.length > 1) {
    return { linkage: "name_match_ambiguous", resolvedProgramId: null, nameMatchIds, ...base };
  }
  return { linkage: "name_match_confirmed", resolvedProgramId: agreeing[0].id, nameMatchIds, ...base };
}

/** A programme URL carries identifying information only if no sibling programme at the same
 * university shares it. Counted per university, never globally: two universities publishing
 * the same URL would be a different (and much rarer) problem. */
export function countProgramsWithIdentifyingUrl(programs: readonly LinkageProgram[]): { identifying: number; shared: number; missing: number } {
  const counts = new Map<string, number>();
  for (const p of programs) {
    const n = normalizeProgramUrl(p.officialProgramUrl);
    if (!n) continue;
    counts.set(`${p.universityId}|${n}`, (counts.get(`${p.universityId}|${n}`) ?? 0) + 1);
  }
  let identifying = 0;
  let shared = 0;
  let missing = 0;
  for (const p of programs) {
    const n = normalizeProgramUrl(p.officialProgramUrl);
    if (!n) {
      missing += 1;
    } else if ((counts.get(`${p.universityId}|${n}`) ?? 0) > 1) {
      shared += 1;
    } else {
      identifying += 1;
    }
  }
  return { identifying, shared, missing };
}
