import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity, OpportunityCategory } from "@/types/database";
import { canonicalCountryKey, isSameCountry } from "./matching";
import { isOpportunityActionable, NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES } from "./lifecycle";

/** Package 8: the two ways isOpportunityActionable returns false need different wording — a
 * row whose cycle_status is still e.g. "open" but whose deadline has quietly passed must
 * never be described as "current cycle is open", which would flatly contradict the
 * eligible: false this same branch sets right alongside it. */
function nonActionableEligibilityNote(opportunity: Pick<Opportunity, "cycle_status" | "deadline">): string {
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    return `This opportunity's current cycle is ${opportunity.cycle_status.replace(/_/g, " ")}.`;
  }
  return "This opportunity's application deadline has passed.";
}

export interface OpportunityBrowseFilters {
  q?: string;
  category?: OpportunityCategory;
  country?: string;
  remoteOnly?: boolean;
  freeOnly?: boolean;
  cycleStatus?: Opportunity["cycle_status"];
}

export interface OpportunityBrowseRow {
  opportunity: Opportunity;
  matchScore: number;
  eligible: boolean;
  eligibilityNotes: string | null;
  reasonCodes: string[];
}

const PAGE_SIZE = 24;

/**
 * The full active catalog, filtered and paginated — distinct from the "For you" view
 * (app/(app)/opportunities/page.tsx's default), which is a fixed top-30 eligible slice.
 * Still joins this student's own opportunity_matches (refreshOpportunityMatches computes
 * one row per active opportunity per user, cheaply, on every page view — see
 * lib/opportunities/persist-matches.ts) rather than showing a Browse mode with no
 * personalization at all: even "see everything" should surface the better fits first,
 * per the product's own "prioritize, don't dump" principle. Ineligible opportunities are
 * still included (a Browse/Discover surface shouldn't silently narrow what a student can
 * see), just flagged with the real `eligibility_notes` rather than hidden.
 */
export async function browseOpportunities(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: OpportunityBrowseFilters,
  page: number
): Promise<{ rows: OpportunityBrowseRow[]; total: number; pageSize: number }> {
  let query = supabase.from("opportunities").select("*").eq("status", "active");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.remoteOnly) query = query.eq("remote_allowed", true);
  if (filters.freeOnly) query = query.or("cost.is.null,cost.eq.0");
  if (filters.cycleStatus) query = query.eq("cycle_status", filters.cycleStatus);

  const { data } = await query;
  let opportunities = data ?? [];

  // Country also runs as an application-code filter rather than `.eq("country", ...)`:
  // opportunities.country is free text, and the same real country can be spelled multiple
  // ways ("Turkey" / "Türkiye" — confirmed live). isSameCountry is the one equivalence rule
  // the "For you" matching path already uses for eligibility (lib/opportunities/matching.ts);
  // reusing it here means a student filtering Browse-all sees the same country boundary
  // "For you" already drew, instead of a second rule that could silently disagree with it.
  if (filters.country) {
    const selected = filters.country;
    opportunities = opportunities.filter((o) => o.country && isSameCountry(o.country, selected));
  }

  // Free text runs as an application-code filter, not a DB `.or()` clause: PostgREST's
  // `.or()` filter string is a comma-delimited DSL, and a student's own search text can
  // contain commas/parens that would corrupt it if spliced straight in. The catalog is
  // small today (dozens, not the university registry's 1000+), so filtering a bounded
  // fetch in TS is cheap and avoids the escaping problem entirely — the same call
  // lib/entities/search.ts's searchOpportunities already made, and for the same reason.
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    opportunities = opportunities.filter(
      (o) => o.title.toLowerCase().includes(q) || (o.organization ?? "").toLowerCase().includes(q)
    );
  }

  const total = opportunities.length;
  if (opportunities.length === 0) return { rows: [], total, pageSize: PAGE_SIZE };

  const { data: matches } = await supabase
    .from("opportunity_matches")
    .select("opportunity_id, match_score, eligible, eligibility_notes, reason_codes")
    .eq("user_id", userId)
    .in(
      "opportunity_id",
      opportunities.map((o) => o.id)
    );
  const matchByOpportunityId = new Map((matches ?? []).map((m) => [m.opportunity_id, m]));

  const rows: OpportunityBrowseRow[] = opportunities.map((opportunity) => {
    const match = matchByOpportunityId.get(opportunity.id);
    if (match) {
      return {
        opportunity,
        matchScore: match.match_score,
        eligible: match.eligible,
        eligibilityNotes: match.eligibility_notes,
        reasonCodes: (match.reason_codes as string[] | null) ?? [],
      };
    }

    // Package 8 fix: no opportunity_matches row exists for this student/opportunity pair.
    // The previous fallback (eligible: true, notes: null) asserted a confirmed match that
    // was never actually computed — "absence of a computed answer" rendering as "eligible,
    // no restrictions" is exactly the failure this product can't afford (AGENTS.md Phase 68).
    // A missing row has one of two causes, and they're different facts:
    //  - the opportunity isn't currently actionable (cycle_status closed/historical/
    //    discontinued, or its deadline has passed) — refreshOpportunityMatches deliberately
    //    never computes a match for these (lib/opportunities/lifecycle.ts), so no future
    //    refresh creates one either. This is a KNOWN fact already on the row, matching
    //    lib/counselor/eligibility.ts's own classification of the identical case as
    //    known_ineligible, not "unknown".
    //  - the match genuinely hasn't been computed yet (e.g. refreshOpportunityMatches
    //    couldn't run this render — SUPABASE_SECRET_KEY unset, see its own docstring).
    //    Verified against oryn-qa-scratch (2026-08-22): 0 of 271 active opportunities hit
    //    this case for a student who has loaded the page at least once — the live gap
    //    (72 rows) is entirely the first case — but the code must not assume that stays true.
    const actionable = isOpportunityActionable(opportunity);
    return {
      opportunity,
      matchScore: 0,
      eligible: actionable,
      eligibilityNotes: actionable
        ? "Eligibility hasn't been checked for this opportunity yet."
        : nonActionableEligibilityNote(opportunity),
      reasonCodes: [],
    };
  });

  // Sorted in application code, not SQL: match_score lives on a separate per-user table
  // joined in above, not a column `opportunities` itself can `.order()` by.
  rows.sort((a, b) => b.matchScore - a.matchScore);

  const start = (page - 1) * PAGE_SIZE;
  return { rows: rows.slice(start, start + PAGE_SIZE), total, pageSize: PAGE_SIZE };
}

