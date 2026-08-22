#!/usr/bin/env node
/**
 * Reusable validator for research-lane JSONL batches — RES-V1's standing tool, per its
 * brief in docs/ORYN-ORG-BRIEFS.md: "Build yourself a reusable validation script early...
 * a check that caught something once runs on every batch thereafter (ratchet)."
 *
 * Four passes, all read-only (Supabase reads only — this script must never grow a --fix
 * or --apply flag; per docs/ORYN-ORG-STRUCTURE.md a verifier reports defects, it never
 * edits researcher files or writes to the live DB):
 *
 *   1. CONTRACT — every record parses; every required field is present; one consistent
 *      keyset across the batch (a drifted keyset usually means two people edited the
 *      contract independently mid-batch).
 *   2. ID DISCIPLINE — unique record IDs and unique foreign-key references within the
 *      batch; the batch's own IDs do not already exist anywhere else in the research
 *      corpus (a real collision — the exact ID string reused — not merely the same
 *      prefix, which legitimate revision/re-pass records can share by design; see the
 *      RULE-CORPUS-ID-001 note below).
 *   3. LIVE IDENTITY & VOCABULARY — every referenced live row exists, with the identity
 *      fields and verification_state the lane's contract expects; every enum-shaped
 *      field a record might feed into a live column is checked against that column's
 *      ACTUAL live constraint vocabulary (read from the schema directly), not a doc's
 *      copy of it, which can drift.
 *   4. MONOTONICITY (RULE-INGEST-003) — for every field a record might cause an
 *      ingester to write, is the proposed value more, equally, or less informative than
 *      what's live right now? A write may populate an empty field, improve a populated
 *      one with evidence, or correct a wrong one — it may never replace a populated
 *      field with a less-informative value just because this research pass couldn't
 *      determine something. Inability to determine is a fact about the research pass,
 *      not about the record; writing it in is how research uncertainty gets laundered
 *      into database fact. Ratified 2026-08-22 by ORYN-BASORG after this exact check
 *      surfaced live on the first DLOPP batch: 6 of 9 `cycle_status_found: "unknown"`
 *      records would have overwritten a real, determined live cycle_status (including
 *      wiping "open" on a row students already see) with "unverified" — a write that
 *      looks conservative because it doesn't overclaim, which is exactly why it is the
 *      failure mode hardest to catch in review. Supersedes the narrower cycle_status-only
 *      RULE-INGEST-002.
 *
 * RULE-CORPUS-ID-001 scoping note (ORYN-BASORG, 2026-08-22): a global "every ID in the
 * corpus must be unique, full stop" assertion is WRONG — the program-research corpus has
 * ~536 intentional revision/re-pass ID recurrences. The correct assertion, implemented
 * here, is narrower: THIS batch's own IDs must be unique among themselves, and must not
 * already appear as someone else's ID anywhere else in the corpus. That catches a real
 * collision without flagging legitimate history.
 *
 * Usage:
 *   npm run validate:research -- --lane=dlopp data/research/opportunities/dlopp_batch*.jsonl
 *
 * (Shell glob expansion means the files must actually exist at the given paths — pass
 * explicit paths if your shell doesn't expand `*` the way you expect.)
 *
 * Adding a new lane: add one entry to LANE_CONTRACTS. Each contract states its shape
 * (required fields, id field/prefix, the live table + foreign-key field + identity
 * reconciliation map, any enum fields to vocab-check, its own logical rules, its own
 * monotonicity checks) — the four passes above are shared engine, not per-lane code.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { PostgrestTarget } from "../lib/acquisition/paginate";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

export type Json = Record<string, unknown>;

export interface MonotonicityCheck {
  /** Short label for report output, e.g. "cycle_status". */
  name: string;
  /** Field on the research record proposing a value. */
  recordField: string;
  /** Column on the live row the value would be written into. */
  liveColumn: string;
  /** True if writing `recordValue` over `liveValue` would be a real information loss. */
  isRegression: (recordValue: unknown, liveValue: unknown, record: Json) => boolean;
  describe: (recordValue: unknown, liveValue: unknown) => string;
}

export interface EnumVocabCheck {
  recordField: string;
  liveColumn: string;
  /** The live column's ACTUAL constraint vocabulary — verify via Supabase MCP / a schema
   * read before hardcoding, and re-verify whenever a migration touches this column. This
   * is deliberately not introspected live on every run: a CHECK constraint (as opposed to
   * a true Postgres enum type) has no single stable introspection call this script can
   * rely on across all lanes without per-column plumbing, so it is checked in and dated. */
  liveVocab: readonly string[];
  asOf: string;
}

export interface LaneContract {
  id: string;
  description: string;
  idField: string;
  idPrefix: string;
  requiredFields: string[];
  /** Set when a lane legitimately has more than one field keyset by design (e.g. an
   * additive per-university field, or an optional provenance object) — skips the
   * single-keyset-across-the-batch check, which would otherwise misreport intentional
   * variation as contract drift. requiredFields is still enforced regardless. */
  allowKeysetVariation?: boolean;
  /** Standard shape: verify each record against an EXISTING live row via a foreign key
   * (DLOPP/ECW — updating/annotating rows that already exist). Both undefined skips the
   * standard live-identity pass entirely — for a lane whose records propose genuinely
   * NEW rows with nothing live to reconcile against yet (see customLiveChecks instead). */
  liveTable?: string;
  foreignKeyField?: string;
  /** [recordField, liveColumn] pairs that must match exactly. */
  identityReconciliation?: [string, string][];
  requiredLiveVerificationState?: string;
  requiredLiveStatus?: string;
  enumVocabChecks?: EnumVocabCheck[];
  logicalRules: (record: Json, recordId: string) => string[];
  monotonicityChecks?: MonotonicityCheck[];
  /** Escape hatch for a lane whose live-verification shape isn't "check one existing row
   * by foreign key" — e.g. AU-R1's records propose programmes with zero live
   * counterparts yet, so what needs checking is university-name RESOLUTION (via the same
   * production resolveUniversity() other lanes use) plus corpus-internal consistency
   * (duplicate URLs, cross-university taxonomy agreement), not row-by-row reconciliation.
   * Runs in addition to the standard pass when both are configured. */
  customLiveChecks?: (records: Json[], target: PostgrestTarget) => Promise<{ defects: string[]; findings: string[] }>;
}

// ---------------------------------------------------------------------------------------
// DLOPP — RES-R2 package 1, opportunity deadlines & cycle status
// ---------------------------------------------------------------------------------------

const LIVE_OPPORTUNITY_CYCLE_STATUS_VOCAB = [
  "open",
  "upcoming",
  "closed",
  "date_not_announced",
  "historical",
  "discontinued",
  "unverified",
] as const;

const CYCLE_STATUS_DETERMINED = new Set(["open", "upcoming", "closed", "historical", "discontinued"]);
const CYCLE_STATUS_UNINFORMATIVE = new Set(["unverified", "date_not_announced"]);

