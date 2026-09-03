import "server-only";

import { tavilyProvider } from "@/lib/providers/tavily";
import { extractOpportunityFromContent } from "@/lib/ai/opportunity-extraction";
import { JobBudgetExceededError } from "@/lib/ai/limits/job-budget";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTitle, isDuplicateOpportunity } from "./dedup";

export interface DiscoveryRunResult {
  query: string;
  candidatesFound: number;
  opportunitiesStored: number;
  errors: string[];
  /** True when this run stopped processing candidates early because
   *  opportunity_extraction hit its monthly AI budget (lib/ai/limits/job-budget.ts) — a
   *  clean, expected stop, not a failure. The caller (the discover-opportunities route)
   *  uses this to skip the remaining queries in the batch rather than let each one waste a
   *  Tavily search only to hit the same budget check on its first candidate. */
  stoppedForBudget: boolean;
  /** Candidates otherwise real and categorized, skipped because extraction could not identify
   *  an organization — see the skip site below for why this must never fall through to insert. */
  skippedMissingOrganization: number;
}

/**
 * One discovery run: search Tavily, extract+structure each result with AI, dedupe against
 * existing opportunities, store new ones (Phase 11.2). Runs with the admin client — this
 * writes to global reference data no user request is allowed to touch directly.
 *
 * Existing opportunities are loaded in full for dedup comparison rather than queried per
 * candidate; fine at the scale of a single-digit-thousands opportunity catalog, worth
 * revisiting (e.g. a normalized_title index lookup) if the catalog grows much larger.
 */
export async function discoverOpportunitiesForQuery(query: string): Promise<DiscoveryRunResult> {
  const errors: string[] = [];
  const searchResult = await tavilyProvider.search(query, { maxResults: 6 });

  if (!searchResult.success) {
    return { query, candidatesFound: 0, opportunitiesStored: 0, errors: [searchResult.error.message], stoppedForBudget: false, skippedMissingOrganization: 0 };
  }

  const supabase = createAdminClient();
  // Throws rather than degrading to `?? []`, deliberately not lib/supabase/safe-read.ts's
  // readOr — that helper's own contract still returns the fallback on a failed read (logged,
  // but the caller's behavior is unchanged), which is right where an empty result is a safe
  // answer. It is not safe here: an empty comparison set doesn't mean "nothing to dedupe
  // against," it means "every candidate below reads as new, however similar" — silently
  // proceeding would insert duplicates of records already in the catalog, exactly the shape
  // bd's own duplicate-record package found live instances of hours before this fix.
  // lib/social/posts.ts's unwrapOrThrow is the closer precedent: this is a read whose
  // failure must stop the run, not one that degrades to an empty state safely.
  const { data: existingOpportunities, error: existingOpportunitiesError } = await supabase
    .from("opportunities")
    .select("title, organization, official_url");
  if (existingOpportunitiesError) {
    throw new Error(`discoverOpportunitiesForQuery: failed to load existing opportunities for dedup: ${existingOpportunitiesError.message}`);
  }

  let stored = 0;
  let stoppedForBudget = false;
  let skippedMissingOrganization = 0;

  for (const result of searchResult.data) {
    try {
      const content = result.raw_content ?? result.content;
      const { candidate } = await extractOpportunityFromContent({ sourceUrl: result.url, content });

      if (!candidate.isRealOpportunity || !candidate.category) continue;

      // Same requirement decideIngestion() (lib/opportunities/ingest.ts) enforces on the
      // batch-research path. A null organization is invisible to isDuplicateOpportunity()'s
      // organization+title branch — the 2026-08-18 Drive-corpus import produced 197 such rows at
      // once (docs/null-organization-dedup-defect-2026-09-02.md). Skipping here is what stops
      // this pipeline from widening that same gap the first time it actually runs.
      if (!candidate.organization?.trim()) {
        skippedMissingOrganization += 1;
        continue;
      }

      const isDupe = (existingOpportunities ?? []).some((existing) =>
        isDuplicateOpportunity(
          { title: candidate.title, organization: candidate.organization, officialUrl: candidate.applicationUrl },
          { title: existing.title, organization: existing.organization, officialUrl: existing.official_url }
        )
      );
      if (isDupe) continue;

      const { data: inserted, error } = await supabase
        .from("opportunities")
        .insert({
          title: candidate.title,
          organization: candidate.organization,
          description: candidate.description,
          category: candidate.category,
          official_url: result.url,
          application_url: candidate.applicationUrl,
          country: candidate.country,
          remote_allowed: candidate.remoteAllowed,
          minimum_age: candidate.minimumAge,
          maximum_age: candidate.maximumAge,
          eligible_countries: candidate.eligibleCountries,
          fields: candidate.fields,
          cost: candidate.cost,
          funding_available: candidate.fundingAvailable,
          deadline: candidate.deadline,
          start_date: candidate.startDate,
          end_date: candidate.endDate,
          source: "tavily",
          source_url: result.url,
          // Deliberately NOT stamping last_verified_at here — docs/opportunity-
          // reverification-job-design-2026-08-23.md §1.2a flagged this exact line as a
          // latent hazard: an insert-time new Date() from an unattended Tavily search
          // reads as "verified" to anything trusting the column, with no page ever
          // actually read. As of §1.2a's own measurement no row yet carried source='tavily',
          // so the hazard was latent in code rather than historical in data — fixed here
          // before this path ever ran, per that section's own recommendation to whoever
          // owns this file. opportunity_sources below already records what actually
          // happened (source_type: "web_search", confidence: "medium") at the confidence
          // it actually deserves; last_verified_at now stays null on a freshly-discovered
          // row until either a human researches it or the re-verification job
          // (lib/opportunities/reverification/) reads the real page and writes
          // source_verified_at (migration 0103) — the field actually built to support this
          // claim, see that migration's own comment.
          normalized_title: normalizeTitle(candidate.title),
        })
        .select()
        .single();

      if (error || !inserted) {
        errors.push(error?.message ?? "Insert returned no row");
        continue;
      }

      // Logged, not pushed to `errors` — the opportunity row itself already saved
      // successfully above; a source-attribution write is provenance metadata for that
      // fact, not the fact itself, same reasoning as lib/universities/sync-us-
      // universities.ts's own university_sources upsert.
      const { error: sourceError } = await supabase.from("opportunity_sources").insert({
        opportunity_id: inserted.id,
        source_url: result.url,
        source_domain: safeHostname(result.url),
        source_type: "web_search",
        confidence: "medium",
        raw_excerpt: result.content.slice(0, 500),
      });
      if (sourceError) console.error("[opportunities] failed to record source attribution", { opportunityId: inserted.id, error: sourceError.message });

      stored += 1;
    } catch (error) {
      if (error instanceof JobBudgetExceededError) {
        // A clean stop, not a failure — see JobBudgetExceededError's own doc comment. Break
        // rather than continue: every remaining candidate this query would hit the exact
        // same check, so there's nothing to gain from trying them.
        stoppedForBudget = true;
        break;
      }
      errors.push(error instanceof Error ? error.message : "Unknown error during extraction");
    }
  }

  return { query, candidatesFound: searchResult.data.length, opportunitiesStored: stored, errors, stoppedForBudget, skippedMissingOrganization };
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** A handful of representative starter queries (Phase 11.2 example set) — the admin trigger runs all of these in one job. */
export const DEFAULT_DISCOVERY_QUERIES = [
  "high school economics competition 2027 apply",
  "international student entrepreneurship competition high school application",
  "high school research program Europe apply 2027",
  "teen artificial intelligence summer program application",
  "high school student volunteering international program apply",
];
