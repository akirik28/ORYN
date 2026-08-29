#!/usr/bin/env node
/**
 * Scoped enrich-apply for the Priority-20 package's 19 existing-opportunity matches. Unlike
 * lib/opportunities/ingest.ts (insert-only), this uses lib/opportunities/monotonic-guard.ts
 * per-field so an already-populated value is never regressed by a pass that simply couldn't
 * re-confirm it (RULE-INGEST-003). Every field is checked against a FRESH read of the live row
 * immediately before writing, not the snapshot from the earlier dry-run.
 *
 * Per CEO's explicit rulings on 2026-08-23:
 * - AMC/AIME/USAMO (4ce6fd8f...): deadline/cycle fields only. NO eligibility field is
 *   proposed at all (not held, not skipped -- simply never in this record's proposal), so the
 *   row's honest "not verified" eligibility state is preserved rather than obscured by
 *   recording a conflict as if it were a value.
 * - CJSJ (e0e1584c...) and Harvard CURE (9b93f1ce...): `category` is never proposed --
 *   CEO kept both at their live values (research / summer_program respectively) rather than
 *   changing either to match RESEARCH's implicit categorization.
 *
 * `country_eligibility_confirmed_open` and `eligible_countries` are boolean/array fields, not
 * covered by checkFieldMonotonicity (string-only) -- handled by hand below with the same
 * spirit: only ever false->true, never touched if already true, and only when
 * eligible_countries is currently empty (the CHECK constraint
 * opportunities_confirmed_open_no_structured_restriction requires this).
 *
 * `cost` is numeric, same treatment: only populate when live is null.
 *
 * Any field where live and proposed are both populated and different is a HOLD, reported but
 * NOT written -- these are judgment calls (e.g. cycle_status "closed" vs "date_not_announced"
 * for a program between cycles) that need an explicit human ruling, not a default.
 *
 * Usage: npx tsx scripts/apply-priority20-enrich-2026-08-23.ts [--apply]
 */
import { checkFieldMonotonicity } from "../lib/opportunities/monotonic-guard";
import { domainOf } from "../lib/acquisition/source-authority";

try {
  process.loadEnvFile(".env.local");
} catch {}

const TODAY = "2026-08-23T00:00:00Z";
const RESEARCH_SOURCE_TYPE = "official_primary";
const RESEARCH_CONFIDENCE = "high" as const;

interface Proposal {
  id: string;
  label: string;
  sourceUrl: string;
  fields: Partial<{
    deadline: string;
    cycle_status: string;
    current_cycle_label: string;
    citizenship_restrictions: string;
    residency_restrictions: string;
    official_url: string;
    application_url: string;
    verification_state: string;
    country: string;
  }>;
  cost?: number;
  confirmedOpen?: boolean; // only ever proposes true
  cycleStatusVocabulary?: ReadonlySet<string>;
}

const CYCLE_STATUS_VOCAB = new Set(["open", "upcoming", "closed", "date_not_announced", "historical", "discontinued", "unverified"]);
const VERIFICATION_STATE_VOCAB = new Set(["verified_current", "verified_historical", "verified_derived", "unverified", "conflicting"]);
const PLACEHOLDER_CYCLE_STATUS = new Set(["unverified"]);
const PLACEHOLDER_VERIFICATION_STATE = new Set(["unverified"]);

