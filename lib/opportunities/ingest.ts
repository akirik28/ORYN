import { sourceAuthority, domainOf } from "@/lib/acquisition/source-authority";
import { judgeRetrievalEvidence, looksPageConfirmed } from "@/lib/acquisition/retrieval-method";
import { isDuplicateOpportunity, normalizeTitle, type DedupCandidate } from "./dedup";
import { inspectDescription, type DescriptionQualityFinding } from "./description-quality";
import { inspectCycleLabel, type CycleLabelFinding } from "./cycle-label-quality";

/** Re-exported for existing consumers/tests — the single implementation now lives in
 * lib/acquisition/retrieval-method.ts, shared with the programs pipeline. */
export { looksPageConfirmed };

/** One record from the research handoff contract — see
 * docs/research-handoff-opportunities.md for the full field-by-field spec. */
export interface ResearchOpportunityRecord {
  research_opportunity_id: string;
  title: string;
  organization: string;
  category: string;
  official_url: string;
  application_url?: string | null;
  description?: string | null;
  country?: string | null;
  eligible_countries?: readonly string[];
  remote_allowed?: boolean | null;
  minimum_age?: number | null;
  maximum_age?: number | null;
  eligible_grades?: readonly string[];
  fields?: readonly string[];
  cost?: number | null;
  financial_aid_available?: boolean | null;
  deadline?: string | null;
  application_open_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location_mode?: string | null;
  citizenship_restrictions?: string | null;
  residency_restrictions?: string | null;
  application_requirements?: readonly string[];
  /** Free text citing the actual selectivity mechanism (acceptance rate, nomination, exam).
   * Required whenever selectivity_tier is asserted above open_enrollment — see
   * docs/research-handoff-opportunities.md. */
  selectivity_evidence?: string | null;
  /** Asserted directly by the researcher, backed by selectivity_evidence — never derived by
   * pattern-matching organizer prestige or free text, per this product's "never infer
   * eligibility/selectivity" rule. Defaults to "unknown" when absent. */
  selectivity_tier?: string | null;
  current_cycle_label?: string | null;
  cycle_status?: string | null;
  source_url: string;
  source_type: string;
  verification_status: string;
  /** How the source page's content was actually obtained — a closed enum
   * (lib/acquisition/retrieval-method.ts: live_fetch | browser_render | archived_capture |
   * search_summary). The evidence gate routes on this declared fact when present; records
   * without it (the pre-existing corpus) fall back to prose-matching verification_status.
   * A present-but-unrecognized value fails closed. */
  retrieval_method?: string | null;
  researched_at: string;
}

const VALID_CATEGORIES = new Set([
  "competition",
  "research",
  "internship",
  "summer_program",
  "fellowship",
  "scholarship",
  "volunteering",
  "entrepreneurship",
  "hackathon",
  "academic_program",
  "online_program",
  "conference",
  "student_program",
]);

const VALID_CYCLE_STATUS = new Set(["open", "upcoming", "closed", "date_not_announced", "historical", "discontinued", "unverified"]);
const VALID_SELECTIVITY_TIER = new Set(["extremely_selective", "highly_selective", "selective", "competitive_award", "open_enrollment", "unknown"]);
const VALID_LOCATION_MODE = new Set(["online", "in_person", "hybrid"]);
const SELECTIVITY_REQUIRING_EVIDENCE = new Set(["extremely_selective", "highly_selective", "selective", "competitive_award"]);

export type IngestOutcome = "accepted" | "duplicate" | "insufficient_evidence" | "malformed_source" | "malformed_field" | "rejected" | "description_defect";

export interface AcceptedOpportunityRow {
  title: string;
  normalized_title: string;
  organization: string;
  category: string;
  official_url: string;
  application_url: string | null;
  description: string | null;
  country: string | null;
  eligible_countries: string[];
  remote_allowed: boolean | null;
  minimum_age: number | null;
  maximum_age: number | null;
  eligible_grades: string[];
  fields: string[];
  cost: number | null;
  financial_aid_available: boolean | null;
  deadline: string | null;
  application_open_date: string | null;
  start_date: string | null;
  end_date: string | null;
  location_mode: string | null;
  citizenship_restrictions: string | null;
  residency_restrictions: string | null;
  application_requirements: string[];
  selectivity_tier: string;
  cycle_status: string;
  current_cycle_label: string | null;
  source: string;
  source_url: string;
  source_confidence: "high" | "medium";
  status: "active";
  verification_state: "verified_current";
  verified_at: string;
}

