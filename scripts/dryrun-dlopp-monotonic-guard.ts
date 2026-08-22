#!/usr/bin/env node
/**
 * RES-I2 dry-run proof for BASORG's DLOPP precondition #1: "the RULE-INGEST-003
 * monotonicity guard is built and dry-run-proven to FIRE on the known cases... not
 * 'written' — demonstrated." Runs lib/opportunities/monotonic-guard.ts against the DLOPP
 * batch's proposed values (deadline / cycle_status / current_cycle_label) for the 15
 * records RES-V1's audit flagged, using the RCHECK-superseding records where they exist
 * (BSPEE/Ashoka/Girl Up), against live state re-measured immediately before this run.
 * BASORG's rulings on the two held records (2026-08-22) are wired in as resolvedCorrections.
 *
 * Read-only — makes no writes, matches package I2-3's scope. Not part of the app; a
 * one-off verification script, output committed as the dry-run proof rather than the
 * script being wired into package.json.
 *
 * Usage: npx tsx scripts/dryrun-dlopp-monotonic-guard.ts
 */
export {};

import { checkRecordMonotonicity, type ResolvedCorrection } from "../lib/opportunities/monotonic-guard";

const CYCLE_STATUS_VOCAB = new Set(["open", "upcoming", "closed", "date_not_announced", "historical", "discontinued", "unverified"]);
const PLACEHOLDER = new Set(["unverified"]);

// Live state re-measured via Supabase MCP execute_sql immediately before this run
// (2026-08-22, project qtcvcflzxbuagvvwahhu) — see docs/handoffs/i2_dlopp-guard-dryrun.md
// for the exact query. Pasted as a literal snapshot, not fetched here, because this
// environment has no local SUPABASE_SECRET_KEY (see i2_ecw2_ingest-report.md's precedent
// for the same constraint on the duplicate-audit baseline).
const LIVE: Record<string, { title: string; deadline: string | null; cycle_status: string; current_cycle_label: string | null }> = {
  "345f64dd-f6f4-4f29-9341-75743c39a7d1": { title: "120 Hours", deadline: null, cycle_status: "closed", current_cycle_label: "120 Hours 2026 deadline was March 14, 2026, 14:00 CET (already passed); 2027 dates not yet posted as of Aug 2026" },
  "1e8e74cf-3bf0-43ad-81a8-c3a4b0e5bc70": { title: "Ashoka Young Changemakers", deadline: null, cycle_status: "open", current_cycle_label: "Open year-round as of 2026-08-21, in six countries only (nominations accepted year-round)" },
  "7a0b2b4e-189d-4e7b-b4a1-ef8886e3a23d": { title: "Aspiring Scientists Summer Internship Program (ASSIP)", deadline: "2026-02-15", cycle_status: "closed", current_cycle_label: "2026" },
  "7d573141-bca6-459d-a206-43aebae178c4": { title: "Baltic Sea Philosophy Essay Event (BSPEE)", deadline: null, cycle_status: "date_not_announced", current_cycle_label: "2025 cycle: essay topics ordered from FETO by Sept 25, papers due Oct 18, winners announced Nov 20, 2025 (all already past). No 2026 cycle invitation found yet as of Aug 21, 2026." },
  "4b9e2c29-c38d-479b-9987-c31501601950": { title: "CyberPatriot - National Youth Cyber Defense Competition", deadline: "2026-10-01", cycle_status: "upcoming", current_cycle_label: "CyberPatriot XIX (2026-2027 season) - registration deadline October 1, 2026" },
  "4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0": { title: "Genesys Works", deadline: null, cycle_status: "unverified", current_cycle_label: null },
  "31f4ecf4-902c-4636-bcc8-77e300d42ae5": { title: "Girl Up Project Awards", deadline: null, cycle_status: "date_not_announced", current_cycle_label: "2025 round — closed for MENA, Canada, South Asia & the Pacific and Europe as of the page state on 2026-08-21" },
  "ee767c59-fee1-4c7a-8db4-ac1bcc5e9660": { title: "International Psychology Olympiad (IPsyO)", deadline: null, cycle_status: "closed", current_cycle_label: "IPsyO 2026 (registration closed; currently in qualification/final stage)" },
  "bc303473-ba94-41e4-9b3d-038804858a8c": { title: "International Public Policy Forum (IPPF)", deadline: "2026-10-13", cycle_status: "upcoming", current_cycle_label: "2026-27 IPPF cycle is open; qualifying round essays due October 13, 2026." },
  "a4c5a08a-f623-4c77-a55f-5782f395c6ec": { title: "Nuffield Research Placements", deadline: null, cycle_status: "date_not_announced", current_cycle_label: "Summer placements; exact current-cycle application window not confirmed on pages fetched" },
  "6005b354-84d0-486f-b9bf-9bc7dcc2ea6c": { title: "Partners for the Future", deadline: null, cycle_status: "unverified", current_cycle_label: null },
  "abe62a46-56f4-449a-b008-d072b1be5dc4": { title: "Ron Brown Scholar Program", deadline: "2026-12-01", cycle_status: "upcoming", current_cycle_label: "2027" },
  "c12ce265-c6c4-454b-97f5-680d366813ec": { title: "STEM Racing", deadline: null, cycle_status: "unverified", current_cycle_label: "STEM Racing is the schools-competition brand of the Greenpower Education Trust, a UK charity (East Sussex). Registration windows vary by country/National Coordinator." },
  "35ddfc5e-1bed-4f28-9655-a1aa3422e554": { title: "Technovation Girls", deadline: null, cycle_status: "date_not_announced", current_cycle_label: "2025-2026 season registration ran Aug 13, 2025-Mar 18, 2026 (already closed). 2026-2027 season registration has not yet opened." },
  "93d45f34-4078-4d15-be6f-d6e157a21943": { title: "The Concord Review - Emerson Prize", deadline: "2026-11-01", cycle_status: "upcoming", current_cycle_label: "Rolling quarterly submissions (deadlines Aug 1 / Nov 1 / Feb 1 / May 1)" },
};

