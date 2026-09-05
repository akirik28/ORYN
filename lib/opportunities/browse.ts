import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity, OpportunityCategory } from "@/types/database";
import { canonicalCountryKey, isSameCountry, type EligibilityNote, type EligibilityGapKind } from "./matching";
import { INSUFFICIENT_VERIFICATION_REASON, isOpportunitySufficientlyVerified, resolveStoredEligibility } from "./lifecycle";

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
  /** See classifyEligibilityGap (matching.ts) / ResolvedEligibility (lifecycle.ts) — which of
   * two specific "unknown" situations eligibilityNotes represents, so the card can give the
   * student-fixable case (profile_incomplete) its own non-alarming, actionable treatment. */
  eligibilityGap: EligibilityGapKind | null;
  /** Distinguishes "this cycle isn't open" from "you don't qualify" — see ResolvedEligibility
   * in lib/opportunities/lifecycle.ts for why the card must not conflate the two. */
  notActionable: boolean;
  /** A third, distinct state: Oryn has no evidence either way (no deadline on file and no
   * record of ever verifying it). Never an eligibility claim and never a closure claim — see
   * isOpportunitySufficientlyVerified. Drives the card's "Needs verification" badge and the
   * demotion below, but never hides the row. */
  needsVerification: boolean;
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

    // Both branches below run through the same read-time lifecycle gate, because both can
    // assert eligibility that the opportunity's own current state contradicts:
    //
    //  - A STORED row (Package 9 fix). Its `eligible` was computed at some earlier moment and
    //    refreshOpportunityMatches deliberately never deletes it once the opportunity stops
    //    being actionable (lib/opportunities/persist-matches.ts), so `eligible: true` written
    //    before a cycle closed simply persists. Reading it verbatim is what let a closed or
    //    long-past-deadline opportunity render as a "Strong match" — 74 opportunities across
    //    259 pairs live on 2026-08-23. This branch previously had no lifecycle check at all
    //    while the no-match branch below did, which is precisely why the stale flag won.
    //
    //  - A MISSING row (Package 8 fix). The original fallback (eligible: true, notes: null)
    //    asserted a confirmed match that was never computed — "absence of a computed answer"
    //    rendering as "eligible, no restrictions" is the failure this product can't afford
    //    (AGENTS.md Phase 68). A missing row has two causes: the opportunity isn't actionable
    //    (refreshOpportunityMatches never computes a match for these, so no future refresh
    //    creates one either — a KNOWN fact, matching lib/counselor/eligibility.ts's own
    //    known_ineligible classification), or the match genuinely hasn't been computed yet
    //    (e.g. the admin client was unavailable this render — see refreshOpportunityMatches's
    //    docstring). Verified against oryn-qa-scratch (2026-08-22): 0 of 271 active
    //    opportunities hit the second case for a student who has loaded the page at least
    //    once, but the code must not assume that stays true.
    //
    // Expressing both through resolveStoredEligibility keeps one lifecycle rule in this file
    // rather than two that can drift — the drift that caused this bug and #140's.
    // Locale omitted -- resolveStoredEligibility's own English default, matching this file's
    // established precedent (matching.ts's own header names browse.ts as deliberately outside
    // an earlier i18n pass's scope). "Not yet computed" is now `not_yet_computed`, one of
    // EligibilityNoteCode's own values (browse.ts's own fallback, not a real
    // computeEligibility finding), rendered through the same pipeline as every stored code
    // rather than a hand-typed string outside it.
    const stored = match
      ? { eligible: match.eligible, notes: (match.eligibility_notes as EligibilityNote[] | null) ?? [] }
      : { eligible: true, notes: [{ code: "not_yet_computed" }] as EligibilityNote[] };
    const { eligible, notes, notActionable, eligibilityGap } = resolveStoredEligibility(opportunity, stored);

    // The freshness gate DEMOTES here rather than excluding, unlike the counselor's ranked
    // recommendations. Browse is the "see everything" surface and deliberately keeps even
    // ineligible rows visible (see this function's docstring) — hiding a row would tell a
    // student the opportunity doesn't exist, a worse claim than the one being fixed, and the
    // student may well know more about it than Oryn does. So the row keeps its place in the
    // catalogue, loses its confidence tier on the card, and sorts below every confident row.
    //
    // Deliberately does NOT touch `eligible`: that column drives "Not eligible" wording, and
    // this is a fact about Oryn's evidence, not about the student. Only annotated when the row
    // is otherwise fine — a closed cycle or passed deadline is a stronger, more specific fact
    // and keeps its own #140/#141 wording rather than being described as merely unverified.
    const needsVerification = eligible && !notActionable && !isOpportunitySufficientlyVerified(opportunity);

    return {
      opportunity,
      matchScore: match?.match_score ?? 0,
      eligible,
      // Appended, not substituted, when a stored note already exists: the two say different
      // things (that one is about this student, this one is about our data), and a card badged
      // "Needs verification" whose only prose is "Restricted by country" leaves the badge
      // unexplained.
      eligibilityNotes: needsVerification ? [notes, INSUFFICIENT_VERIFICATION_REASON].filter(Boolean).join(" ") : notes,
      eligibilityGap,
      notActionable,
      needsVerification,
      reasonCodes: (match?.reason_codes as string[] | null) ?? [],
    };
  });

  // Sorted in application code, not SQL: match_score lives on a separate per-user table
  // joined in above, not a column `opportunities` itself can `.order()` by. Rows Oryn can't
  // vouch for sort below every row it can, regardless of score — a 95% match on a record
  // nobody has verified shouldn't outrank a 40% match on one that's confirmed current.
  //
  // FIXED 2026-09-02 (docs/opportunity-deadline-coverage-2026-09-02.md): that was always the
  // stated intent of this comment, but the code only demoted `needsVerification`.
  // `needsVerification` requires `eligible === true` (its own definition, above), and a
  // `notActionable` row is `eligible: false` by construction (resolveStoredEligibility) — so
  // a closed cycle or passed deadline landed `needsVerification: false` and sorted in the
  // SAME top bucket as a genuinely open, verified row, purely on match score. A closed
  // opportunity with a high score could outrank an open one with a lower score. The card
  // itself never lied (notActionable already renders the real reason), but the ranking did.
  // Demoting `notActionable` alongside `needsVerification` is the same shape the "For you"
  // view already achieves by excluding non-actionable rows outright (page.tsx's ForYouView) —
  // Browse still shows the row (it deliberately doesn't narrow what's visible), it just stops
  // outranking rows Oryn can actually vouch for.
  rows.sort(
    (a, b) =>
      Number(a.needsVerification || a.notActionable) - Number(b.needsVerification || b.notActionable) || b.matchScore - a.matchScore
  );

  const start = (page - 1) * PAGE_SIZE;
  return { rows: rows.slice(start, start + PAGE_SIZE), total, pageSize: PAGE_SIZE };
}