export const DLOPP_CONTRACT: LaneContract = {
  id: "dlopp",
  description: "RES-R2 — opportunity deadlines & cycle status (docs/research/opportunities-deadlines/README.md)",
  idField: "research_record_id",
  idPrefix: "DLOPP-",
  // Package V1-5 (P2/P3, RES-R2 now gone): a re-check pass added an additive
  // `supersedes_record_id` field on 2 of 89 summer_program records — legitimate,
  // documented correction pattern (not contract drift), same shape as AU-R1's Monash
  // `atar` field.
  allowKeysetVariation: true,
  requiredFields: [
    "research_record_id",
    "record_type",
    "lane",
    "opportunity_id",
    "opportunity_title",
    "organization",
    "category",
    "db_state_at_research",
    "finding_type",
    "found_deadline",
    "found_deadline_kind",
    "undated_deadline_verbatim",
    "cycle_label_found",
    "cycle_status_found",
    "next_cycle_signal",
    "source_url",
    "source_domain",
    "source_type",
    "verbatim_evidence",
    "year_convention_note",
    "retrieved_at",
    "fetch_method",
    "confidence",
    "confidence_reason",
    "conflicts",
    "robots_check",
    "researcher_notes",
  ],
  liveTable: "opportunities",
  foreignKeyField: "opportunity_id",
  identityReconciliation: [
    ["opportunity_title", "title"],
    ["category", "category"],
  ],
  requiredLiveVerificationState: "verified_current",
  // NOT hard-required (was, for P1) — ORYN-BASORG's later ruling (after the ECW3
  // under_review finding) scopes research to status='active' as a matter of policy, not
  // contract; a record referencing a non-active row isn't a contract defect, it's a
  // reportable scope question. See customLiveChecks below for the breakdown, matching
  // how the ECW lane reports it.
  enumVocabChecks: [
    {
      recordField: "cycle_status_found",
      liveColumn: "cycle_status",
      liveVocab: LIVE_OPPORTUNITY_CYCLE_STATUS_VOCAB,
      asOf: "2026-08-22 (Supabase MCP, qtcvcflzxbuagvvwahhu, opportunities.cycle_status CHECK constraint)",
    },
  ],
  logicalRules: (r, id) => {
    const defects: string[] = [];
    const findingType = r["finding_type"] as string;
    const foundDeadline = r["found_deadline"];
    const undatedVerbatim = r["undated_deadline_verbatim"];

    // Never-synthesize-a-year rule: a dated fact requires an actual dated finding. Both
    // dated_current_cycle (a live dated fact) AND closed_historical (a concluded cycle's
    // dated fact — "a closed-for-this-cycle deadline is a real recordable historical
    // fact, not a blank" per the README) may legitimately carry a non-null found_deadline;
    // undated_recurring/nothing_published/deferred must not, since by definition no
    // year-bearing date was found for those.
    const CAN_CARRY_DATED_DEADLINE = new Set(["dated_current_cycle", "closed_historical"]);
    if (findingType === "dated_current_cycle" && (foundDeadline === null || foundDeadline === undefined)) {
      defects.push(`${id}: finding_type=dated_current_cycle but found_deadline is null — a dated finding needs a date`);
    }
    if (!CAN_CARRY_DATED_DEADLINE.has(findingType) && foundDeadline !== null && foundDeadline !== undefined) {
      defects.push(`${id}: finding_type=${findingType} but found_deadline is non-null (${String(foundDeadline)}) — only dated_current_cycle/closed_historical may carry a found year`);
    }
    if (foundDeadline !== null && foundDeadline !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(foundDeadline))) {
      defects.push(`${id}: found_deadline "${String(foundDeadline)}" is not a valid ISO date`);
    }
    if (findingType === "undated_recurring" && (undatedVerbatim === null || undatedVerbatim === undefined || String(undatedVerbatim).trim() === "")) {
      defects.push(`${id}: finding_type=undated_recurring but undated_deadline_verbatim is empty — the recurring pattern itself must be recorded`);
    }
    if (String(r["retrieved_at"] ?? "").trim() === "") {
      defects.push(`${id}: retrieved_at is empty`);
    }
    return defects;
  },
  monotonicityChecks: [
    {
      name: "deadline",
      recordField: "found_deadline",
      liveColumn: "deadline",
      isRegression: (recordValue, liveValue) => (recordValue === null || recordValue === undefined) && liveValue !== null && liveValue !== undefined,
      describe: (_rv, liveValue) => `found_deadline is null but live deadline is ${JSON.stringify(liveValue)} — a naive "always write found_deadline" mapper would erase a real date`,
    },
    {
      name: "cycle_status",
      recordField: "cycle_status_found",
      liveColumn: "cycle_status",
      isRegression: (recordValue, liveValue) => {
        if (recordValue === null || recordValue === undefined) return false;
        const rv = String(recordValue);
        const lv = String(liveValue);
        if (!(LIVE_OPPORTUNITY_CYCLE_STATUS_VOCAB as readonly string[]).includes(rv)) return true; // no live equivalent at all
        if (CYCLE_STATUS_UNINFORMATIVE.has(rv) && CYCLE_STATUS_DETERMINED.has(lv)) return true; // quiet downgrade within vocab
        return false;
      },
      describe: (recordValue, liveValue) => {
        const rv = String(recordValue);
        if (!(LIVE_OPPORTUNITY_CYCLE_STATUS_VOCAB as readonly string[]).includes(rv)) {
          return `cycle_status_found="${rv}" has NO live-vocabulary equivalent; live cycle_status is currently "${String(liveValue)}" — must be SKIPPED at ingestion, never coerced (RULE-INGEST-003)`;
        }
        return `cycle_status_found="${rv}" (uninformative) would replace live "${String(liveValue)}" (a determined state) — verify this is an intentional evidence-backed correction, not a quiet downgrade, before ingesting`;
      },
    },
    {
      name: "current_cycle_label",
      recordField: "cycle_label_found",
      liveColumn: "current_cycle_label",
      isRegression: (recordValue, liveValue) => {
        const emptyRecord = recordValue === null || recordValue === undefined || String(recordValue).trim() === "";
        const substantiveLive = typeof liveValue === "string" && liveValue.trim().length > 15;
        return emptyRecord && substantiveLive;
      },
      describe: (_rv, liveValue) => `cycle_label_found is empty but live current_cycle_label already holds real content ("${String(liveValue).slice(0, 70)}...") — a naive full-field overwrite would null it out`,
    },
    // Replacement-direction check for `deadline`, added for package V1-5 (P2/P3) — the
    // class RES-I2's guard found 79 holds in on P1 that this contract's erasure-only
    // checks (above) couldn't see: BOTH sides populated, values DIFFERENT. Safe to check
    // mechanically here because a date is a structured, exact-comparable value — two
    // different ISO dates really are a meaningful disagreement, not a paraphrase.
    {
      name: "deadline (replacement)",
      recordField: "found_deadline",
      liveColumn: "deadline",
      isRegression: (recordValue, liveValue) => recordValue !== null && recordValue !== undefined && liveValue !== null && liveValue !== undefined && String(recordValue) !== String(liveValue),
      describe: (recordValue, liveValue) => `found_deadline="${String(recordValue)}" differs from live deadline="${String(liveValue)}" — both populated, not a populate-empty-field case; needs evidence-correctness review (which one is right), not an automatic overwrite either direction`,
    },
    // Deliberately NO equivalent "current_cycle_label (replacement)" check — tried one
    // for this same package, removed it after checking the output, not before. Two
    // compounding reasons it doesn't work: (1) current_cycle_label is free text —
    // RULE-INGEST-004 puts free-text content judgments outside this guard's domain, and
    // exact-string inequality is a bad proxy for "meaningfully different" (37 of the 43
    // hits were paraphrase — same underlying fact, different wording, e.g.
    // "2026 (July 13-24, 2026)" vs "2026 session (July 13-24, 2026); registrations
    // closed"); (2) even a refined "do the leading years disagree" heuristic (7 of 43)
    // turned out to be a false signal for a structural reason, not just noisy phrasing:
    // `cycle_label_found` on a closed_historical record describes the HISTORICAL cycle
    // the record is reporting on, not a proposed replacement value for the live
    // *current*-cycle label — checked one directly (DLOPP-SP-B2-23): the record's own
    // `db_state_at_research` already showed live's 2027 label, and its own
    // `researcher_notes` said so explicitly ("db_state was already correct about 2027
    // being unannounced"). The record was never proposing an overwrite; a naive
    // string-diff check couldn't tell the difference. `found_deadline`'s mapping is
    // simpler (only certain finding_types populate it at all, already enforced in
    // logicalRules above), which is why the same shape of check is safe for that field
    // and not for this one.
  ],
  customLiveChecks: async (records, target) => {
    const defects: string[] = [];
    const findings: string[] = [];
    const ids = [...new Set(records.map((r) => String(r["opportunity_id"])))];
    const CHUNK = 150;
    const statusById = new Map<string, string>();
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const response = await fetch(`${target.url}/rest/v1/opportunities?select=id,status&id=in.(${chunk.join(",")})`, {
        headers: { apikey: target.key, Authorization: `Bearer ${target.key}` },
      });
      if (!response.ok) {
        findings.push(`Status breakdown check failed: HTTP ${response.status}`);
        continue;
      }
      const rows = (await response.json()) as { id: string; status: string }[];
      for (const row of rows) statusById.set(row.id, row.status);
    }
    const statusCounts = new Map<string, number>();
    const nonActiveRecords: string[] = [];
    for (const r of records) {
      const oid = String(r["opportunity_id"]);
      const status = statusById.get(oid) ?? "<not found live>";
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
      if (status !== "active") nonActiveRecords.push(`${r["research_record_id"]} (${r["opportunity_title"]}): status="${status}"`);
    }
    findings.push(`Status breakdown across ${records.length} records: ${[...statusCounts.entries()].map(([s, c]) => `${s}=${c}`).join(", ")}`);
    if (nonActiveRecords.length > 0) {
      findings.push(`${nonActiveRecords.length} records reference non-active opportunities (research is contingent on the row surviving its own review, per ORYN-BASORG's ECW3 ruling):`);
      for (const line of nonActiveRecords) findings.push(`  ${line}`);
    }

    // Supersession-awareness: a record with supersedes_record_id is an intentional
    // correction, not a duplicate researched-twice case — report the pairs so a reader
    // can see which finding is current without cross-referencing the raw files.
    for (const r of records) {
      const supersedes = r["supersedes_record_id"];
      if (supersedes) {
        const original = records.find((o) => o["research_record_id"] === supersedes);
        findings.push(
          `${r["research_record_id"]} supersedes ${String(supersedes)}${original ? ` (finding_type ${original["finding_type"]} → ${r["finding_type"]})` : " (superseded record not found in this file set)"}`
        );
      }
    }
    return { defects, findings };
  },
};