interface Proposal {
  recordId: string;
  opportunityId: string;
  cycleStatusFound: string | null;
  foundDeadline: string | null;
  cycleLabelFound: string | null;
}

// Proposed values verbatim from the DLOPP batch files — RCHECK-01/02/03 used in place of
// the superseded B1-03/B4-10/B4-12 per BASORG's 2026-08-22 supersession instruction.
const PROPOSALS: Proposal[] = [
  { recordId: "DLOPP-B1-01", opportunityId: "345f64dd-f6f4-4f29-9341-75743c39a7d1", cycleStatusFound: "date_not_announced", foundDeadline: null, cycleLabelFound: "2026 (page still describes the 2026 edition)" },
  { recordId: "DLOPP-RCHECK-02", opportunityId: "1e8e74cf-3bf0-43ad-81a8-c3a4b0e5bc70", cycleStatusFound: "open (rolling nominations)", foundDeadline: null, cycleLabelFound: "rolling / year-round" },
  { recordId: "DLOPP-B5-01", opportunityId: "7a0b2b4e-189d-4e7b-b4a1-ef8886e3a23d", cycleStatusFound: "closed", foundDeadline: null, cycleLabelFound: "2026 (program June 18 - August 12, 2026; application closed)" },
  { recordId: "DLOPP-RCHECK-01", opportunityId: "7d573141-bca6-459d-a206-43aebae178c4", cycleStatusFound: "date_not_announced — no 2026 invitation posted", foundDeadline: null, cycleLabelFound: "2025 (most recent activity)" },
  { recordId: "DLOPP-B1-12", opportunityId: "4b9e2c29-c38d-479b-9987-c31501601950", cycleStatusFound: "open", foundDeadline: null, cycleLabelFound: "CyberPatriot 19" },
  { recordId: "DLOPP-B5-02", opportunityId: "4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0", cycleStatusFound: "unknown", foundDeadline: null, cycleLabelFound: "no central cycle — per-city application model" },
  { recordId: "DLOPP-RCHECK-03", opportunityId: "31f4ecf4-902c-4636-bcc8-77e300d42ae5", cycleStatusFound: "closed for MENA, Canada, South Asia & the Pacific, and Europe; alternate non-Award pathways offered for other regions", foundDeadline: null, cycleLabelFound: "2025" },
  { recordId: "DLOPP-B2-06", opportunityId: "ee767c59-fee1-4c7a-8db4-ac1bcc5e9660", cycleStatusFound: "unknown", foundDeadline: null, cycleLabelFound: "page shows the 2025 cycle" },
  { recordId: "DLOPP-B2-07", opportunityId: "bc303473-ba94-41e4-9b3d-038804858a8c", cycleStatusFound: "open", foundDeadline: null, cycleLabelFound: "2026-27 IPPF (homepage); /howtoparticipate page still labeled 2025-26" },
  { recordId: "DLOPP-B5-04", opportunityId: "a4c5a08a-f623-4c77-a55f-5782f395c6ec", cycleStatusFound: "unknown", foundDeadline: null, cycleLabelFound: "" },
  { recordId: "DLOPP-B5-05", opportunityId: "6005b354-84d0-486f-b9bf-9bc7dcc2ea6c", cycleStatusFound: "unknown", foundDeadline: null, cycleLabelFound: "" },
  { recordId: "DLOPP-B5-13", opportunityId: "abe62a46-56f4-449a-b008-d072b1be5dc4", cycleStatusFound: "date_not_announced", foundDeadline: null, cycleLabelFound: '"APPLICATION FOR THE 2026 SCHOLARSHIP COMPETITION IS NOW CLOSED"' },
  { recordId: "DLOPP-B3-02", opportunityId: "c12ce265-c6c4-454b-97f5-680d366813ec", cycleStatusFound: "unknown", foundDeadline: null, cycleLabelFound: "World Finals cadence referenced" },
  { recordId: "DLOPP-B3-03", opportunityId: "35ddfc5e-1bed-4f28-9655-a1aa3422e554", cycleStatusFound: "unknown", foundDeadline: null, cycleLabelFound: "" },
  { recordId: "DLOPP-B3-04", opportunityId: "93d45f34-4078-4d15-be6f-d6e157a21943", cycleStatusFound: "open", foundDeadline: null, cycleLabelFound: "rolling/standing (quarterly publication)" },
];

