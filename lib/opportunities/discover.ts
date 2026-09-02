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
  const { data: existingOpportunities } = await supabase
    .from("opportunities")
    .select("title, organization, official_url");

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
          last_verified_at: new Date().toISOString(),
          normalized_title: normalizeTitle(candidate.title),
        })
        .select()
        .single();

      if (error || !inserted) {
        errors.push(error?.message ?? "Insert returned no row");
        continue;
      }

      await supabase.from("opportunity_sources").insert({
        opportunity_id: inserted.id,
        source_url: result.url,
        source_domain: safeHostname(result.url),
        source_type: "web_search",
        confidence: "medium",
        raw_excerpt: result.content.slice(0, 500),
      });

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