// ---------------------------------------------------------------------------------------
// ECW — RES-R3 eligible_countries waves (ECW2/ECW3/ECW4/...), package V1-3
// ---------------------------------------------------------------------------------------

export const ECW_CONTRACT: LaneContract = {
  id: "ecw",
  description: "RES-R3 — opportunities.eligible_countries research waves (docs/research/opportunities-eligible-countries/). Prefix 'ECW' covers ECW2/ECW3/ECW4/... together — the collision check narrows by prefix, then compares exact id strings, so this is safe across waves.",
  idField: "record_id",
  idPrefix: "ECW",
  requiredFields: [
    "record_id",
    "lane",
    "batch",
    "opportunity_id",
    "opportunity_title",
    "category",
    "finding",
    "proposed_eligible_countries",
    "proposed_action",
    "verbatim_evidence",
    "source_url",
    "source_type",
    "retrieved_at",
    "fetch_method",
    "confidence",
    "notes",
  ],
  liveTable: "opportunities",
  foreignKeyField: "opportunity_id",
  identityReconciliation: [
    ["opportunity_title", "title"],
    ["category", "category"],
  ],
  // Deliberately NOT set: unlike DLOPP, this lane's own scope (per wave 1/2/3 precedent)
  // is "every null/empty eligible_countries row," not filtered by verification_state or
  // status — a mixed distribution here is expected, not a defect. Reported as an
  // observation in logicalRules instead of enforced as a hard requirement.
  enumVocabChecks: [],
  logicalRules: (r, id) => {
    const defects: string[] = [];
    const finding = r["finding"] as string;
    const proposedAction = r["proposed_action"] as string;
    const proposedCountries = r["proposed_eligible_countries"];
    const hasProposedCountries = proposedCountries !== null && proposedCountries !== undefined && Array.isArray(proposedCountries) && (proposedCountries as unknown[]).length > 0;

    // confirmed_open_worldwide must never carry a populated array — empty is the whole
    // point (an all-countries enumeration would be the fabrication this project's
    // standing rule prohibits, per every ECW wave's own documented discipline).
    if (finding === "confirmed_open_worldwide" && hasProposedCountries) {
      defects.push(`${id}: finding=confirmed_open_worldwide but proposed_eligible_countries is populated — confirmed-open should keep the array empty, never enumerate`);
    }
    // A populate proposal's action must actually say so, not a none_*/defer action.
    if (hasProposedCountries && proposedAction.startsWith("none_")) {
      defects.push(`${id}: proposed_eligible_countries is populated but proposed_action="${proposedAction}" reads as a no-op — action/value mismatch`);
    }
    // The reverse: an action that claims a populate must have the array to back it.
    if (proposedAction === "propose_eligible_countries" && !hasProposedCountries) {
      defects.push(`${id}: proposed_action claims a populate but proposed_eligible_countries is empty/null`);
    }
    if (!String(r["verbatim_evidence"] ?? "").trim()) {
      defects.push(`${id}: verbatim_evidence is empty — every finding needs quoted evidence, even a null-by-design one`);
    }
    if (!String(r["retrieved_at"] ?? "").trim()) {
      defects.push(`${id}: retrieved_at is empty`);
    }
    return defects;
  },
  monotonicityChecks: [
    {
      name: "eligible_countries",
      recordField: "proposed_eligible_countries",
      liveColumn: "eligible_countries",
      isRegression: (recordValue, liveValue) => {
        const proposed = Array.isArray(recordValue) ? (recordValue as unknown[]) : null;
        const live = Array.isArray(liveValue) ? (liveValue as unknown[]) : null;
        if (!proposed || proposed.length === 0) return false; // nothing proposed, not a write
        return !!live && live.length > 0; // populating over an already-non-empty live array is a replacement, not a populate
      },
      describe: (_rv, liveValue) => `proposes a non-empty eligible_countries while live already holds ${JSON.stringify(liveValue)} — this is a REPLACEMENT, not a populate-empty-field write; needs evidence-backed correction review, not an automatic apply`,
    },
    {
      // RULE-INGEST-004: free text is outside the monotonicity guard's domain — this
      // check only asks "would a write here touch an already-populated field," not
      // "is the proposed prose correct." A record's citizenship_restrictions/
      // residency_restrictions prose proposal is signaled by proposed_action, not a
      // dedicated proposed-text field (the contract carries the wording in
      // verbatim_evidence + notes) — checked against proposed_action as the marker.
      name: "citizenship_restrictions (prose, unadjudicated content)",
      recordField: "proposed_action",
      liveColumn: "citizenship_restrictions",
      isRegression: (recordValue, liveValue) => recordValue === "propose_citizenship_restrictions_prose_only" && liveValue !== null && liveValue !== undefined && String(liveValue).trim() !== "",
      describe: (_rv, liveValue) => `proposes new citizenship_restrictions prose while live already holds "${String(liveValue).slice(0, 70)}..." — a REPLACEMENT of existing prose, not a populate; content correctness is NOT checked here (RULE-INGEST-004 — free text is outside this guard's domain), only that live isn't already populated`,
    },
  ],
};