/** `existingId` set only when this decision's dedup match was against a specific known row
 * (e.g. an existing unverified placeholder) — lets a caller upgrade that row in place via
 * UPDATE instead of treating it as a skip. */
export interface IngestDecision {
  outcome: IngestOutcome;
  detail: string | null;
  row: AcceptedOpportunityRow | null;
  matchedExistingId: string | null;
  /** Non-blocking description-quality findings (lib/opportunities/description-quality.ts).
   * Only ever populated on `outcome: "accepted"` — an advisory finding never changes the
   * outcome, by design (see that module's fail-loud-not-closed rule). A caller that wants
   * to surface these for human review reads this; nothing currently requires reading it. */
  warnings: DescriptionQualityFinding[];
  /** Non-blocking copy findings for `current_cycle_label` (lib/opportunities/cycle-label-quality.ts).
   * Kept separate from `warnings` rather than merged into it: those two modules have
   * genuinely different severity ladders — a description finding can be `reject`, a label
   * finding never can — and a single array would imply a uniformity that does not exist.
   * Like `warnings`, only ever populated on `outcome: "accepted"`. */
  labelWarnings: CycleLabelFinding[];
}

/** Pure decision function — no I/O, fully unit-testable, mirrors lib/programs/ingest.ts's
 * decideIngestion() shape. `existing` is every live opportunity (id + dedup fields) so a
 * batch is idempotent against re-runs; anything already accepted earlier in the same batch
 * must be folded into `existing` by the caller between records, same contract as the
 * programs pipeline's existingKeys. */