export interface OpportunityFacets {
  categoryCounts: { category: OpportunityCategory; count: number }[];
  countries: { country: string; count: number }[];
}

/**
 * Real, current option lists for the filter bar — never a fixed aspirational list. With
 * 11 active opportunities live today, offering e.g. "Turkey" as a country filter before
 * any Turkish opportunity is ingested would return an honest-but-pointless empty grid;
 * deriving options from what's actually in the table means the filter bar's coverage
 * grows automatically as the acquisition pipeline adds more (AGENTS.md Phase 11/38
 * territory — this file doesn't touch that pipeline, only reads its output). Category
 * counts *do* include zero-count categories (the taxonomy itself is fixed schema, not
 * derived), so a still-empty category reads as "nothing here yet", not "doesn't exist".
 */
export async function getOpportunityFacets(supabase: SupabaseClient<Database>): Promise<OpportunityFacets> {
  const { data } = await supabase.from("opportunities").select("category, country").eq("status", "active");
  const rows = data ?? [];

  const ALL_CATEGORIES: OpportunityCategory[] = [
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
    "conference",
    "student_program",
  ];
  const categoryCounts = ALL_CATEGORIES.map((category) => ({
    category,
    count: rows.filter((r) => r.category === category).length,
  }));

  // Grouped by canonical country key (the same equivalence rule the "For you" matching path
  // uses), not the raw string — otherwise one real country spelled two ways in the data
  // ("Turkey" / "Türkiye") shows as two options, and picking either one only ever surfaces
  // half the real matches. Each bucket still needs a single display string; rather than
  // hardcoding a preferred spelling per country, this picks whichever raw spelling is most
  // common within that bucket (ties broken alphabetically, for determinism), so the label
  // reflects the data rather than an assumption baked into this function.
  const countryBuckets = new Map<string, { count: number; labelCounts: Map<string, number> }>();
  for (const row of rows) {
    if (!row.country) continue;
    const key = canonicalCountryKey(row.country);
    const bucket = countryBuckets.get(key) ?? { count: 0, labelCounts: new Map<string, number>() };
    bucket.count += 1;
    bucket.labelCounts.set(row.country, (bucket.labelCounts.get(row.country) ?? 0) + 1);
    countryBuckets.set(key, bucket);
  }
  const countries = [...countryBuckets.values()]
    .map(({ count, labelCounts }) => {
      const [label] = [...labelCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return { country: label, count };
    })
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));

  return { categoryCounts, countries };
}