// ---------------------------------------------------------------------------------------
// AU-R1 — RES-R1 Australian university programme catalogue, package V1-4
// ---------------------------------------------------------------------------------------

const AU_R1_FIELD_PROVENANCE_VOCAB = ["explicit_source_field", "explicit_title_token", "structured_code_mapping", "regulatory_inference"] as const;

const GRADUATE_TITLE_TOKEN = /\b(Master of|Doctor of)\b/i;
const INTEGRATED_MASTERS_LEVEL = "Bachelor / first-cycle (integrated master's)";

/** Pure: does the SAME degree_level label mean the same real-world qualification shape
 * across universities? The concrete, checkable version — a program whose title itself
 * names a graduate award ("Master of...", "Doctor of...") should land in the same
 * taxonomic bucket regardless of which university's derivation method produced it. This
 * is the exact mechanism that found the real V1-4 gap (10 Sydney combined-award records
 * under-classified because Sydney's title-token method only checks for "Honours"/
 * "Diploma", with no path to "Master"/"Doctor") — split out from the network-dependent
 * university-resolution work in customLiveChecks so the calibrated case can be locked in
 * with a fast unit test, independent of any live Supabase state. */
export function findTaxonomyConsistencyGaps(records: Json[]): string[] {
  const findings: string[] = [];
  for (const r of records) {
    const title = String(r["program_name"] ?? "");
    const level = r["degree_level"];
    if (GRADUATE_TITLE_TOKEN.test(title) && level !== INTEGRATED_MASTERS_LEVEL) {
      findings.push(
        `${r["research_program_id"]} (${r["university_name"]}): title "${title}" names a graduate award (Master/Doctor) but degree_level="${String(level)}", not "${INTEGRATED_MASTERS_LEVEL}" — the same real-world combined-degree shape gets a more specific label at other universities in this corpus using an AQF-code-based method; this one used title-token matching that only checks for "Honours"/"Diploma", missing "Master"/"Doctor"`
      );
    }
  }
  return findings;
}

// Fields legitimately expected to be long free text, a URL, or non-value metadata — not
// candidates for the "does this value belong in this field's domain" check below.
const VALUE_DOMAIN_SKIP_FIELDS = new Set([
  "research_program_id", "official_program_url", "admissions_url", "source_url",
  "verification_status", "researcher_notes", "field_provenance", "university_name",
  "university_official_domain", "program_name", "researched_at",
]);

// Phrases that describe HOW a value was derived/checked rather than being a value
// themselves — the exact shape of the Adelaide V1-12b/RES-V2 finding (a "no distinct
// international variant... confirmed live... 301-redirect... byte-identical" provenance
// sentence sitting in study_mode/entry_requirements, where every sibling record held a
// genuine study-mode or entry-criteria value). Narrow and wording-specific by
// construction — this catches a recurrence of the SAME phrasing, not every possible
// instance of the class; the length-outlier check below is the general-shape catch.
const PROVENANCE_LANGUAGE_MARKERS =
  /confirmed live|no distinct|byte-identical|byte for byte|301-redirect|301 redirect|\(20\d\d-\d\d-\d\d\)|checked directly|see the [`'"]|this key is intentionally|not (a )?duplicate of|independently[- ]sourced|wrongly presenting|verified live|self-caught|redirects? to/i;

/** Pure: does a string value belong to its own field's value domain, judged against that
 * field's OTHER values in the SAME corpus — not against any fixed schema, since "normal"
 * length/shape varies by field and even by record (a genuinely dual-campus program's
 * `campus` value is legitimately longer than a single-campus one's). Two independent
 * signals, both required to be cheap and corpus-agnostic so this runs on any lane:
 *
 * 1. Length outlier: a field whose values are normally short (median < 150 chars, i.e.
 *    enum/label-shaped) getting a value dramatically longer than its own median. This is
 *    a LEAD, not a verdict — V1-13's sweep found real length outliers in Monash's
 *    `campus`/`atar.value` that were genuine, correct, unusually-complex program facts
 *    (a dual-campus double degree, a multi-band ATAR cutoff), not defects. Reported as a
 *    finding for review, same as this function's other signal and as
 *    findTaxonomyConsistencyGaps — never a batch-failing defect, because the false-positive
 *    rate on this signal alone is real and was measured, not assumed.
 * 2. Provenance-language marker: the value contains phrasing that explains how data was
 *    obtained rather than stating what the data is, regardless of the field's normal
 *    length (entry_requirements is normally long, so signal 1 alone wouldn't catch a
 *    similarly-long provenance sentence replacing similarly-long genuine content there).
 *
 * V1-13 (2026-08-22) swept UNSW/Sydney/Monash/UWA/Adelaide/Ottawa with this exact logic
 * and found the class nowhere outside Adelaide's already-fixed 3 records (commit
 * 871bbc9) — recorded here so a future corpus gets the same check without re-deriving it. */
export function findValueDomainOutliers(records: Json[]): string[] {
  const findings: string[] = [];

  function* walk(record: Json): Generator<[string, string]> {
    for (const [k, v] of Object.entries(record)) {
      if (VALUE_DOMAIN_SKIP_FIELDS.has(k)) continue;
      if (typeof v === "string") yield [k, v];
      else if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [sk, sv] of Object.entries(v as Record<string, Json>)) {
          if (typeof sv === "string") yield [`${k}.${sk}`, sv];
        }
      }
    }
  }

  // Signal 1: per-field length outliers, computed corpus-wide before per-record checking.
  const byField = new Map<string, { id: string; value: string }[]>();
  for (const r of records) {
    const id = String(r["research_program_id"]);
    for (const [field, value] of walk(r)) {
      if (!byField.has(field)) byField.set(field, []);
      byField.get(field)!.push({ id, value });
    }
  }
  for (const [field, entries] of byField) {
    if (entries.length < 5) continue;
    const lengths = entries.map((e) => e.value.length).sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)]!;
    if (median === 0 || median >= 150) continue;
    for (const { id, value } of entries) {
      if (value.length > Math.max(2.5 * median, median + 60) && value.length > 90) {
        findings.push(`${id}: ${field} is ${value.length} chars, ${(value.length / median).toFixed(1)}x this field's own corpus median (${median}) — review whether this is a genuinely complex value or content that doesn't belong in this field's domain: "${value.slice(0, 100)}..."`);
      }
    }
  }

  // Signal 2: provenance-language markers, independent of field length norms.
  for (const r of records) {
    const id = String(r["research_program_id"]);
    for (const [field, value] of walk(r)) {
      if (PROVENANCE_LANGUAGE_MARKERS.test(value)) {
        findings.push(`${id}: ${field} contains provenance/derivation language ("${value.slice(0, 100)}...") — review whether this describes how the value was obtained rather than being the value itself`);
      }
    }
  }

  return findings;
}

