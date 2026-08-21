/**
 * Classification of duplicate CANDIDATES in the programme research corpus
 * (`data/research/university-programs/*.jsonl`).
 *
 * Written after the incident this exists to prevent: a dedup key of
 * `university + normalized_name + degree_level` rejected 53 genuine METU programmes to catch
 * one real duplicate, because it treated a shared catalogue URL and a shared name as evidence
 * of sameness when neither is. The lesson encoded here is that **collapsing is destructive and
 * unrecoverable, while leaving two rows is visible and both-rows-true** — so every rule below
 * is biased towards "these are different programmes" and only the total absence of any
 * distinguishing fact yields `genuine_duplicate`.
 *
 * Three things that look like duplicates and are not:
 *
 *   1. A SHARED CATALOGUE URL. Manchester publishes one course-search page for 294 distinct
 *      programmes; the Turkish records all point at the YÖK Atlas root. Two records sharing a
 *      URL is the normal case at such a university and says nothing at all about identity.
 *      Only a shared URL *plus* a shared name is even a candidate.
 *
 *   2. A LEGITIMATE SPLIT. The same programme name can be two separately-admitted programmes
 *      differing by campus, language of instruction, degree type (Durham's "Chemistry" as both
 *      BSc and MChem), degree level, or faculty. Collapsing these destroys a distinction a
 *      student actually chooses between.
 *
 *   3. A RE-RESEARCH. The same programme researched again on a later date is not a duplicate.
 *      It is a newer observation of one thing, and the right response is supersession
 *      (keep the later record), never deletion of either.
 */

import { normalizeProgramName } from "@/lib/programs/normalize";

export interface CorpusProgramRecord {
  research_program_id?: string | null;
  university_name?: string | null;
  university_country?: string | null;
  program_name?: string | null;
  degree_level?: string | null;
  degree_type?: string | null;
  faculty_or_school?: string | null;
  language_of_instruction?: string | null;
  campus?: string | null;
  official_program_url?: string | null;
  researched_at?: string | null;
  /** Set by the loader so every finding can name the file and line it came from. */
  __file?: string;
  __line?: number;
}

export type DuplicateClass =
  /** Nothing distinguishes the records. Collapsing is defensible — after human review. */
  | "genuine_duplicate"
  /** The records differ on a fact that makes them separately-admitted programmes. */
  | "legitimate_split"
  /** Same programme, observed on different dates. Supersede the earlier; never collapse. */
  | "re_research"
  /** Records share a `research_program_id` but describe visibly different programmes — an
   * ID-minting defect, not a duplicate. Fixing means re-minting one ID, not deleting a row. */
  | "id_collision_distinct_programmes";

/**
 * The fields whose disagreement makes two same-named programmes genuinely different.
 *
 * `faculty_or_school` is included on the evidence of Göttingen's 21 Master of Education
 * records, which share one administrative hub page by the university's own design.
 *
 * `official_program_url` is included as the LAST-RESORT discriminator, and it earns its place:
 * Padua publishes "MEDICINA E CHIRURGIA" at both `.../medicina-e-chirurgia` and
 * `.../medicina-e-chirurgia-treviso` — two campuses — but only the Treviso record fills in
 * `campus`. Because an empty value on one record is (correctly) not counted as a difference,
 * every structured discriminator agreed and the pair read as a genuine duplicate. Two distinct
 * per-programme pages are two programmes; the URLs were the evidence the other fields lacked.
 */
export const DISCRIMINATOR_FIELDS = ["degree_level", "degree_type", "language_of_instruction", "campus", "faculty_or_school", "official_program_url"] as const;
export type DiscriminatorField = (typeof DISCRIMINATOR_FIELDS)[number];

export interface DuplicateGroup {
  /** What made these records a candidate in the first place. */
  signal: "shared_research_program_id" | "shared_url_and_name" | "shared_url_and_annotation_stripped_name";
  key: string;
  records: CorpusProgramRecord[];
  classification: DuplicateClass;
  /** For `legitimate_split`: which fields actually differ. Empty otherwise. */
  discriminators: DiscriminatorField[];
  /** For `re_research`: the distinct `researched_at` values, ascending. */
  researchDates: string[];
  /** True when the records are identical in EVERY field (ignoring the loader's file/line
   * bookkeeping) — the same line written into two files. This is the only shape where
   * collapsing provably loses nothing, so it is tracked separately from the judgement that a
   * group has no *discriminating* difference. */
  allFieldsIdentical: boolean;
  /** One line a human can read without opening the files. */
  explanation: string;
}

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** Two records describe the same *subject at the same institution* — the precondition for any
 * duplicate question. Deliberately does NOT consider level/type/campus: those are the
 * discriminators, and folding them in here would make every split look like a different
 * programme and hide the real duplicates. */