// BASORG's explicit rulings, 2026-08-22 — the only two entries this run is authorized to
// treat as resolved. Everything else that lands on "hold" stays held, full stop.
const RESOLVED: ResolvedCorrection[] = [
  { recordId: "DLOPP-B5-13", field: "cycle_status", approved: true, reason: "RES-V2: source states 2026 competition closed, no 2027 cycle announced — 'upcoming' affirmatively contradicted." },
  { recordId: "DLOPP-B5-13", field: "deadline", approved: true, reason: "RES-V2: 2026-12-01 was an award-year projection, never a published date — a well-reasoned prediction is still a prediction." },
  { recordId: "DLOPP-B1-01", field: "cycle_status", approved: false, reason: "RES-V2: source is silent on cycle status; silence contradicts nothing, so the correction bar isn't met and date_not_announced would be a pure downgrade from closed." },
];

let totalHold = 0;
let totalSkip = 0;
let totalWrite = 0;

for (const p of PROPOSALS) {
  const live = LIVE[p.opportunityId];
  const result = checkRecordMonotonicity(
    p.recordId,
    p.opportunityId,
    [
      { field: "deadline", liveValue: live.deadline, proposedValue: p.foundDeadline },
      { field: "cycle_status", liveValue: live.cycle_status, proposedValue: p.cycleStatusFound, validVocabulary: CYCLE_STATUS_VOCAB, placeholderLiveValues: PLACEHOLDER },
      { field: "current_cycle_label", liveValue: live.current_cycle_label, proposedValue: p.cycleLabelFound },
    ],
    RESOLVED
  );

  console.log(`\n${p.recordId}  "${live.title}"  [${p.opportunityId}]`);
  for (const d of result.decisions) {
    const tag = d.action === "write" ? "WRITE" : d.action === "skip" ? "SKIP " : "HOLD ";
    console.log(`  ${tag} ${d.field}: live=${JSON.stringify(d.liveValue)} proposed=${JSON.stringify(d.proposedValue)}`);
    console.log(`         ${d.reason}`);
  }
  totalHold += result.decisions.filter((d) => d.action === "hold").length;
  totalSkip += result.decisions.filter((d) => d.action === "skip").length;
  totalWrite += result.decisions.filter((d) => d.action === "write").length;
}

console.log(`\n=== Summary ===`);
console.log(`Records evaluated: ${PROPOSALS.length}   Field decisions: WRITE ${totalWrite}  SKIP ${totalSkip}  HOLD ${totalHold}`);
console.log(`Nothing was written — read-only dry run. Any HOLD line above is a field the guard refuses to decide on its own; it is not written and not silently dropped.`);