/** Duplicated from scripts/audit-dedup-convention-drift.ts's loadUniversityCandidates
 * (same ~25 lines, not worth a shared module for one reused helper this small) — keep the
 * two in sync if the university-pool-building recipe changes. */
async function loadUniversityPool(target: PostgrestTarget): Promise<import("../lib/programs/ingest").UniversityLookupRow[]> {
  const { fetchAllRowsVerified } = await import("../lib/acquisition/paginate");
  const { excludeSupersededUniversities, loadSupersessionMapViaRest } = await import("../lib/universities/canonical");
  interface UniversityRow {
    id: string;
    name: string;
    country: string;
    canonical_entity_id: string | null;
    website_url: string | null;
  }
  interface AliasRow {
    entity_id: string;
    alias: string;
  }
  interface ExternalIdRow {
    entity_id: string;
    id_system: string;
    external_id: string;
  }
  const [{ rows: universities }, { rows: aliases }, { rows: externalIds }] = await Promise.all([
    fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<AliasRow>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<ExternalIdRow>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
  ]);
  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);
  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const existing = externalIdsByEntity.get(e.entity_id) ?? {};
    existing[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, existing);
  }
  const supersessionMap = await loadSupersessionMapViaRest(target);
  return excludeSupersededUniversities(
    supersessionMap,
    universities.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
      externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
      websiteUrl: u.website_url,
    }))
  );
}

export const AU_R1_CONTRACT: LaneContract = {
  id: "au-r1",
  description: "RES-R1 — Australian undergraduate programme catalogue (docs/research/university-programs-au/README.md). Records propose NEW programme rows — 0 live university_programs exist for these universities yet — so there is nothing to reconcile against by foreign key; customLiveChecks does university-identity resolution + corpus-internal consistency instead.",
  idField: "research_program_id",
  idPrefix: "AU-R1-",
  // Monash carries one additive field (`atar`) UNSW/Sydney don't — documented, intentional
  // (README: "Not retrofitted onto UNSW or Sydney — neither platform publishes an
  // equivalent field at all"), not contract drift.
  allowKeysetVariation: true,
  requiredFields: [
    "research_program_id",
    "university_name",
    "university_country",
    "university_official_domain",
    "program_name",
    "degree_level",
    "degree_type",
    "faculty_or_school",
    "subject_hint",
    "official_program_url",
    "admissions_url",
    "source_url",
    "source_type",
    "language_of_instruction",
    "duration",
    "campus",
    "delivery_mode",
    "international_eligible",
    "researched_at",
    "researcher_notes",
    "retrieval_method",
    "field_provenance",
    "verification_status",
  ],
  logicalRules: (r, id) => {
    const defects: string[] = [];
    const fieldProvenance = (r["field_provenance"] as Record<string, unknown>) ?? {};

    // Closed vocabulary (BASORG-owned) — a value outside the 4 is a defect; the object's
    // total ABSENCE on a field with no special basis is fine (per the README's own fence).
    for (const [field, basis] of Object.entries(fieldProvenance)) {
      if (!(AU_R1_FIELD_PROVENANCE_VOCAB as readonly string[]).includes(String(basis))) {
        defects.push(`${id}: field_provenance.${field}="${String(basis)}" is not in the closed vocabulary [${AU_R1_FIELD_PROVENANCE_VOCAB.join(", ")}]`);
      }
    }
    // The fence itself: a null-valued field must carry no field_provenance entry (nothing
    // to attribute provenance to on an unknown value) — a populated entry there would mean
    // provenance is describing a value that doesn't exist.
    for (const field of ["degree_level", "international_eligible"]) {
      if (r[field] === null && field in fieldProvenance) {
        defects.push(`${id}: ${field} is null but field_provenance still has an entry for it ("${String(fieldProvenance[field])}") — provenance on a null value attributes a basis to nothing`);
      }
    }
    if (!String(r["official_program_url"] ?? "").trim()) {
      defects.push(`${id}: official_program_url is empty`);
    }
    if (!String(r["program_name"] ?? "").trim()) {
      defects.push(`${id}: program_name is empty`);
    }
    return defects;
  },
  customLiveChecks: async (records, target) => {
    const defects: string[] = [];
    const findings: string[] = [];

    // --- 1. University-identity resolution (real production resolveUniversity, same as
    //        the V1-2 dedup audit) ---
    const { resolveUniversity } = await import("../lib/programs/ingest");
    const universities = await loadUniversityPool(target);
    const byUniversity = new Map<string, Json[]>();
    for (const r of records) {
      const record = r as unknown as import("../lib/programs/ingest").ResearchProgramRecord;
      const { universityId, reason } = resolveUniversity(record, universities);
      const id = String(r["research_program_id"]);
      if (!universityId) {
        defects.push(`${id}: university "${r["university_name"]}" did not resolve — ${reason}`);
        continue;
      }
      if (!byUniversity.has(universityId)) byUniversity.set(universityId, []);
      byUniversity.get(universityId)!.push(r);
    }

    // --- 2. Zero duplicate official_program_url, within each file's university AND
    //        across the whole corpus (R1 claims this; verify independently rather than
    //        trust the self-report) ---
    const urlCounts = new Map<string, string[]>();
    for (const r of records) {
      const url = String(r["official_program_url"] ?? "");
      if (!url) continue;
      if (!urlCounts.has(url)) urlCounts.set(url, []);
      urlCounts.get(url)!.push(String(r["research_program_id"]));
    }
    for (const [url, ids] of urlCounts) {
      if (ids.length > 1) defects.push(`official_program_url "${url}" appears on ${ids.length} records: ${ids.join(", ")} — duplicate URL, contradicts R1's own zero-duplicate claim`);
    }

    // --- 3. Taxonomy consistency (see findTaxonomyConsistencyGaps's own doc comment —
    //        extracted so this specific check can be unit tested without a live fetch). ---
    findings.push(...findTaxonomyConsistencyGaps(records));
    findings.push(...findValueDomainOutliers(records));

    // --- 4. Null discipline: scan for postgraduate-credential terms outside the
    //        already-accounted-for integrated-master's bucket, per university — Monash's
    //        own corpus correctly excluded 9 such records; confirm nothing equivalent
    //        slipped into scope elsewhere. ---
    const POSTGRAD_TERM = /\b(Graduate Certificate|Graduate Diploma|Postgraduate)\b/i;
    for (const r of records) {
      const text = `${r["program_name"] ?? ""} ${r["degree_type"] ?? ""}`;
      if (r["degree_level"] !== INTEGRATED_MASTERS_LEVEL && POSTGRAD_TERM.test(text)) {
        findings.push(`${r["research_program_id"]} (${r["university_name"]}): "${r["program_name"]}" contains a postgraduate-credential term (Graduate Certificate/Diploma/Postgraduate) — confirm this wasn't meant to be excluded like Monash's 9`);
      }
    }

    findings.push(`University resolution: ${byUniversity.size} distinct universities resolved across ${records.length} records, 0 failures` + (defects.some((d) => d.includes("did not resolve")) ? "" : " (all resolved)"));

    return { defects, findings };
  },
};

