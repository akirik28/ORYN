import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity } from "@/types/database";
import { isOpportunityRecommendable } from "./lifecycle";
import { competesInCoreRecommendations } from "./commercial";

/** The home page's rotating strip (founder dispatch 2026-09-03, "en iyi 5 fırsatın döndüğü
 * bir şey"). Distinct from OPPORTUNITY_PREVIEW_SIZE (app/(app)/dashboard/page.tsx) — that
 * block is a two-line text list kept deliberately small; this is the richer, full-card
 * surface the founder asked to replace it in prominence, not in place (both stay live; see
 * this module's own callers). */
export const HOME_STRIP_SIZE = 5;

/** Same over-fetch reasoning as OPPORTUNITY_PREVIEW_CANDIDATE_POOL one file over, scaled up:
 * that block needed 20 candidates to reliably survive down to 2 (worst measured case was 2
 * unrecommendable rows ahead of the first good one). Surviving down to 5 needs
 * proportionately more headroom, not the same fixed number — 30 keeps roughly the same
 * multiple of headroom-over-target (6x here vs 10x there; this block's own filters are a
 * strict subset of that one's, so a smaller multiple is not a smaller safety margin). */
export const HOME_STRIP_CANDIDATE_POOL = 30;

/** Below this many surviving cards, `OpportunityStrip` renders a static row instead of the
 * looping animation — see that component's own comment for why. Exported so the threshold
 * has exactly one definition, checkable in a test without rendering the component. */
export const MIN_CARDS_TO_ANIMATE = 3;

export function shouldAnimateStrip(cardCount: number): boolean {
  return cardCount >= MIN_CARDS_TO_ANIMATE;
}

export interface HomeStripOpportunity {
  id: string;
  title: string;
  organization: string | null;
  category: Opportunity["category"];
  imageUrl: string | null;
  deadline: string | null;
  cycleStatus: Opportunity["cycle_status"];
  currentCycleLabel: string | null;
  selectivityTier: Opportunity["selectivity_tier"];
  /** Whether opportunity_matches.eligibility_notes is non-empty for this match — see
   * lib/opportunities/matching.ts's computeEligibility for what can populate it. A presence
   * flag, not the rendered text (2026-09-03: this surface only ever shows a generic warning
   * badge on it, never the note's own content — see OpportunityStripCard's own render — so
   * there's nothing here that needs rendering into a locale at all, unlike every other reader
   * of this column). The only caveat this surface can ever show; see getHomeOpportunityStrip's
   * own comment on why needsVerification/notActionable are not part of this shape at all. */
  eligibilityNotes: boolean;
}

/** No `matchScore` here, deliberately -- docs/homepage-strip-top5-quality-2026-09-03.md
 * (a4's measurement against the real matching chain and live catalogue, three personas)
 * found every persona's real top-5 tied on `matchScore` and rendered the identical
 * "Exceptional match" tier label for a 14-year-old with a near-empty profile as for a
 * genuinely strong one -- the ranker doesn't yet distinguish "reachable now" from
 * "prestigious but currently unreachable," and this surface would otherwise put that
 * confident, unearned claim on the single most-visible slot in the app. That's a ranker
 * problem, out of scope for this build (CEO: "too big for tonight," going to the founder
 * separately) -- but this card must not amplify it in the meantime. `match_score` still
 * drives ranking/ordering upstream (the SQL `.order()` below, CandidateMatch in
 * selectHomeStripCandidates) -- only the OUTPUT shape a card can render from drops it, so
 * a future renderer can't casually reach for a number this doc already showed isn't a
 * trustworthy confidence claim on its own. */

/** No `reasonCodes`/generated reason sentence here, deliberately — this is a compact
 * preview surface (same register the dashboard's existing opportunityPreview list already
 * established: tier label + descriptors, no full "why" sentence), and every card links to
 * `/opportunities/[id]`, where the complete reasoning already lives. Adding the full
 * OpportunityCard reason sentence to a narrower, glanceable card would mean either
 * truncating it (readable as an unfinished thought) or widening the card past what a
 * five-wide rotating strip can hold. */

type CandidateMatch = { opportunity_id: string; match_score: number; eligibility_notes: unknown[] | null };

type CandidateOpportunity = Pick<
  Opportunity,
  | "id"
  | "title"
  | "organization"
  | "category"
  | "image_url"
  | "deadline"
  | "cycle_status"
  | "current_cycle_label"
  | "selectivity_tier"
  | "status"
  | "cost"
  | "last_verified_at"
  | "verified_at"
  | "source_verified_at"
>;

/** Pure — no I/O, so it's directly testable against plain fixtures rather than only through
 * a full Supabase round-trip. Mirrors app/(app)/dashboard/page.tsx's own opportunityPreview
 * pipeline (over-fetch, join, filter, THEN slice) for the identical reason that file's own
 * comment gives: filtering before slicing can empty the block even when plenty of eligible,
 * recommendable matches exist further down the ranked list. */
