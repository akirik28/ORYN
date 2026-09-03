import "server-only";

import { tavilyProvider } from "@/lib/providers/tavily";
import { extractRequirementsFromContent } from "@/lib/ai/requirement-extraction";
import { JobBudgetExceededError } from "@/lib/ai/limits/job-budget";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDuplicateRequirement } from "./dedup";
import { categoryToRuleKind } from "./types";
import { getSupersededUniversityIds, loadSupersessionMap } from "@/lib/universities/canonical";
import type { RequirementCategory } from "@/types/database";

export interface RequirementDiscoveryResult {
  universityId: string;
  universityName: string;
  candidatesFound: number;
  requirementsStored: number;
  errors: string[];
  /** True when this university's run stopped early because requirement_extraction hit its
   *  monthly AI budget (lib/ai/limits/job-budget.ts) — a clean, expected stop, not a
   *  failure. discoverRequirementsForUncoveredUniversities uses this to stop starting new
   *  universities for the rest of this batch rather than let each one waste a Tavily search
   *  only to hit the same budget check on its first candidate. */
  stoppedForBudget: boolean;
}

/**
 * One discovery run for one university: search for its admissions-requirements page(s),
 * extract every distinct requirement stated (lib/ai/requirement-extraction.ts), dedupe
 * against what's already stored, insert new ones via the admin client — same shape as
 * lib/opportunities/discover.ts's pipeline, applied to a different global table.
 * University-wide only (program_id null) — a page found by searching the university's
 * name isn't reliably attributable to one specific program without more targeted queries
 * per program, which is a reasonable future extension, not this pass's scope.
 */
export async function discoverRequirementsForUniversity(params: { universityId: string; universityName: string }): Promise<RequirementDiscoveryResult> {
  const errors: string[] = [];
  const searchResult = await tavilyProvider.search(`${params.universityName} admission requirements for applicants`, { maxResults: 3 });

  if (!searchResult.success) {
    return {
      universityId: params.universityId,
      universityName: params.universityName,
      candidatesFound: 0,
      requirementsStored: 0,
      errors: [searchResult.error.message],
      stoppedForBudget: false,
    };
  }

  const admin = createAdminClient();
  // Throws rather than degrading to `?? []` -- same reasoning as
  // lib/opportunities/discover.ts's identical fix, not lib/supabase/safe-read.ts's readOr:
  // an empty comparison set here isn't a safe fallback, it's every candidate below reading
  // as new regardless of whether it already exists, which inserts duplicates silently. No
  // caller between here and discoverRequirementsForUncoveredUniversities' own per-university
  // loop catches this -- a throw stops the rest of this batch too, the same conservative
  // shape as the sibling fix, not just this one university.
  const { data: existingRows, error: existingRowsError } = await admin
    .from("university_requirements")
    .select("title, requirement_type, program_id")
    .eq("university_id", params.universityId);
  if (existingRowsError) {
    throw new Error(`discoverRequirementsForUniversity: failed to load existing requirements for dedup (${params.universityId}): ${existingRowsError.message}`);
  }
  const existing = (existingRows ?? [])
    .filter((r): r is { title: string; requirement_type: RequirementCategory; program_id: string | null } => r.title !== null)
    .map((r) => ({ category: r.requirement_type, title: r.title, programId: r.program_id }));

  let candidatesFound = 0;
  let stored = 0;
  let stoppedForBudget = false;

  for (const result of searchResult.data) {
    try {
      const content = result.raw_content ?? result.content;
      const { candidates } = await extractRequirementsFromContent({ sourceUrl: result.url, content });
      candidatesFound += candidates.length;

      for (const candidate of candidates) {
        const dedupCandidate = { category: candidate.category as RequirementCategory, title: candidate.title, programId: null };
        const isDupe = existing.some((e) => isDuplicateRequirement(dedupCandidate, e));
        if (isDupe) continue;

        // Trust the model's structuredRule only when it's a real fit for the category's
        // rule kind — a mismatch (e.g. a "coursework" rule attached to a "minimum_grade"
        // requirement) means the extraction was confused, and lib/requirements/evaluate.ts
        // would just misread it. Dropping to null degrades to an honest
        // needs_manual_review instead of a wrong evaluation.
        const expectedKind = categoryToRuleKind(candidate.category as RequirementCategory);
        const structuredRule = expectedKind && candidate.structuredRule?.kind === expectedKind ? candidate.structuredRule : null;

        const { error } = await admin.from("university_requirements").insert({
          university_id: params.universityId,
          program_id: null,
          requirement_type: candidate.category as RequirementCategory,
          title: candidate.title,
          requirement_detail: candidate.detail,
          is_required: candidate.isRequired,
          structured_rule: structuredRule,
          source_url: result.url,
          data_confidence: "medium",
          data_status: "fresh",
          retrieved_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        });
        if (error) {
          errors.push(error.message);
          continue;
        }

        existing.push(dedupCandidate);
        stored += 1;
      }
    } catch (error) {
      if (error instanceof JobBudgetExceededError) {
        // A clean stop, not a failure — see JobBudgetExceededError's own doc comment. Break
        // the outer (per-search-result) loop: every remaining result for this university
        // would hit the exact same check, so there's nothing to gain from trying them.
        stoppedForBudget = true;
        break;
      }
      errors.push(error instanceof Error ? error.message : "Unknown error during extraction");
    }
  }

  return { universityId: params.universityId, universityName: params.universityName, candidatesFound, requirementsStored: stored, errors, stoppedForBudget };
}

const DEFAULT_BATCH_SIZE = 5;

/**
 * Universities with zero university_requirements rows yet, oldest-created first — the
 * batch a scheduled/admin-triggered run should cover. Bounded (default 5) to keep one run's
 * Tavily + AI cost predictable; a university that already has rows is left alone rather than
 * re-scanned, since there's no freshness-driven re-check built yet (see docs/known-issues.md).
 */
export async function getUniversitiesNeedingRequirementDiscovery(limit = DEFAULT_BATCH_SIZE): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient();

  // A superseded row (a confirmed duplicate of another universities row — see
  // lib/universities/canonical.ts) must never reach a discovery run: it can't be attached to
  // requirements a student would ever see, so a Tavily search + AI extraction call against it
  // is pure waste. Same filter already applied to browse/search/target-university surfaces.
  const supersessionMap = await loadSupersessionMap(admin);
  const supersededIds = getSupersededUniversityIds(supersessionMap);
  let query = admin.from("universities").select("id, name").order("created_at", { ascending: true }).limit(200);
  if (supersededIds.length > 0) query = query.not("id", "in", `(${supersededIds.join(",")})`);
  const { data: universities } = await query;
  if (!universities || universities.length === 0) return [];

  const { data: withRequirements } = await admin.from("university_requirements").select("university_id");
  const covered = new Set((withRequirements ?? []).map((r) => r.university_id));

  return universities.filter((u) => !covered.has(u.id)).slice(0, limit);
}

export async function discoverRequirementsForUncoveredUniversities(limit = DEFAULT_BATCH_SIZE): Promise<RequirementDiscoveryResult[]> {
  const targets = await getUniversitiesNeedingRequirementDiscovery(limit);
  const results: RequirementDiscoveryResult[] = [];
  for (const target of targets) {
    const result = await discoverRequirementsForUniversity({ universityId: target.id, universityName: target.name });
    results.push(result);
    // Once one university's run stops for budget, every remaining university this batch
    // would hit the same check on its very first candidate — stop starting new ones rather
    // than spend Tavily searches on runs that can't do any AI work anyway.
    if (result.stoppedForBudget) break;
  }
  return results;
}