export const CA_R1_CONTRACT: LaneContract = {
  id: "ca-r1",
  description: "RES-R1 — Canadian undergraduate programme catalogue (docs/research/university-programs-au/README.md, despite the -au path). Records propose NEW programme rows for universities not yet fully live — customLiveChecks does university-identity resolution + corpus-internal consistency, same as au-r1.",
  idField: "research_program_id",
  idPrefix: "CA-R1-",
  requiredFields: [
    "research_program_id",
    "university_name",
    "university_country",
    "university_official_domain",
    "program_name",
    "degree_level",
    "degree_type",
    "faculty_or_school",
    "subject_hint",
    "official_program_url",
    "admissions_url",
    "source_url",
    "source_type",
    "language_of_instruction",
    "duration",
    "campus",
    "delivery_mode",
    "international_eligible",
    "researched_at",
    "researcher_notes",
    "retrieval_method",
    "status_note",
    "field_provenance",
    "verification_status",
  ],
  logicalRules: (r, id) => {
    const defects: string[] = [];
    const fieldProvenance = (r["field_provenance"] as Record<string, unknown>) ?? {};

    for (const [field, basis] of Object.entries(fieldProvenance)) {
      if (!(AU_R1_FIELD_PROVENANCE_VOCAB as readonly string[]).includes(String(basis))) {
        defects.push(`${id}: field_provenance.${field}="${String(basis)}" is not in the closed vocabulary [${AU_R1_FIELD_PROVENANCE_VOCAB.join(", ")}]`);
      }
    }
    for (const field of ["degree_level", "international_eligible"]) {
      if (r[field] === null && field in fieldProvenance) {
        defects.push(`${id}: ${field} is null but field_provenance still has an entry for it ("${String(fieldProvenance[field])}") — provenance on a null value attributes a basis to nothing`);
      }
    }
    if (!String(r["official_program_url"] ?? "").trim()) {
      defects.push(`${id}: official_program_url is empty`);
    }
    if (!String(r["program_name"] ?? "").trim()) {
      defects.push(`${id}: program_name is empty`);
    }
    return defects;
  },
  customLiveChecks: async (records, target) => {
    const defects: string[] = [];
    const findings: string[] = [];

    const { resolveUniversity } = await import("../lib/programs/ingest");
    const universities = await loadUniversityPool(target);
    const byUniversity = new Map<string, Json[]>();
    for (const r of records) {
      const record = r as unknown as import("../lib/programs/ingest").ResearchProgramRecord;
      const { universityId, reason } = resolveUniversity(record, universities);
      const id = String(r["research_program_id"]);
      if (!universityId) {
        defects.push(`${id}: university "${r["university_name"]}" did not resolve — ${reason}`);
        continue;
      }
      if (!byUniversity.has(universityId)) byUniversity.set(universityId, []);
      byUniversity.get(universityId)!.push(r);
    }

    const urlCounts = new Map<string, string[]>();
    for (const r of records) {
      const url = String(r["official_program_url"] ?? "");
      if (!url) continue;
      if (!urlCounts.has(url)) urlCounts.set(url, []);
      urlCounts.get(url)!.push(String(r["research_program_id"]));
    }
    for (const [url, ids] of urlCounts) {
      if (ids.length > 1) defects.push(`official_program_url "${url}" appears on ${ids.length} records: ${ids.join(", ")} — duplicate URL, contradicts R1's own zero-duplicate claim`);
    }

    findings.push(...findTaxonomyConsistencyGaps(records));
    findings.push(...findValueDomainOutliers(records));

    findings.push(`University resolution: ${byUniversity.size} distinct universities resolved across ${records.length} records, 0 failures` + (defects.some((d) => d.includes("did not resolve")) ? "" : " (all resolved)"));

    return { defects, findings };
  },
};

export const LANE_CONTRACTS: Record<string, LaneContract> = {
  dlopp: DLOPP_CONTRACT,
  ecw: ECW_CONTRACT,
  "au-r1": AU_R1_CONTRACT,
  "ca-r1": CA_R1_CONTRACT,
};

// ---------------------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------------------

export function loadJsonl(path: string): { records: Json[]; parseErrors: string[] } {
  const records: Json[] = [];
  const parseErrors: string[] = [];
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      records.push(JSON.parse(trimmed) as Json);
    } catch (e) {
      parseErrors.push(`${path}:${i + 1}: JSON parse error — ${(e as Error).message}`);
    }
  });
  return { records, parseErrors };
}

export function checkContract(records: Json[], contract: LaneContract): string[] {
  const defects: string[] = [];
  const keysets = new Set<string>();
  for (const r of records) {
    const id = String(r[contract.idField] ?? "<missing id>");
    for (const field of contract.requiredFields) {
      if (!(field in r)) defects.push(`${id}: missing required field "${field}"`);
    }
    keysets.add(JSON.stringify(Object.keys(r).sort()));
  }
  if (keysets.size > 1 && !contract.allowKeysetVariation) {
    defects.push(`Batch has ${keysets.size} distinct field keysets across ${records.length} records (expected exactly 1) — the contract drifted mid-batch`);
  }
  return defects;
}

/** The exact known id-field names a corpus record might use across lanes — deliberately
 * a closed list, not "any field ending in _id", so an unrelated identifier never gets
 * treated as this collision check's business. */
export const ID_LIKE_FIELDS = ["research_record_id", "record_id", "research_program_id"] as const;

/** Pure: within-batch ID discipline only — unique idField, and unique foreignKeyField
 * with supersession-awareness. A record carrying `supersedes_record_id` is an
 * intentional, explicit correction of an earlier record for the same live row — not a
 * duplicate researched-twice case (the same RULE-CORPUS-ID-001 principle applied to a
 * foreign key instead of an ID: a real, pointer-declared revision, not an accidental
 * collision). Records that supersede something are excluded from the foreign-key
 * duplicate count on BOTH sides of the pairing. Split out from the git-based corpus-wide
 * scan below (checkIdDiscipline) so this half — no I/O, no git — can be unit tested
 * directly. */
export function checkWithinBatchIdDiscipline(records: Json[], contract: LaneContract): string[] {
  const defects: string[] = [];

  const ids = records.map((r) => String(r[contract.idField]));
  const idCounts = new Map<string, number>();
  for (const id of ids) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  for (const [id, count] of idCounts) if (count > 1) defects.push(`Record ID "${id}" appears ${count} times within the batch`);

  if (contract.foreignKeyField) {
    const foreignKeyField = contract.foreignKeyField;
    const supersededIds = new Set(records.map((r) => r["supersedes_record_id"]).filter((v): v is string => typeof v === "string"));
    const nonSupersessionRecords = records.filter((r) => !r["supersedes_record_id"] && !supersededIds.has(String(r[contract.idField])));
    const fkIds = nonSupersessionRecords.map((r) => String(r[foreignKeyField]));
    const fkCounts = new Map<string, number>();
    for (const id of fkIds) fkCounts.set(id, (fkCounts.get(id) ?? 0) + 1);
    for (const [id, count] of fkCounts) if (count > 1) defects.push(`Foreign key "${foreignKeyField}"="${id}" appears ${count} times within the batch — same live row researched twice`);
  }

  return defects;
}

/** Pure: given one candidate file's raw text and this batch's own unique IDs, which
 * (field, value) pairs are a REAL collision — the id string as another record's own
 * id-field VALUE — as opposed to merely appearing somewhere in the file's text. Parses
 * each line as JSON and checks only known id-field values; never a raw substring match
 * across the whole file. A raw substring match produces real false positives: caught live
 * on ECW4-021, cited by its own record_id inside a *different* record's `notes` field
 * ("...the CTY Residential Program, ECW4-021, succeeding earlier this wave") — a
 * legitimate cross-reference, not a duplicate. Substring search can't distinguish "this
 * IS the id" from "this MENTIONS the id in prose"; field-value equality can. Split out
 * from the git plumbing around it (checkIdDiscipline) so this matching logic — the actual
 * bug that shipped — can be unit tested without a real git repository. */
