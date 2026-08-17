import { classifySubjects } from "./subject-taxonomy";
import { normalizeCountry, normalizeName, normalizeProgramName, domainOf } from "./normalize";

/** One record from the research handoff contract — see
 * docs/research-handoff-university-programs.md for the full field-by-field spec. */
export interface ResearchProgramRecord {
  research_program_id: string;
  university_name: string;
  university_country: string;
  university_official_domain?: string | null;
  program_name: string;
  degree_level?: string | null;
  degree_type?: string | null;
  faculty_or_school?: string | null;
  subject_hint?: string | null;
  official_program_url: string;
  admissions_url?: string | null;
  source_url: string;
  source_type: string;
  verification_status: string;
  language_of_instruction?: string | null;
  duration?: string | null;
  campus?: string | null;
  delivery_mode?: string | null;
  international_eligible?: boolean | null;
  researched_at: string;
  researcher_notes?: string | null;
  evidence_excerpt?: string | null;
}

export interface UniversityLookupRow {
  id: string;
  name: string;
  country: string;
  website_url: string | null;
}

/** Unambiguous corpus-name -> live universities.id overrides for well-known abbreviations
 * the exact match can't bridge on its own. Every entry is independently hand-confirmed as
 * the single correct institution — see docs/research-handoff-university-programs.md's
 * "Entity linking" section. Keyed by (normalized name, normalized country). Extend by hand
 * only, never by lowering the match threshold. */
export const MANUAL_ALIAS_OVERRIDES: Record<string, string> = {
  "epfl|switzerland": "846029e2-39bd-40f1-8c00-bc263edbaaca",
  "humboldt university of berlin|germany": "84925a17-9a73-43a0-982c-2a9b846a545d",
  "new york university|united states": "86e9bca7-e10e-45ca-8f3c-3782ca3dba83",
  "university of bologna|italy": "3acf2e36-46ab-4bbb-a379-8323789f5f8f",
  "university of california, berkeley|united states": "0c1c454c-52c2-44af-8892-c024b9dfdb0b",
  "university of edinburgh|united kingdom": "e2feb81c-1bda-4889-8aa9-37783b720901",
  "university of mannheim|germany": "3c48effe-f883-4907-bb0b-5911eb39e021",
};

/** Strict, alias-aware, never fuzzy — see docs/research-handoff-university-programs.md.
 * Returns null (not a guess) when identity can't be confidently established. */
export function resolveUniversity(record: ResearchProgramRecord, universities: readonly UniversityLookupRow[]): string | null {
  const nameKey = normalizeName(record.university_name);
  const countryKey = normalizeCountry(record.university_country);

  const nameMatches = universities.filter((u) => normalizeName(u.name) === nameKey);
  if (nameMatches.length === 1) return nameMatches[0].id;
  if (nameMatches.length > 1) {
    const countryMatches = nameMatches.filter((u) => normalizeCountry(u.country) === countryKey);
    if (countryMatches.length === 1) return countryMatches[0].id;
  }

  const inputDomain = domainOf(record.university_official_domain ? `https://${record.university_official_domain}` : null);
  if (inputDomain) {
    const domainMatches = universities.filter((u) => domainOf(u.website_url) === inputDomain);
    if (domainMatches.length === 1) return domainMatches[0].id;
  }

  return MANUAL_ALIAS_OVERRIDES[`${nameKey}|${countryKey}`] ?? null;
}

/** A researcher-stated verification_status counts as page-confirmed only when it says so
 * explicitly. Mirrors the Drive-corpus vocabulary ("Verified - official ... page" vs
 * "... page retrieval blocked") without hardcoding to that exact phrasing, so a future
 * research process can use its own wording as long as it follows this shape. */
export function looksPageConfirmed(verificationStatus: string): boolean {
  const s = verificationStatus.toLowerCase();
  if (!s.includes("verified")) return false;
  const blockedMarkers = ["retrieval blocked", "page unfetched", "not fetched", "search result only", "unfetched"];
  return !blockedMarkers.some((marker) => s.includes(marker));
}

