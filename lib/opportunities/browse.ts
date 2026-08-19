import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity, OpportunityCategory } from "@/types/database";

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
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.remoteOnly) query = query.eq("remote_allowed", true);
  if (filters.freeOnly) query = query.or("cost.is.null,cost.eq.0");
  if (filters.cycleStatus) query = query.eq("cycle_status", filters.cycleStatus);

  const { data } = await query;
  let opportunities = data ?? [];

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
    return {
      opportunity,
      matchScore: match?.match_score ?? 0,
      eligible: match?.eligible ?? true,
      eligibilityNotes: match?.eligibility_notes ?? null,
      reasonCodes: (match?.reason_codes as string[] | null) ?? [],
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

  const countryTally = new Map<string, number>();
  for (const row of rows) {
    if (!row.country) continue;
    countryTally.set(row.country, (countryTally.get(row.country) ?? 0) + 1);
  }
  const countries = [...countryTally.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));

  return { categoryCounts, countries };
}