export function findIdCollisionsInFileContent(content: string, uniqueIds: readonly string[]): { field: string; value: string }[] {
  const matches: { field: string; value: string }[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let obj: Json;
    try {
      obj = JSON.parse(line) as Json;
    } catch {
      continue; // not JSONL, or a non-record line in this file — skip rather than false-positive on raw text
    }
    for (const field of ID_LIKE_FIELDS) {
      const value = obj[field];
      if (typeof value === "string" && uniqueIds.includes(value)) {
        matches.push({ field, value });
      }
    }
  }
  return matches;
}

/** Pure: `git branch -r --format=%(refname:short)` lists the origin/HEAD symref as a bare
 * `origin` entry alongside real `origin/<branch>` entries. An unfiltered listing fed that
 * bogus entry into the collision-check's branch loop. Split out so this one-line filter —
 * trivial, but a real bug the first version shipped without — has its own regression
 * test rather than being invisible inside checkIdDiscipline's try block. */
export function filterRealBranches(branchLines: string[]): string[] {
  return branchLines.map((b) => b.trim()).filter((b) => b.includes("/"));
}

/** Every blob hash a source file's own path has EVER held in the current branch's own
 * reachable history, not just its current working-tree content. Editing an
 * already-merged file in place (e.g. backfilling `record_type`/`lane` to fix a contract
 * defect) changes the blob hash — a same-content-only comparison then mistakes the
 * file's own unedited past self (still sitting on whatever ref it was originally merged
 * to) for a different file that happens to collide on IDs, which it isn't: it's the same
 * file, at an earlier revision. Reproduced directly (an isolated repo: commit a file to
 * `main`, edit it in place on a branch descended from that commit, compare) before
 * trusting this was real — the pre-fix comparison produced exactly the false-positive
 * shape described: 2 IDs, both flagged as colliding with `main`'s own prior commit of
 * the identical path. `git log --format=%H -- <path>` from the CURRENT HEAD is the right
 * scope (not `--all`): it answers "is this genuinely part of my own file's own lineage,"
 * not "does this content exist anywhere in the universe" — the latter would accept a
 * coincidental match from an unrelated branch as safe, which is a real collision, not a
 * revision. A file with no commit history yet (brand new, never committed) degrades
 * safely: `git log` returns nothing, the current working-tree hash is still included. */
export function gatherSourceBlobHashes(sourceFiles: string[]): Set<string> {
  const hashes = new Set<string>();
  for (const f of sourceFiles) {
    hashes.add(execFileSync("git", ["hash-object", f], { encoding: "utf8" }).trim());
    let commits: string[] = [];
    try {
      commits = execFileSync("git", ["log", "--format=%H", "--", f], { encoding: "utf8" }).split("\n").filter(Boolean);
    } catch {
      continue; // no history for this path yet — current hash above is enough
    }
    for (const commit of commits) {
      try {
        hashes.add(execFileSync("git", ["rev-parse", `${commit}:${f}`], { encoding: "utf8" }).trim());
      } catch {
        // path didn't exist at this commit (renamed/moved into place) — skip, not fatal
      }
    }
  }
  return hashes;
}

function checkIdDiscipline(records: Json[], contract: LaneContract, sourceFiles: string[]): string[] {
  const defects: string[] = [...checkWithinBatchIdDiscipline(records, contract)];

  // Corpus-wide collision check: do any of this batch's own IDs already exist as a
  // DIFFERENT file's ID anywhere else in the corpus? (RULE-CORPUS-ID-001 scoping —
  // exact-ID-string reuse, not prefix reuse; legitimate revision history keeps its own
  // IDs.) Best-effort: requires git and a populated remote-tracking set, and is skipped
  // (with a warning, not a failure) if git isn't usable here.
  //
  // "Same file, different ref" is NOT a collision — the same batch routinely lives on
  // both its own feature branch and (once merged) on main, and a bare `origin` branch
  // listing entry is itself just the origin/HEAD symref pointing at origin/main, so a
  // path-string or branch-name exclusion is fragile against exactly this (caught live:
  // this batch merged to main via PR #13 mid-verification, which made a naive
  // path-suffix check misfire as 74 false "collisions" against its own content).
  // Dedupe on git BLOB HASH instead — content-identity is unambiguous regardless of how
  // many refs currently point at the same bytes. And "same file" means the whole of its
  // own history, not just its current content — see gatherSourceBlobHashes's own comment
  // for the in-place-edit false positive this generalization fixes.
  //
  // The git-process orchestration in this block (branch enumeration, blob hashing) is
  // deliberately NOT unit tested (see __tests__/scripts/validate-research-records.test.ts's
  // own header) — real execFileSync × N branches, not logic. What IS unit tested, because
  // it is where the real bugs lived: filterRealBranches (the origin/HEAD filter),
  // findIdCollisionsInFileContent (the JSON-field-value matching), and
  // gatherSourceBlobHashes (the same-file-at-an-earlier-revision fix above) — the last one
  // against a real, disposable temp git repo, since this logic is inherently git-native
  // and a mock would only test the mock.
  try {
    const sourceBlobHashes = gatherSourceBlobHashes(sourceFiles);
    const branches = filterRealBranches(
      execFileSync("git", ["branch", "-r", "--format=%(refname:short)"], { encoding: "utf8" }).split("\n")
    );

    const uniqueIds = [...new Set(records.map((r) => String(r[contract.idField])))];
    const checkedBlobs = new Set<string>(); // avoid re-scanning identical content found via multiple branches
    for (const branch of branches) {
      let filesWithPrefix: string[] = [];
      try {
        filesWithPrefix = execFileSync("git", ["grep", "-l", contract.idPrefix, branch, "--", "data/research/**"], { encoding: "utf8" })
          .split("\n")
          .filter(Boolean);
      } catch {
        continue; // no match on this branch — fine
      }
      for (const hit of filesWithPrefix) {
        const [, path] = hit.split(/:(.+)/);
        if (!path) continue;
        let blobHash = "";
        try {
          blobHash = execFileSync("git", ["rev-parse", `${branch}:${path}`], { encoding: "utf8" }).trim();
        } catch {
          continue;
        }
        if (sourceBlobHashes.has(blobHash)) continue; // byte-identical to one of the batch's own files — not a collision
        if (checkedBlobs.has(blobHash)) continue;
        checkedBlobs.add(blobHash);
        let content = "";
        try {
          content = execFileSync("git", ["show", blobHash], { encoding: "utf8" });
        } catch {
          continue;
        }
        for (const { field, value } of findIdCollisionsInFileContent(content, uniqueIds)) {
          defects.push(`ID "${value}" also appears as ${branch}:${path}'s own "${field}" (blob ${blobHash.slice(0, 12)}) — real corpus collision, not just a shared prefix or a prose mention`);
        }
      }
    }
  } catch (e) {
    console.warn(`  (corpus-collision check skipped: ${(e as Error).message})`);
  }

  return defects;
}

interface LiveRow {
  id: string;
  [column: string]: unknown;
}