function sameSubjectAtSameUniversity(a: CorpusProgramRecord, b: CorpusProgramRecord): boolean {
  // Compared on the annotation-stripped name: "Accountancy & Finance [BAcc]" and "Accountancy
  // & Finance" are the same subject with the degree type annotated into the name in one batch
  // and lifted into `degree_type` in the other. Treating them as different subjects would file
  // 68 real re-research pairs as identifier defects.
  return norm(a.university_name) === norm(b.university_name) && stripTrailingAnnotation(a.program_name) === stripTrailingAnnotation(b.program_name);
}

/** Which discriminator fields carry DIFFERENT non-empty values across the group. A field that
 * is empty on one record and set on another is NOT a difference — that is missing data, and
 * treating absence as a distinguishing fact would invent splits that do not exist. */
export function differingDiscriminators(records: readonly CorpusProgramRecord[]): DiscriminatorField[] {
  const out: DiscriminatorField[] = [];
  for (const field of DISCRIMINATOR_FIELDS) {
    const values = new Set(records.map((r) => norm(r[field])).filter((v) => v !== ""));
    if (values.size > 1) out.push(field);
  }
  return out;
}

/** Distinct `researched_at` values in the group, ascending. */
export function researchDates(records: readonly CorpusProgramRecord[]): string[] {
  return [...new Set(records.map((r) => (r.researched_at ?? "").trim()).filter(Boolean))].sort();
}

/** True when every record in the group carries identical values in every field. Keys are
 * sorted before comparison so a different key ORDER in the source JSON is not mistaken for
 * different content; `__file`/`__line` are the loader's own bookkeeping and are excluded. */
export function allFieldsIdentical(records: readonly CorpusProgramRecord[]): boolean {
  const canonical = records.map((r) => {
    const entries = Object.entries(r)
      .filter(([k]) => k !== "__file" && k !== "__line")
      .sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  });
  return new Set(canonical).size === 1;
}

/**
 * Classifies one candidate group. Order of tests is the whole design:
 *
 *   1. Different programmes entirely (only reachable via the ID signal) — an ID defect.
 *   2. Any discriminator differs — a legitimate split. Tested BEFORE dates, because a
 *      campus/language split researched on two dates is still a split, not a re-research.
 *   3. Dates differ, nothing else — a re-research.
 *   4. Nothing differs at all — a genuine duplicate.
 */
export function classifyDuplicateGroup(signal: DuplicateGroup["signal"], key: string, records: readonly CorpusProgramRecord[]): DuplicateGroup {
  const discriminators = differingDiscriminators(records);
  const dates = researchDates(records);
  const identical = allFieldsIdentical(records);
  const first = records[0];
  const allSameSubject = records.every((r) => sameSubjectAtSameUniversity(first, r));

  // Only the identifier signal can raise a group of genuinely different programmes; the URL
  // signals require the name to match by construction. Gated so this class can never be
  // reported for a group that was never keyed on an identifier.
  if (!allSameSubject && signal === "shared_research_program_id") {
    const names = [...new Set(records.map((r) => `${r.university_name} :: ${r.program_name}`))];
    return {
      signal,
      key,
      records: [...records],
      classification: "id_collision_distinct_programmes",
      discriminators,
      researchDates: dates,
      allFieldsIdentical: identical,
      explanation: `Same research_program_id on ${records.length} records describing different programmes (${names.join(" | ")}). An ID-minting defect: re-mint one ID, do not merge or delete.`,
    };
  }

  if (discriminators.length > 0) {
    return {
      signal,
      key,
      records: [...records],
      classification: "legitimate_split",
      discriminators,
      researchDates: dates,
      allFieldsIdentical: identical,
      explanation: `${records.length} separately-admitted programmes sharing a name, distinguished by ${discriminators.join(", ")}. Collapsing would destroy a distinction a student chooses between.`,
    };
  }

  if (dates.length > 1) {
    return {
      signal,
      key,
      records: [...records],
      classification: "re_research",
      discriminators,
      researchDates: dates,
      allFieldsIdentical: identical,
      explanation: `The same programme researched on ${dates.length} dates (${dates.join(", ")}). Supersede the earlier observation with the later one; this is not a duplicate to collapse.`,
    };
  }

  return {
    signal,
    key,
    records: [...records],
    classification: "genuine_duplicate",
    discriminators,
    researchDates: dates,
    allFieldsIdentical: identical,
    explanation: identical
      ? `${records.length} byte-identical records — the same line written into ${records.length} files. Collapsing provably loses nothing.`
      : `${records.length} records with no distinguishing fact on any of ${DISCRIMINATOR_FIELDS.join(", ")}, and one research date, but they DIFFER in other fields (notes, evidence, source). Needs a human to pick which to keep.`,
  };
}