export interface OpportunityFacets {
  categoryCounts: { category: OpportunityCategory; count: number }[];
  countries: { country: string; count: number }[];
}

// Every OpportunityCategory value, kept in sync with types/database.ts by construction
// rather than by remembering to update a second list: a plain `OpportunityCategory[]` compiles
// fine whether it has 12 entries or 20, so a category added to the union and not to the array
// used to fail silently -- exactly what happened to "online_program" (2026-09-03, 6 active
// rows with no filter chip to reach them by). Record<OpportunityCategory, true> instead
// requires exactly one entry per union member: dropping or forgetting one is a compile error
// in *this* file, not a gap only discoverable by comparing a live count to a UI total. See
// __tests__/opportunities/browse-category-drift.test.ts for the same guarantee re-asserted as
// a runtime test, independent of whether anyone happens to run typecheck.
const CATEGORY_EXHAUSTIVENESS: Record<OpportunityCategory, true> = {
  competition: true,
  research: true,
  internship: true,
  summer_program: true,
  fellowship: true,
  scholarship: true,
  volunteering: true,
  entrepreneurship: true,
  hackathon: true,
  academic_program: true,
  online_program: true,
  conference: true,
  student_program: true,
};
export const ALL_CATEGORIES: OpportunityCategory[] = Object.keys(CATEGORY_EXHAUSTIVENESS) as OpportunityCategory[];

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