export async function fetchLiveRows(table: string, ids: string[]): Promise<Map<string, LiveRow>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. No live checks were performed.");
  }
  const columns = [
    "id",
    "title",
    "category",
    "status",
    "verification_state",
    "deadline",
    "cycle_status",
    "current_cycle_label",
  ];
  const byId = new Map<string, LiveRow>();
  const CHUNK = 150;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const filter = `id=in.(${chunk.join(",")})`;
    const response = await fetch(`${url}/rest/v1/${table}?select=${columns.join(",")}&${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error(`GET ${table} failed: HTTP ${response.status} ${await response.text().catch(() => "")}`);
    const rows = (await response.json()) as LiveRow[];
    for (const row of rows) byId.set(row.id, row);
  }
  return byId;
}

/** The standard shape: verify each record against an EXISTING live row via a foreign
 * key. Only meaningful when the contract declares both liveTable and foreignKeyField —
 * see customLiveChecks for the alternative shape (records proposing new rows). */
export async function checkLiveIdentityAndVocab(records: Json[], contract: LaneContract): Promise<{ defects: string[]; monotonicityFindings: string[] }> {
  const defects: string[] = [];
  const monotonicityFindings: string[] = [];
  if (!contract.liveTable || !contract.foreignKeyField) return { defects, monotonicityFindings };

  const foreignKeyField = contract.foreignKeyField;
  const liveTable = contract.liveTable;
  const ids = [...new Set(records.map((r) => String(r[foreignKeyField])))];
  const live = await fetchLiveRows(liveTable, ids);

  for (const r of records) {
    const id = String(r[contract.idField]);
    const fk = String(r[foreignKeyField]);
    const row = live.get(fk);
    if (!row) {
      defects.push(`${id}: ${foreignKeyField}="${fk}" does not exist live in ${liveTable}`);
      continue;
    }
    for (const [recordField, liveColumn] of contract.identityReconciliation ?? []) {
      if (r[recordField] !== row[liveColumn]) {
        defects.push(`${id}: ${recordField}="${String(r[recordField])}" does not match live ${liveColumn}="${String(row[liveColumn])}"`);
      }
    }
    if (contract.requiredLiveVerificationState && row["verification_state"] !== contract.requiredLiveVerificationState) {
      defects.push(`${id}: live verification_state="${String(row["verification_state"])}", expected "${contract.requiredLiveVerificationState}"`);
    }
    if (contract.requiredLiveStatus && row["status"] !== contract.requiredLiveStatus) {
      defects.push(`${id}: live status="${String(row["status"])}", expected "${contract.requiredLiveStatus}"`);
    }
    for (const check of contract.enumVocabChecks ?? []) {
      const value = r[check.recordField];
      if (value !== null && value !== undefined && !(check.liveVocab as readonly string[]).includes(String(value))) {
        defects.push(
          `${id}: ${check.recordField}="${String(value)}" is not in the live ${check.liveColumn} vocabulary [${check.liveVocab.join(", ")}] (checked ${check.asOf}) — this value has NO live-schema equivalent and cannot be written as-is`
        );
      }
    }
    for (const mono of contract.monotonicityChecks ?? []) {
      const recordValue = r[mono.recordField];
      const liveValue = row[mono.liveColumn];
      if (mono.isRegression(recordValue, liveValue, r)) {
        monotonicityFindings.push(`${id} [${mono.name}]: ${mono.describe(recordValue, liveValue)}`);
      }
    }
  }
  return { defects, monotonicityFindings };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const laneArg = args.find((a) => a.startsWith("--lane="));
  const lane = laneArg?.split("=")[1];
  const files = args.filter((a) => !a.startsWith("--"));

  if (!lane || !LANE_CONTRACTS[lane]) {
    console.error(`Usage: tsx scripts/validate-research-records.ts --lane=<${Object.keys(LANE_CONTRACTS).join("|")}> <file1.jsonl> [file2.jsonl ...]`);
    process.exitCode = 1;
    return;
  }
  if (files.length === 0) {
    console.error("No input files given.");
    process.exitCode = 1;
    return;
  }
  for (const f of files) {
    if (!existsSync(f)) {
      console.error(`File not found: ${f}`);
      process.exitCode = 1;
      return;
    }
  }

  const contract = LANE_CONTRACTS[lane]!;
  console.log(`\n=== Validating ${files.length} file(s) against lane "${contract.id}" ===`);
  console.log(contract.description);

  let allRecords: Json[] = [];
  let allParseErrors: string[] = [];
  for (const f of files) {
    const { records, parseErrors } = loadJsonl(f);
    allRecords = allRecords.concat(records);
    allParseErrors = allParseErrors.concat(parseErrors);
  }
  console.log(`\nLoaded ${allRecords.length} records (${allParseErrors.length} parse errors).`);

  const contractDefects = checkContract(allRecords, contract);
  const idDefects = checkIdDiscipline(allRecords, contract, files);
  const { defects: liveDefects, monotonicityFindings } = await checkLiveIdentityAndVocab(allRecords, contract);
  const logicalDefects = allRecords.flatMap((r) => contract.logicalRules(r, String(r[contract.idField])));

  let customDefects: string[] = [];
  let customFindings: string[] = [];
  if (contract.customLiveChecks) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. customLiveChecks skipped.");
    } else {
      const result = await contract.customLiveChecks(allRecords, { url, key });
      customDefects = result.defects;
      customFindings = result.findings;
    }
  }

  const hardDefects = [...allParseErrors, ...contractDefects, ...idDefects, ...liveDefects, ...logicalDefects, ...customDefects];

  const report = {
    lane: contract.id,
    files,
    recordCount: allRecords.length,
    generatedAt: new Date().toISOString(),
    parseErrors: allParseErrors,
    contractDefects,
    idDefects,
    liveDefects,
    logicalDefects,
    monotonicityFindings,
    customDefects,
    customFindings,
    verdict: hardDefects.length === 0 ? "PASS" : "FAIL",
  };

  console.log(`\n--- Contract (${contractDefects.length}) ---`);
  contractDefects.forEach((d) => console.log("  " + d));
  console.log(`\n--- ID discipline (${idDefects.length}) ---`);
  idDefects.forEach((d) => console.log("  " + d));
  console.log(`\n--- Live identity & vocabulary (${liveDefects.length}) ---`);
  liveDefects.forEach((d) => console.log("  " + d));
  console.log(`\n--- Logical consistency (${logicalDefects.length}) ---`);
  logicalDefects.forEach((d) => console.log("  " + d));
  console.log(`\n--- Monotonicity findings — ingestion-safety, not batch-failing (${monotonicityFindings.length}) ---`);
  monotonicityFindings.forEach((d) => console.log("  " + d));
  if (contract.customLiveChecks) {
    console.log(`\n--- Lane-specific checks: defects (${customDefects.length}) ---`);
    customDefects.forEach((d) => console.log("  " + d));
    console.log(`\n--- Lane-specific checks: findings/observations (${customFindings.length}) ---`);
    customFindings.forEach((d) => console.log("  " + d));
  }

  console.log(`\n=== VERDICT: ${report.verdict} ===`);
  console.log(`Hard defects: ${hardDefects.length}. Monotonicity findings: ${monotonicityFindings.length} (these gate ingestion mapping, not the research itself).\n`);

  const reportPath = `/tmp/validate-research-records-${contract.id}-report.json`;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Full report written to ${reportPath}`);

  process.exitCode = hardDefects.length === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