export function decideIngestion(
  record: ResearchOpportunityRecord,
  existing: readonly (DedupCandidate & { id: string })[]
): IngestDecision {
  if (!record.title?.trim() || !record.organization?.trim() || !record.official_url?.trim()) {
    return { outcome: "rejected", detail: "Missing title, organization, or official_url.", row: null, matchedExistingId: null, warnings: [], labelWarnings: [] };
  }

  if (!VALID_CATEGORIES.has(record.category)) {
    return { outcome: "malformed_field", detail: `category "${record.category}" is not a recognized opportunity_category value.`, row: null, matchedExistingId: null, warnings: [], labelWarnings: [] };
  }

  if (!record.source_url?.trim()) {
    return { outcome: "insufficient_evidence", detail: "Missing source_url.", row: null, matchedExistingId: null, warnings: [], labelWarnings: [] };
  }

  // Self-referential officialDomains hint: unlike universities, arbitrary organizers
  // (foundations, non-profits) have no registry of known-official domains to check
  // against. The best available signal is that the researcher's own claimed official_url
  // and their source_url agree on domain, combined with verification_status attesting the
  // page was actually read and confirmed official — same discipline as a human fact-check.
  // EXCLUDED_DOMAINS (Wikipedia, content farms, competitor sites) still refuses regardless.
  const officialDomain = domainOf(record.official_url);
  const authority = sourceAuthority("opportunities", record.source_url, new Set(officialDomain ? [officialDomain] : []));
  if (!authority) {
    return {
      outcome: "malformed_source",
      detail: `source_url "${record.source_url}" does not resolve to an accepted authority (must match the organizer's own official_url domain, or a recognized academic/government domain).`,
      row: null,
      matchedExistingId: null,
      warnings: [],
      labelWarnings: [],
    };
  }

  // Routed on the structured retrieval_method when the record declares one; legacy records
  // (no field) are prose-matched exactly as before — see lib/acquisition/retrieval-method.ts
  // for the full policy and the backward-compatibility rule.
  const retrieval = judgeRetrievalEvidence(record.retrieval_method, record.verification_status);
  if (!retrieval.ok) {
    return {
      outcome: "insufficient_evidence",
      detail: retrieval.detail,
      row: null,
      matchedExistingId: null,
      warnings: [],
      labelWarnings: [],
    };
  }

  const selectivityTier = record.selectivity_tier && VALID_SELECTIVITY_TIER.has(record.selectivity_tier) ? record.selectivity_tier : "unknown";
  if (SELECTIVITY_REQUIRING_EVIDENCE.has(selectivityTier) && !record.selectivity_evidence?.trim()) {
    return {
      outcome: "malformed_field",
      detail: `selectivity_tier "${selectivityTier}" requires selectivity_evidence citing the actual mechanism (acceptance rate, nomination, exam).`,
      row: null,
      matchedExistingId: null,
      warnings: [],
      labelWarnings: [],
    };
  }

  const cycleStatus = record.cycle_status && VALID_CYCLE_STATUS.has(record.cycle_status) ? record.cycle_status : "unverified";
  const locationMode = record.location_mode && VALID_LOCATION_MODE.has(record.location_mode) ? record.location_mode : null;

  const candidate: DedupCandidate = { title: record.title, organization: record.organization, officialUrl: record.official_url };
  const dup = existing.find((e) => isDuplicateOpportunity(candidate, e));
  if (dup) {
    return { outcome: "duplicate", detail: `Matches existing opportunity "${dup.title}".`, row: null, matchedExistingId: dup.id, warnings: [], labelWarnings: [] };
  }

  // Description-quality gate (lib/opportunities/description-quality.ts) — see that module's
  // header for why this exists (85/271 live active rows found defective, 2026-08-22) and why
  // it fails loud, not closed: only a signature with no legitimate form ever blocks ingestion.
  const descriptionFindings = inspectDescription(record.title, record.description);
  const blockingFinding = descriptionFindings.find((f) => f.severity === "reject");
  if (blockingFinding) {
    return { outcome: "description_defect", detail: blockingFinding.detail, row: null, matchedExistingId: null, warnings: [], labelWarnings: [] };
  }
  const descriptionWarnings = descriptionFindings.filter((f) => f.severity === "flag");

  // Cycle-label copy gate (lib/opportunities/cycle-label-quality.ts). Purely advisory and
  // deliberately incapable of anything else -- it cannot reject the record and cannot drop
  // the label, because the live examples are real facts wrapped in internal framing and a
  // regex is not entitled to decide which half of a sentence survives. See that module's
  // header. Its findings do not enter `detail`, which reports on the outcome; a label
  // finding never changes the outcome, so putting it there would misreport why a record
  // was accepted.
  const labelWarnings = inspectCycleLabel(record.current_cycle_label);

  return {
    outcome: "accepted",
    detail: descriptionWarnings.length > 0 ? `Accepted with ${descriptionWarnings.length} description-quality flag(s): ${descriptionWarnings.map((f) => f.defect).join(", ")}.` : null,
    matchedExistingId: null,
    warnings: descriptionWarnings,
    labelWarnings,
    row: {
      title: record.title,
      normalized_title: normalizeTitle(record.title),
      organization: record.organization,
      category: record.category,
      official_url: record.official_url,
      application_url: record.application_url ?? record.official_url,
      description: record.description ?? null,
      country: record.country ?? null,
      eligible_countries: [...(record.eligible_countries ?? [])],
      remote_allowed: record.remote_allowed ?? null,
      minimum_age: record.minimum_age ?? null,
      maximum_age: record.maximum_age ?? null,
      eligible_grades: [...(record.eligible_grades ?? [])],
      fields: [...(record.fields ?? [])],
      cost: record.cost ?? null,
      financial_aid_available: record.financial_aid_available ?? null,
      deadline: record.deadline ?? null,
      application_open_date: record.application_open_date ?? null,
      start_date: record.start_date ?? null,
      end_date: record.end_date ?? null,
      location_mode: locationMode,
      citizenship_restrictions: record.citizenship_restrictions ?? null,
      residency_restrictions: record.residency_restrictions ?? null,
      application_requirements: [...(record.application_requirements ?? [])],
      selectivity_tier: selectivityTier,
      cycle_status: cycleStatus,
      current_cycle_label: record.current_cycle_label ?? null,
      source: authority.sourceType,
      source_url: record.source_url,
      source_confidence: authority.tier === "HIGH" ? "high" : "medium",
      status: "active",
      verification_state: "verified_current",
      verified_at: record.researched_at,
    },
  };
}