export function selectHomeStripCandidates(matches: CandidateMatch[], opportunities: CandidateOpportunity[]): HomeStripOpportunity[] {
  const byId = new Map(
    opportunities.filter((o) => isOpportunityRecommendable(o) && competesInCoreRecommendations(o)).map((o) => [o.id, o])
  );

  const result: HomeStripOpportunity[] = [];
  for (const match of matches) {
    const o = byId.get(match.opportunity_id);
    if (!o) continue;
    result.push({
      id: o.id,
      title: o.title,
      organization: o.organization,
      category: o.category,
      imageUrl: o.image_url,
      deadline: o.deadline,
      cycleStatus: o.cycle_status,
      currentCycleLabel: o.current_cycle_label,
      selectivityTier: o.selectivity_tier,
      // Array.isArray defensively -- an environment where the eligibility_notes-codes
      // migration hasn't landed yet could still hand back the old text column; this reads as
      // "no notes" rather than throwing, same defensive habit this codebase already applies
      // to every other not-yet-applied-migration column.
      eligibilityNotes: Array.isArray(match.eligibility_notes) && match.eligibility_notes.length > 0,
    });
    if (result.length >= HOME_STRIP_SIZE) break;
  }
  return result;
}

/**
 * Fetches this student's best HOME_STRIP_SIZE opportunity matches for the home page's
 * rotating strip.
 *
 * Three filters stack, strictest first, same layering app/(app)/dashboard/page.tsx's own
 * opportunityPreview already established for the identical "this is a core, prominent
 * recommendation surface" reason:
 *   1. `verification_state = 'verified_current'` — the opportunity's own existence/content
 *      was actually confirmed, not merely ingested. Stricter than Browse, which shows the
 *      whole catalogue and labels rather than excludes.
 *   2. `isOpportunityRecommendable` — actionable (open cycle, no passed deadline) AND
 *      sufficiently verified. Because of (1), this is defense-in-depth in practice (a
 *      verified_current row essentially always already clears it) rather than the primary
 *      gate — same relationship dashboard/page.tsx's own comment describes for its preview.
 *   3. `competesInCoreRecommendations` — excludes pay-to-enroll rows from a surface that
 *      reads as Oryn's own top pick, same rule the counselor's recommendations already apply.
 *
 * What this does NOT filter on: eligibility confidence. `.eq("eligible", true)` below
 * excludes only a CONFIRMED mismatch (age/country/citizenship/grade) — computeEligibility
 * (lib/opportunities/matching.ts) returns `eligible: true` alongside a non-null
 * `eligibility_notes` whenever a restriction exists but Oryn is missing the fact needed to
 * check it, and that shape is deliberately let through here rather than excluded. Excluding
 * every unverified-eligibility row would have shrunk this "best 5" surface for most students
 * (measured 2026-09-03 against the live catalogue: 1,262 of 2,038 real match rows carry
 * exactly this shape, 62% — excluding all of them here would routinely leave far fewer than
 * 5 cards, silently understating "best 5" as "best 1 or 2" with no signal to the student that
 * anything was hidden). The honest alternative is what OpportunityCard already does for
 * Browse: show the real top 5 by match_score, and let the caveat travel with the card
 * (OpportunityStripCard's own canClaimMatch gate) rather than with a silent exclusion.
 *
 * `needsVerification`/`notActionable` (OpportunityStandingBadge's other two states) are
 * absent from HomeStripOpportunity entirely, not merely defaulted — filter (2) above already
 * requires isOpportunitySufficientlyVerified to pass before a row is admitted at all, so a
 * surviving row cannot need verification; filter (1)+(2) together rule out notActionable the
 * same way. Modeling a state the data can't produce would be exactly the kind of validation
 * for a scenario that can't happen this codebase's own conventions avoid elsewhere.
 */
export async function getHomeOpportunityStrip(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<HomeStripOpportunity[]> {
  const { data: matches } = await supabase
    .from("opportunity_matches")
    .select("opportunity_id, match_score, eligibility_notes")
    .eq("user_id", userId)
    .eq("eligible", true)
    // Secondary key added 2026-09-05 (docs/home-strip-ranking-stability-2026-09-04.md):
    // match_score alone ties 191-way at some students' own rank-5 boundary, and an index
    // scan's tie order is an accident of physical leaf-page layout, not something the query
    // asks for -- one unrelated write to this table can silently reorder which opportunities
    // land in a student's "best 5" between visits. `id` is opportunity_matches' own uuid
    // primary key (migration 0008), so it's a genuine, always-unique tiebreaker -- unlike
    // calculated_at, which a same-instant batch recompute could still tie.
    .order("match_score", { ascending: false })
    .order("id", { ascending: true })
    .limit(HOME_STRIP_CANDIDATE_POOL);

  const opportunityIds = (matches ?? []).map((m) => m.opportunity_id);
  if (opportunityIds.length === 0) return [];

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select(
      "id, title, organization, category, image_url, deadline, cycle_status, current_cycle_label, selectivity_tier, status, cost, last_verified_at, verified_at, source_verified_at"
    )
    .in("id", opportunityIds)
    .eq("verification_state", "verified_current");

  return selectHomeStripCandidates(matches ?? [], opportunities ?? []);
}
