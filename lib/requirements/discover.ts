import "server-only";

import { tavilyProvider } from "@/lib/providers/tavily";
import { extractRequirementsFromContent } from "@/lib/ai/requirement-extraction";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDuplicateRequirement } from "./dedup";
import { categoryToRuleKind } from "./types";
import type { RequirementCategory } from "@/types/database";

export interface RequirementDiscoveryResult {
  universityId: string;
  universityName: string;
  candidatesFound: number;
  requirementsStored: number;
  errors: string[];
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
    return { universityId: params.universityId, universityName: params.universityName, candidatesFound: 0, requirementsStored: 0, errors: [searchResult.error.message] };
  }

  const admin = createAdminClient();
  const { data: existingRows } = await admin
    .from("university_requirements")
    .select("title, requirement_type, program_id")
    .eq("university_id", params.universityId);
  const existing = (existingRows ?? [])
    .filter((r): r is { title: string; requirement_type: RequirementCategory; program_id: string | null } => r.title !== null)
    .map((r) => ({ category: r.requirement_type, title: r.title, programId: r.program_id }));

  let candidatesFound = 0;
  let stored = 0;

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
      errors.push(error instanceof Error ? error.message : "Unknown error during extraction");
    }
  }

  return { universityId: params.universityId, universityName: params.universityName, candidatesFound, requirementsStored: stored, errors };
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

  const { data: universities } = await admin.from("universities").select("id, name").order("created_at", { ascending: true }).limit(200);
  if (!universities || universities.length === 0) return [];

  const { data: withRequirements } = await admin.from("university_requirements").select("university_id");
  const covered = new Set((withRequirements ?? []).map((r) => r.university_id));

  return universities.filter((u) => !covered.has(u.id)).slice(0, limit);
}

export async function discoverRequirementsForUncoveredUniversities(limit = DEFAULT_BATCH_SIZE): Promise<RequirementDiscoveryResult[]> {
  const targets = await getUniversitiesNeedingRequirementDiscovery(limit);
  const results: RequirementDiscoveryResult[] = [];
  for (const target of targets) {
    results.push(await discoverRequirementsForUniversity({ universityId: target.id, universityName: target.name }));
  }
  return results;
}