const PROPOSALS: Proposal[] = [
  {
    id: "2e2f995a-2ac3-4138-a3df-ca4e4033aa36",
    label: "Wharton Global High School Investment Competition",
    sourceUrl: "https://globalyouth.wharton.upenn.edu/competitions/investment-competition/",
    fields: {},
  },
  {
    id: "0412d94f-8b28-4f37-933c-cf6198914c12",
    label: "Breakthrough Junior Challenge",
    sourceUrl: "https://breakthroughjuniorchallenge.org/rules",
    fields: {},
  },
  {
    id: "e0e1584c-5d96-41d6-a3a0-a62eaffa37d6",
    label: "Columbia Junior Science Journal (CJSJ)",
    sourceUrl: "http://columbiajuniorsciencejournal.org/submit",
    fields: {
      deadline: "2026-09-30",
      cycle_status: "open",
      current_cycle_label: "2026-27 volume, submissions open",
      verification_state: "verified_current",
    },
    confirmedOpen: true, // official FAQ: "High school students from anywhere in the world are welcome"
    cycleStatusVocabulary: CYCLE_STATUS_VOCAB,
  },
  {
    id: "4ce6fd8f-5a9b-4399-b168-e38c0f44c7b1",
    label: "AMC - AIME (AMC/AIME/USAMO pathway)",
    sourceUrl: "https://maa.org/maa-invitational-competitions/",
    fields: {
      // CEO ruling: deadline/cycle only. No eligibility field proposed at all.
      deadline: "2026-10-15",
      cycle_status: "upcoming",
      current_cycle_label: "2026-27 cycle: AMC 10A/12A Nov 5 2026, AMC 10B/12B Nov 13 2026, AMC 8 window Jan 21-27 2027",
    },
    cycleStatusVocabulary: CYCLE_STATUS_VOCAB,
  },
  {
    id: "1f7b2e52-1900-4953-8271-63224c9e1fc0",
    label: "Conrad Challenge (Space Center Houston)",
    sourceUrl: "https://conrad.spacecenter.org/",
    fields: {},
  },
  {
    id: "2bbea7da-09bb-4eca-b46b-c3b5363e3b92",
    label: "Rockefeller SSRP",
    sourceUrl: "https://www.rockefeller.edu/outreach/ssrp/",
    fields: {
      cycle_status: "date_not_announced", // live is "closed" -- may HOLD, that's correct, not auto-resolved
      current_cycle_label: "SSRP 2027 dates not yet posted; SSRP 2026 (concluded) deadline was Jan 2, 2026",
      verification_state: "verified_current",
    },
    cycleStatusVocabulary: CYCLE_STATUS_VOCAB,
  },
  {
    id: "ae174625-5ad8-41b7-9c9a-7f00710c168a",
    label: "Summer Science Program (SSP)",
    sourceUrl: "https://ssp.org/",
    fields: {
      current_cycle_label: "SSP 2027 not yet open; Interest Form only as of 2026-08-23",
    },
  },
  {
    id: "8f0a8a3f-6c12-4277-91ca-7d120222b231",
    label: "Stanford SIMR",
    sourceUrl: "https://simr.stanford.edu/",
    fields: {
      citizenship_restrictions: "Must be a U.S. citizen or permanent resident with a green card; must currently live in and attend high school in the U.S. Not open to international applicants.",
      current_cycle_label: "Summer 2027 cycle confirmed live; exact application deadline stated only as 'late February 2027' as of 2026-08-23",
    },
  },
  {
    id: "bdc4bdb5-5893-4e05-bf9c-e520d7da2817",
    label: "Pioneer Academics / Pioneer Research Institute",
    sourceUrl: "https://pioneeracademics.com/pioneer-research-institute/",
    fields: {},
  },
  {
    id: "4fe18f68-5aac-46a1-b8a0-65a82ca4248d",
    label: "Anson L. Clark Scholars Program",
    sourceUrl: "https://www.depts.ttu.edu/clarkscholars/",
    fields: {
      current_cycle_label: "2027 cycle not yet announced; 2026 cohort concluded, applications closed",
    },
  },
  {
    id: "7aa518f8-3ba5-4de9-b61c-7538fc41957b",
    label: "SIP (UC Santa Cruz)",
    sourceUrl: "https://sip.ucsc.edu/",
    fields: {
      current_cycle_label: "SIP 2027 not yet announced; SIP 2026 concluded Aug 8, 2026",
    },
  },
  {
    id: "418217ec-65af-494a-bf4f-370c0b6f070c",
    label: "Secondary Student Training Program (SSTP, U Iowa)",
    sourceUrl: "https://belinblank.education.uiowa.edu/students/sstp/",
    fields: {
      current_cycle_label: "SSTP 2027 not yet announced; SSTP 2026 concluded, live deadline field is the historical 2026 date",
    },
  },
  {
    id: "142a6597-6083-45ba-b9ea-6b92e4a2ab55",
    label: "UF SSTP (Student Science Training Program)",
    sourceUrl: "https://cpet.ufl.edu/students/uf-cpet-summer-programs/student-science-training-program/",
    fields: {
      citizenship_restrictions: "Non-Florida and international students may apply, but compete for a limited number of capped seats designated for non-Florida high schools. Financial aid restricted to Florida-high-school students.",
      current_cycle_label: "2027 cycle not yet announced; 2026 concluded July 25, 2026",
    },
  },
  {
    id: "9b93f1ce-9114-4a2e-96b7-2823f6145d21",
    label: "Harvard CURE Initiative to Eliminate Cancer Disparities",
    sourceUrl: "https://www.dfhcc.harvard.edu/research/cancer-disparities/students/cure-overview/",
    fields: {
      // category deliberately NOT proposed -- CEO ruling, keep live summer_program.
      citizenship_restrictions: "Must be a U.S. citizen or permanent resident who can provide an I-551 card number (federal funding requirement).",
      residency_restrictions: "Must reside in and/or attend school in Massachusetts and be able to travel to the Longwood Medical Area in Boston five days a week.",
      current_cycle_label: "CURE Summer 2027 applications open Fall 2026; exact deadline not yet published",
    },
  },
  {
    id: "00aaf965-016f-42ef-a4a1-3a825f104a6d",
    label: "The Earth Prize",
    sourceUrl: "https://www.theearthprize.org",
    fields: {},
    confirmedOpen: true, // official FAQ: "open to teenage students... worldwide"
  },
  {
    id: "30a605ab-8c51-4f06-9e66-60cc7347c5df",
    label: "The Diamond Challenge",
    sourceUrl: "https://diamondchallenge.org/competition/",
    fields: {},
  },
  {
    id: "cb4a1030-d035-4c1f-8579-37c458a88b0e",
    label: "Blue Ocean Student Entrepreneur Competition",
    sourceUrl: "https://blueoceancompetition.org/",
    fields: {},
  },
  {
    id: "c582f1d9-ec28-4335-acd0-4140893dd23f",
    label: "The Harvard Crimson Global Essay Competition (HCGEC)",
    sourceUrl: "https://www.essaycomp.org/",
    fields: {
      // Two real deadlines exist (early-bird Dec 15 2026 $15, regular Jan 31 2027 $20); this
      // table has one deadline column. Proposing the LATER (regular) date as the structured
      // deadline -- it is the actual final closing date, not just a discount cutoff -- with
      // both dates preserved in current_cycle_label so the early-bird nuance isn't lost.
      deadline: "2027-01-31",
      cycle_status: "open",
      current_cycle_label: "Early-bird registration $15 closes Dec 15, 2026; regular registration $20 closes Jan 31, 2027 (2027 cycle)",
      verification_state: "verified_current",
    },
    confirmedOpen: true, // official site: "Accessible to students in every country with no geographical barriers"
    cycleStatusVocabulary: CYCLE_STATUS_VOCAB,
  },
  {
    id: "104c940f-f3fa-46c9-9e52-2abf69e360d4",
    label: "JLI Global Essay Competition",
    sourceUrl: "https://www.johnlockeinstitute.com/essay-competition",
    fields: {
      cycle_status: "date_not_announced", // live is "closed" (2026 cycle) -- may HOLD, correct
      current_cycle_label: "2027 cycle not yet open for registration as of 2026-08-23; 2026 cycle's own submissions closed May 31, 2026",
    },
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let totalWrites = 0;
  let totalHolds = 0;

  for (const proposal of PROPOSALS) {
    const { data: live, error } = await admin
      .from("opportunities")
      .select("id,title,deadline,cycle_status,current_cycle_label,citizenship_restrictions,residency_restrictions,official_url,application_url,verification_state,country,cost,eligible_countries,country_eligibility_confirmed_open,last_verified_at,verified_at")
      .eq("id", proposal.id)
      .single();
    if (error || !live) {
      console.error(`FAILED to read live row for ${proposal.label} (${proposal.id}): ${error?.message}`);
      continue;
    }

    console.log(`\n=== ${proposal.label} (${proposal.id.slice(0, 8)}) ===`);
    const update: Record<string, unknown> = {};

    for (const [field, proposedValue] of Object.entries(proposal.fields)) {
      const decision = checkFieldMonotonicity(proposal.id, field, (live as Record<string, unknown>)[field] as string | null, proposedValue as string, {
        validVocabulary: field === "cycle_status" ? proposal.cycleStatusVocabulary : field === "verification_state" ? VERIFICATION_STATE_VOCAB : undefined,
        placeholderLiveValues: field === "cycle_status" ? PLACEHOLDER_CYCLE_STATUS : field === "verification_state" ? PLACEHOLDER_VERIFICATION_STATE : undefined,
      });
      console.log(`  ${field}: ${decision.action.toUpperCase()} -- ${decision.reason}`);
      if (decision.action === "write") update[field] = decision.proposedValue;
      if (decision.action === "hold") totalHolds += 1;
    }

    // cost: numeric, populate-only-if-empty (same spirit as monotonic-guard, hand-rolled since
    // the guard is string-typed).
    if (proposal.cost !== undefined) {
      if (live.cost === null || live.cost === undefined) {
        update.cost = proposal.cost;
        console.log(`  cost: WRITE -- live empty, populating with ${proposal.cost}`);
      } else if (Number(live.cost) === proposal.cost) {
        update.cost = proposal.cost;
        console.log(`  cost: WRITE -- idempotent refresh (already ${proposal.cost})`);
      } else {
        totalHolds += 1;
        console.log(`  cost: HOLD -- live=${live.cost}, proposed=${proposal.cost}, both populated and different`);
      }
    }

    // country_eligibility_confirmed_open: boolean, only false->true, only when
    // eligible_countries is currently empty (CHECK constraint).
    if (proposal.confirmedOpen) {
      const ecCount = Array.isArray(live.eligible_countries) ? live.eligible_countries.length : 0;
      if (live.country_eligibility_confirmed_open === true) {
        console.log(`  country_eligibility_confirmed_open: SKIP -- already true`);
      } else if (ecCount > 0) {
        totalHolds += 1;
        console.log(`  country_eligibility_confirmed_open: HOLD -- eligible_countries has ${ecCount} entries live; CHECK constraint forbids setting confirmed_open=true alongside a structured list. Needs a human decision (which is correct?).`);
      } else {
        update.country_eligibility_confirmed_open = true;
        console.log(`  country_eligibility_confirmed_open: WRITE -- false -> true, eligible_countries empty, official source confirms worldwide-open`);
      }
    }

    // last_verified_at / verified_at: always refresh forward -- freshness timestamps are not
    // subject to RULE-INGEST-003 (a later verification pass IS more informative by
    // construction, regardless of the timestamp's own prior value).
    update.last_verified_at = TODAY;
    update.verified_at = TODAY;

    const writeCount = Object.keys(update).length - 2; // exclude the two timestamp fields from the "content write" count
    console.log(`  -> ${writeCount} content field(s) + timestamps to write.`);
    totalWrites += writeCount;

    if (!apply) continue;

    const { error: updateError } = await admin.from("opportunities").update(update).eq("id", proposal.id);
    if (updateError) {
      console.error(`  FAILED to update: ${updateError.message}`);
      continue;
    }
    const { error: sourceError } = await admin.from("opportunity_sources").insert({
      opportunity_id: proposal.id,
      source_url: proposal.sourceUrl,
      source_domain: domainOf(proposal.sourceUrl),
      source_type: RESEARCH_SOURCE_TYPE,
      confidence: RESEARCH_CONFIDENCE,
      retrieved_at: TODAY,
    });
    if (sourceError) console.error(`  opportunity updated but source provenance row failed: ${sourceError.message}`);
  }

  console.log(`\n\nTOTAL: ${totalWrites} content field-writes across ${PROPOSALS.length} records, ${totalHolds} held for human review.`);
  console.log(apply ? "APPLIED." : "DRY RUN — nothing written. Re-run with --apply to write.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
