#!/usr/bin/env node
/**
 * CEO's explicit ask, 2026-09-05: "düzeltmeden sonra aynı 27 satırı yeniden say — kaçında
 * rozet gerçekten değişiyor" (after the fix, recount the same 27 rows — in how many does the
 * badge actually change). Building on docs/d2-visible-set-fill-2026-09-05.md's own measurement
 * per CEO's instruction ("kendi ölçümünü sıfırdan yapma, onun üzerine kur") rather than
 * re-deriving from scratch.
 *
 * NOT run against live data — the same access wall from earlier today (direct SQL denied by
 * this session's safety classifier; no .env.local in this worktree by design) applies here
 * too. Instead, each of the 27 rows' POST-FILL per-axis state (age/grade/country: a real
 * value, checked_not_stated, confirmed_open, or still genuinely unresearched) is derived from
 * the two fill SQL files' own text and inline comments — docs/d2-visible-fill-additions-
 * 2026-09-05.sql and docs/d2-visible-fill-requires-0126-0129-0133-2026-09-05.sql — cross-
 * referenced against docs/opportunity-eligibility-d2-not-found-2026-09-04.md (yesterday's own
 * per-row "already confirmed accurate" findings) wherever a row's axis isn't mentioned in
 * either of today's files. This is real derivation from real, cited source documents, not a
 * guess — but it is NOT the same as reading the live database directly, and every row below
 * cites exactly which document justified each axis. Six rows are marked UNCERTAIN where an
 * axis is absent from every source I could find — for those, the conservative assumption
 * (still fully unresearched) is used, which can only make this count an UNDERcount of real
 * improvement, never an overcount.
 *
 * The three rows docs/d2-visible-set-fill-2026-09-05.md itself already named as reaching ZERO
 * remaining notes (Yale Young Global Scholars, TechGirls, Student Science Training Program)
 * are excluded from the tally below on purpose: a row with zero notes showed NO badge under
 * the OLD code too (`eligible && eligibilityNotes` is falsy either way), so those three were
 * never part of the "badge doesn't change" problem CEO is asking about — they're the rows
 * that were ALREADY going to look right, with or without this fix.
 *
 * Usage: npx tsx scripts/eligibility-badge-recount-2026-09-05.ts
 */

export {};

import { computeEligibility, classifyEligibilityGap, type OpportunityForMatching, type StudentMatchProfile } from "../lib/opportunities/matching";

// A student profile with every axis known, so the ONLY notes computeEligibility can produce
// are the OPPORTUNITY-side ones (unverified / checked_not_stated) — isolating exactly the
// question this recount asks, matching docs/d2-visible-set-fill-2026-09-05.md's own
// methodology (it also evaluated the opportunity's own note set, not a specific student's).
const KNOWN_STUDENT: StudentMatchProfile = {
  age: 17,
  country: "United States",
  interests: [],
  weakestDimensions: [],
  citizenshipCountries: ["United States"],
  graduationYear: new Date().getFullYear() + 1,
};

function opp(overrides: Partial<OpportunityForMatching>): OpportunityForMatching {
  return {
    category: "summer_program",
    minimumAge: null,
    maximumAge: null,
    eligibleCountries: [],
    fields: [],
    country: null,
    ...overrides,
  };
}

interface Row {
  name: string;
  /** Which document/line justifies this row's final state. */
  source: string;
  opportunity: OpportunityForMatching;
  uncertain?: boolean;
}

// Two file constants matching the SQL files' own values, so a row's basis field reads the
// same literal string the migration would actually write.
const CNS = "checked_not_stated";