/** Groups by shared `research_program_id`. An ID is supposed to be unique per record, so any
 * repeat is a defect of some kind — the classification says which kind. */
export function groupByResearchId(records: readonly CorpusProgramRecord[]): DuplicateGroup[] {
  const byId = new Map<string, CorpusProgramRecord[]>();
  for (const r of records) {
    const id = (r.research_program_id ?? "").trim();
    if (!id) continue;
    byId.set(id, [...(byId.get(id) ?? []), r]);
  }
  return [...byId.entries()].filter(([, v]) => v.length > 1).map(([id, v]) => classifyDuplicateGroup("shared_research_program_id", id, v));
}

/**
 * Groups by shared URL **and** shared normalized name at the same university.
 *
 * The name conjunct is what keeps this from re-running the METU incident: at a university
 * publishing one catalogue page for its whole list, URL alone would group hundreds of
 * unrelated programmes together and every one of them would look like a duplicate of the
 * first. Requiring the name to match too means a shared catalogue page contributes candidates
 * only where the same programme genuinely appears twice.
 */
export function groupByUrlAndName(records: readonly CorpusProgramRecord[]): DuplicateGroup[] {
  const byKey = new Map<string, CorpusProgramRecord[]>();
  for (const r of records) {
    const url = (r.official_program_url ?? "").trim();
    const name = normalizeProgramName(r.program_name);
    if (!url || !name) continue;
    const key = `${norm(r.university_name)}|${url}|${name}`;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  return [...byKey.entries()].filter(([, v]) => v.length > 1).map(([key, v]) => classifyDuplicateGroup("shared_url_and_name", key, v));
}

/**
 * Strips ONE trailing square-bracketed annotation from a programme name.
 *
 * Square brackets only, and only at the end. Glasgow's programmes were captured twice a day
 * apart, once as "Accountancy & Finance [BAcc]" and once as "Accountancy & Finance" — the
 * degree type annotated into the name in the older batch and moved into `degree_type` in the
 * newer one. 69 such pairs share a URL and are the same programme, but exact name matching
 * misses every one.
 *
 * PARENTHESES ARE DELIBERATELY NOT STRIPPED. Bonn publishes "Economics (Major)" and
 * "Economics (Minor)" as different things, and Ankara's YÖK records use parentheses for
 * genuinely distinguishing suffixes such as "(KKTC Uyruklu)". Stripping those would merge
 * programmes that differ.
 */
export function stripTrailingAnnotation(name: string | null | undefined): string {
  return normalizeProgramName((name ?? "").replace(/\s*\[[^\]]*\]\s*$/, ""));
}

/** Same-URL candidates whose names match only after a trailing `[...]` annotation is removed.
 * Raised as its own signal so the report can show how much it contributes and a reviewer can
 * judge that looser rule separately from exact matching. */
export function groupByUrlAndAnnotationStrippedName(records: readonly CorpusProgramRecord[]): DuplicateGroup[] {
  const byKey = new Map<string, CorpusProgramRecord[]>();
  for (const r of records) {
    const url = (r.official_program_url ?? "").trim();
    const stripped = stripTrailingAnnotation(r.program_name);
    if (!url || !stripped) continue;
    byKey.set(`${norm(r.university_name)}|${url}|${stripped}`, [...(byKey.get(`${norm(r.university_name)}|${url}|${stripped}`) ?? []), r]);
  }
  return [...byKey.entries()]
    .filter(([, v]) => v.length > 1)
    // Anything already caught by exact name matching is not this signal's contribution.
    .filter(([, v]) => new Set(v.map((r) => normalizeProgramName(r.program_name))).size > 1)
    .map(([key, v]) => classifyDuplicateGroup("shared_url_and_annotation_stripped_name", key, v));
}