export type IngestOutcome = "accepted" | "duplicate" | "unresolved_university" | "insufficient_evidence" | "malformed_source" | "conflicting" | "rejected";

export interface AcceptedProgramRow {
  university_id: string;
  name: string;
  normalized_name: string;
  degree_level: string | null;
  field: string | null;
  subject_taxonomy: string;
  secondary_subject_tags: string[];
  language_of_instruction: string | null;
  campus: string | null;
  delivery_mode: string | null;
  international_eligible: boolean | null;
  degree_type: string | null;
  faculty_or_school: string | null;
  official_program_url: string;
  admissions_url: string | null;
  source_url: string;
  source_type: string;
  verification_state: "verified_current";
  notes: string;
  data_confidence: "high";
}

export interface IngestDecision {
  outcome: IngestOutcome;
  detail: string | null;
  universityId: string | null;
  programRow: AcceptedProgramRow | null;
}

const VALID_SOURCE_TYPES = new Set(["official_primary", "official_secondary", "third_party_structured", "unverified_secondary"]);

/** Pure decision function — no I/O, fully unit-testable. `existingKeys` is the set of
 * `${university_id}|${normalized_program_name}|${degree_level ?? ""}` combinations already
 * present (live table rows + anything already accepted earlier in this same batch), so a
 * batch is idempotent against both re-runs and internal duplicates. */
export function decideIngestion(record: ResearchProgramRecord, universities: readonly UniversityLookupRow[], existingKeys: ReadonlySet<string>): IngestDecision {
  if (!record.university_name?.trim() || !record.program_name?.trim()) {
    return { outcome: "rejected", detail: "Missing university_name or program_name.", universityId: null, programRow: null };
  }

  const universityId = resolveUniversity(record, universities);
  if (!universityId) {
    return {
      outcome: "unresolved_university",
      detail: `No confident match for "${record.university_name}" / ${record.university_country}.`,
      universityId: null,
      programRow: null,
    };
  }

  if (!record.official_program_url?.trim() || !record.source_url?.trim()) {
    return { outcome: "insufficient_evidence", detail: "Missing official_program_url or source_url.", universityId, programRow: null };
  }

  if (!VALID_SOURCE_TYPES.has(record.source_type)) {
    return { outcome: "malformed_source", detail: `Unrecognized source_type "${record.source_type}".`, universityId, programRow: null };
  }

  const normalizedName = normalizeProgramName(record.program_name);
  const dedupKey = `${universityId}|${normalizedName}|${record.degree_level ?? ""}`;
  if (existingKeys.has(dedupKey)) {
    return { outcome: "duplicate", detail: "Same university + program identity + degree level already exists.", universityId, programRow: null };
  }

  if (!looksPageConfirmed(record.verification_status)) {
    return {
      outcome: "insufficient_evidence",
      detail: `verification_status "${record.verification_status}" reads as a search result, not a confirmed fetched page.`,
      universityId,
      programRow: null,
    };
  }

  const { primary, secondary } = classifySubjects(record.program_name);
  const delivery = record.delivery_mode;
  const validDelivery = delivery === "online" || delivery === "in_person" || delivery === "hybrid" ? delivery : null;

  return {
    outcome: "accepted",
    detail: null,
    universityId,
    programRow: {
      university_id: universityId,
      name: record.program_name,
      normalized_name: normalizedName,
      degree_level: record.degree_level ?? null,
      field: primary === "other" ? null : primary,
      subject_taxonomy: primary,
      secondary_subject_tags: secondary,
      language_of_instruction: record.language_of_instruction ?? null,
      campus: record.campus ?? null,
      delivery_mode: validDelivery,
      international_eligible: record.international_eligible ?? null,
      degree_type: record.degree_type ?? null,
      faculty_or_school: record.faculty_or_school ?? null,
      official_program_url: record.official_program_url,
      admissions_url: record.admissions_url ?? null,
      source_url: record.source_url,
      source_type: record.source_type,
      verification_state: "verified_current",
      notes: `Research handoff, program_id ${record.research_program_id}, researched_at ${record.researched_at}.`,
      data_confidence: "high",
    },
  };
}