const ROWS: Row[] = [
  {
    name: "Wharton Global HS Investment Competition",
    source: "file2 age+country CNS; grade already on file per file2's own comment (9-12)",
    opportunity: opp({ eligibleGrades: ["9", "10", "11", "12"], ageEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "Breakthrough Junior Challenge",
    source: "file2 grade CNS; age/country not addressed anywhere found",
    opportunity: opp({ gradeEligibilityBasis: CNS }),
    uncertain: true,
  },
  {
    name: "LaunchX",
    source: "file2 country CNS; yesterday's D2 doc lists ONLY country as this row's gap (age/grade implicitly already fine)",
    opportunity: opp({ countryEligibilityBasis: CNS }),
  },
  {
    name: "Harvard Pre-Collegiate Economics Challenge (HPEC)",
    source: "file2 age+grade+country all CNS (\"rules not posted yet\" covers every criterion)",
    opportunity: opp({ ageEligibilityBasis: CNS, gradeEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "BRI Student Fellowship",
    source: "file2 country CNS; yesterday's D2 doc confirms age 15-18 AND grade 11-12 both explicitly confirmed already",
    opportunity: opp({ minimumAge: 15, maximumAge: 18, eligibleGrades: ["11", "12"], countryEligibilityBasis: CNS }),
  },
  {
    name: "The Earth Prize Competition",
    source: "file1 age added (13-19, real value); grade/country not addressed by either file — this is one of the 24, NOT one of the 3 fully-clean rows the fill doc itself names, so grade/country must still be genuinely open per that doc's own tally",
    opportunity: opp({ minimumAge: 13, maximumAge: 19 }),
  },
  {
    name: "Istanbul Bilgi University HS Summer School",
    source: "file2 age+country CNS; yesterday's D2 doc confirms grade 9-12 already confirmed",
    opportunity: opp({ eligibleGrades: ["9", "10", "11", "12"], ageEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "ODTU (METU) Engineering Summer School",
    source: "file2 country CNS; yesterday's D2 doc confirms age/grade already correctly stored (15-18, grades 10-12)",
    opportunity: opp({ minimumAge: 15, maximumAge: 18, eligibleGrades: ["10", "11", "12"], countryEligibilityBasis: CNS }),
  },
  {
    name: "DECA Competitive Events Program",
    source: "file2 age+grade CNS; country not addressed anywhere found",
    opportunity: opp({ ageEligibilityBasis: CNS, gradeEligibilityBasis: CNS }),
    uncertain: true,
  },
  {
    name: "Schoolhouse.world Tutor Certification",
    source: "file2 grade CNS; age already on file per file2's own comment (13, no maximum); country not addressed anywhere found",
    opportunity: opp({ minimumAge: 13, gradeEligibilityBasis: CNS }),
    uncertain: true,
  },
  {
    name: "The Duke of Edinburgh's International Award - Turkiye",
    source: "file2 grade CNS; age/country not addressed anywhere found",
    opportunity: opp({ gradeEligibilityBasis: CNS }),
    uncertain: true,
  },
  {
    name: "New York Times Audio Stories Podcast Contest",
    source: "file2's own header: nytimes.com blocked outright, no SQL for any dimension -- confirmed untouched",
    opportunity: opp({}),
  },
  {
    name: "STEM Fellowship Journal",
    source: "file2's own header: HTTP 403, no SQL for any dimension -- confirmed untouched",
    opportunity: opp({}),
  },
  {
    name: "Interlochen Review",
    source: "file1 grade added (9-12, real value) + country_eligibility_confirmed_open explicitly set FALSE (not open, not a basis); file2 age CNS. Country has confirmed_open=false but no basis, so it still reads as unverified.",
    opportunity: opp({ eligibleGrades: ["9", "10", "11", "12"], countryEligibilityConfirmedOpen: false, ageEligibilityBasis: CNS }),
  },
  {
    name: "Purdue University (Think Summer)",
    source: "file1 age added (min 15, real value; file2's own comment confirms this fully resolves age, no CNS needed); file2 grade+country CNS",
    opportunity: opp({ minimumAge: 15, gradeEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "The Wall Street 101 Summer Pre-College Program",
    source: "file1 grade added (11-12, real value); file2 age+country CNS",
    opportunity: opp({ eligibleGrades: ["11", "12"], ageEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "Young Guru Academy (YGA)",
    source: "file2 age+grade+country all CNS (\"reachable and silent\", confirmed across all three)",
    opportunity: opp({ ageEligibilityBasis: CNS, gradeEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "Dive Into Engineering! (USC)",
    source: "file2 age CNS; grade/country not addressed anywhere found",
    opportunity: opp({ ageEligibilityBasis: CNS }),
    uncertain: true,
  },
  {
    name: "UCSB Research Mentorship Programs",
    source: "file2 age+grade CNS; file2's own comment claims country already resolved by a prior session's citizenship-restrictions cleanup",
    opportunity: opp({ ageEligibilityBasis: CNS, gradeEligibilityBasis: CNS, countryEligibilityConfirmedOpen: true }),
    uncertain: true,
  },
  {
    name: "University of Applied Sciences Western Switzerland",
    source: "file2 grade CNS; age already on file per file2's own comment (15-17); file2's OTHER file explicitly leaves country untouched (visa-cost mention is not a policy statement, no SQL)",
    opportunity: opp({ minimumAge: 15, maximumAge: 17, gradeEligibilityBasis: CNS }),
  },
  {
    name: "InvestIN - Immersive Career Experiences",
    source: "file2's own header: grade genuinely ambiguous (bundled programs) and country genuinely incomplete (unfetched page) -- explicitly no SQL for either, and no CNS or real value for age either",
    opportunity: opp({}),
  },
  {
    name: "JA Company Programme (Europe)",
    source: "file2 grade+country CNS; yesterday's D2 doc confirms age 15-18 already confirmed",
    opportunity: opp({ minimumAge: 15, maximumAge: 18, gradeEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "International Economics Olympiad (IEO)",
    source: "file2 grade+country CNS; age resolved by an earlier, separate pass per yesterday's D2 doc",
    opportunity: opp({ minimumAge: 15, maximumAge: 20, gradeEligibilityBasis: CNS, countryEligibilityBasis: CNS }),
  },
  {
    name: "Girl Up Project Awards",
    source: "file2's own header: HTTP 403, no SQL for any dimension -- confirmed untouched",
    opportunity: opp({}),
  },
];

function badgeFor(gap: ReturnType<typeof classifyEligibilityGap>, hasAnyNote: boolean): string {
  if (!hasAnyNote) return "NO BADGE (fully resolved)";
  if (gap === "checked_not_stated") return "Checked, not stated (NEW, calm)";
  if (gap === "partially_known") return "Partly checked (NEW, cautious)";
  return "Eligibility unknown (UNCHANGED, old plain warning)";
}

let changed = 0;
let unchanged = 0;
let uncertainCount = 0;

console.log(`${ROWS.length} rows (of the visible-set's 27; the other 3 -- Yale Young Global`);
console.log(`Scholars, TechGirls, Student Science Training Program -- already reach zero notes`);
console.log(`and showed no badge under the old code either, so they're not part of this count):\n`);

for (const row of ROWS) {
  const result = computeEligibility(KNOWN_STUDENT, row.opportunity);
  const gap = classifyEligibilityGap(result.notes);
  const hasAnyNote = result.notes.length > 0;
  const badge = badgeFor(gap, hasAnyNote);
  const isChange = hasAnyNote && gap !== null; // null+hasAnyNote = unchanged old warning
  if (isChange) changed++;
  else unchanged++;
  if (row.uncertain) uncertainCount++;
  console.log(`${isChange ? "CHANGED  " : "UNCHANGED"} ${row.uncertain ? "[uncertain] " : ""}${row.name}`);
  console.log(`  -> ${badge}`);
  console.log(`  source: ${row.source}`);
}

console.log(`\n${changed} of ${ROWS.length} show a genuinely different badge after this fix.`);
console.log(`${unchanged} of ${ROWS.length} still show the old plain warning (real remaining gaps or fetch failures).`);
console.log(`${uncertainCount} of the ${changed} changed rows have at least one axis marked uncertain (absent from every`);
console.log(`source document found) -- conservatively assumed still unresearched, which can only`);
console.log(`undercount improvement, never overcount it.`);
