import { classifySubjects } from "./subject-taxonomy";
import { normalizeProgramName } from "./normalize";
import { resolveIdentity, type LocalUniversity } from "@/lib/acquisition/identity";
import { sourceAuthority, domainOf } from "@/lib/acquisition/source-authority";

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

/** Re-exported so callers only need to import from this module. LocalUniversity (from
 * lib/acquisition/identity) is the platform-wide shape for "a university candidate an
 * identity match can be resolved against" — id, name, country, plus optional aliases and
 * external ids sourced from canonical_entities/entity_aliases/entity_external_ids. This
 * pipeline no longer keeps its own separate university-matching data shape.
 *
 * Extended (not forked) with an optional `websiteUrl` — universities.website_url, when
 * populated — purely so this module can establish an `officialDomains` hint for
 * sourceAuthority() itself; it plays no role in identity resolution. */
export type UniversityLookupRow = LocalUniversity & { websiteUrl?: string | null };

/**
 * University identity resolution for a research record — a thin adapter over
 * lib/acquisition/identity.ts's resolveIdentity(), which is the one entity-matching
 * implementation this platform has (see docs/research-handoff-university-programs.md's
 * "Entity linking" section for why a second, program-specific matcher was retired in favor
 * of this). Strict and alias-aware: exact name+country, then registered aliases
 * (entity_aliases, via LocalUniversity.aliases), then external ids — never fuzzy, and a
 * multi-candidate match is `unresolved`, not a guess.
 */
export function resolveUniversity(record: ResearchProgramRecord, universities: readonly UniversityLookupRow[]): { universityId: string | null; reason: string | null } {
  const resolution = resolveIdentity(
    {
      displayName: record.university_name,
      names: [record.university_name],
      countryName: record.university_country || null,
    },
    universities
  );
  if (resolution.status === "matched") return { universityId: resolution.match.universityId, reason: null };
  return { universityId: null, reason: resolution.reason };
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

/** The URL-based half of `existingKeys` — same official_program_url at the same university is
 * the same real-world programme even when a later research pass or a catalogue re-scrape
 * captured a different display name for it (e.g. "Computer Science and Engineering" vs. a
 * catalogue's current link text "Computer Science & Engineering - English" — found live, same
 * TU Delft URL, name-only dedup would have inserted both). Exported so callers building
 * `existingKeys` can construct this half consistently with how decideIngestion checks it. */
export function programUrlKey(universityId: string, officialProgramUrl: string): string {
  return `url:${universityId}|${officialProgramUrl}`;
}

/** Pure decision function — no I/O, fully unit-testable. `existingKeys` is the set of
 * `${university_id}|${normalized_program_name}|${degree_level ?? ""}` combinations already
 * present (live table rows + anything already accepted earlier in this same batch), so a
 * batch is idempotent against both re-runs and internal duplicates. Callers may additionally
 * populate `programUrlKey()` entries in the same set — decideIngestion checks both a record's
 * name-based key and its URL-based key, so a same-URL/different-name duplicate is caught even
 * though a name/degree-level match alone would have missed it. */
export function decideIngestion(record: ResearchProgramRecord, universities: readonly UniversityLookupRow[], existingKeys: ReadonlySet<string>): IngestDecision {
  if (!record.university_name?.trim() || !record.program_name?.trim()) {
    return { outcome: "rejected", detail: "Missing university_name or program_name.", universityId: null, programRow: null };
  }

  const { universityId, reason } = resolveUniversity(record, universities);
  if (!universityId) {
    return { outcome: "unresolved_university", detail: reason, universityId: null, programRow: null };
  }

  if (!record.official_program_url?.trim() || !record.source_url?.trim()) {
    return { outcome: "insufficient_evidence", detail: "Missing official_program_url or source_url.", universityId, programRow: null };
  }

  // Source authority is resolved per fact class (lib/acquisition/source-authority.ts),
  // not asserted from the record's own claimed source_type — a record cannot self-certify
  // as official_primary; the URL's domain has to actually earn that for the "programs"
  // fact class. looksOfficial() alone only recognizes .edu/.ac./.gov-shaped domains, which
  // excludes plenty of genuine European institutions (ethz.ch, tudelft.nl, tum.de) — so a
  // matched university's own stored website_url is offered as an additional official
  // domain, the same "caller established it from an authoritative identity source" contract
  // sourceAuthority()'s officialDomains parameter documents.
  const matchedUniversity = universities.find((u) => u.id === universityId);
  const officialDomains = new Set(matchedUniversity?.websiteUrl ? [domainOf(matchedUniversity.websiteUrl)] : []);
  const authority = sourceAuthority("programs", record.source_url, officialDomains);
  if (!authority) {
    return {
      outcome: "malformed_source",
      detail: `source_url "${record.source_url}" does not resolve to an accepted authority for program facts (must be the institution's own domain).`,
      universityId,
      programRow: null,
    };
  }

  const normalizedName = normalizeProgramName(record.program_name);
  const dedupKey = `${universityId}|${normalizedName}|${record.degree_level ?? ""}`;
  if (existingKeys.has(dedupKey)) {
    return { outcome: "duplicate", detail: "Same university + program identity + degree level already exists.", universityId, programRow: null };
  }
  if (existingKeys.has(programUrlKey(universityId, record.official_program_url))) {
    return { outcome: "duplicate", detail: "Same official_program_url already exists at this university under a different name.", universityId, programRow: null };
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
      source_type: authority.sourceType,
      verification_state: "verified_current",
      notes: `Research handoff, program_id ${record.research_program_id}, researched_at ${record.researched_at}.`,
      data_confidence: "high",
    },
  };
}
