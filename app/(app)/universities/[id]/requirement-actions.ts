"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RequirementInputSchema, StructuredRuleSchema, ruleAuthoringRefusal } from "@/lib/validation/requirements";
import { interpretRequirementText } from "@/lib/ai/interpret-requirement";
import { categoryToRuleKind } from "@/lib/requirements/types";
import { validateProgramOwnership } from "@/lib/requirements/program-ownership";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";
import { resolveLocale } from "@/lib/i18n/locale";
import type { RequirementCategory } from "@/types/database";

/**
 * Admin-only writes to the global (no user_id, RLS-public-read-only) university_requirements
 * table — same trust boundary as the sync/discovery jobs on the admin panel: requireAdmin()
 * gates every export independently (never assume the page-level check is enough for a
 * Server Action, per SECURITY.md), and the actual write goes through the admin client since
 * no RLS policy grants a normal request write access here.
 */
export async function addUniversityRequirement(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = RequirementInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  let structuredRule: Record<string, unknown> | null = null;
  if (data.structuredRuleJson && data.structuredRuleJson.trim().length > 0) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(data.structuredRuleJson);
    } catch {
      return { error: "Structured rule is not valid JSON." };
    }
    const ruleParsed = StructuredRuleSchema.safeParse(candidate);
    if (!ruleParsed.success) {
      return { error: `Structured rule doesn't match the expected shape: ${ruleParsed.error.issues[0]?.message ?? "invalid"}` };
    }
    structuredRule = ruleParsed.data;
  }

  const admin = createAdminClient();

  // See lib/requirements/program-ownership.ts — a program_id must actually belong to
  // universityId, or this silently writes a requirement that shows against the wrong
  // university's program page. Only fetches when a specific program was chosen; the
  // common "University-wide" case (programId null) never needs this round trip.
  if (data.programId) {
    const { data: program, error: programLookupError } = await admin
      .from("university_programs")
      .select("university_id")
      .eq("id", data.programId)
      .maybeSingle();
    if (programLookupError) {
      console.error("[requirement-actions] failed to verify program ownership", { code: programLookupError.code, message: programLookupError.message });
      return { error: toFriendlyDbErrorMessage("save", await resolveLocale()) };
    }
    const ownership = validateProgramOwnership(data.programId, data.universityId, program?.university_id ?? null);
    if (!ownership.ok) {
      return { error: ownership.error };
    }
  }

  const { error } = await admin.from("university_requirements").insert({
    university_id: data.universityId,
    program_id: data.programId,
    requirement_type: data.requirementType as RequirementCategory,
    title: data.title,
    requirement_detail: data.requirementDetail,
    is_required: data.isRequired,
    source_url: data.sourceUrl,
    structured_rule: structuredRule,
    retrieved_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[requirement-actions] failed to save requirement", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save", await resolveLocale()) };
  }
  revalidatePath(`/universities/${data.universityId}`);
  return {};
}

export async function deleteUniversityRequirement(id: string, universityId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("university_requirements").delete().eq("id", id);
  if (error) {
    console.error("[requirement-actions] failed to delete requirement", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("delete", await resolveLocale()) };
  }
  revalidatePath(`/universities/${universityId}`);
  return {};
}

/**
 * AI-assisted suggestion only — returns JSON text for the admin to review and edit in the
 * form before addUniversityRequirement ever persists it. Never called automatically, never
 * saved without this round trip through a human. See lib/ai/interpret-requirement.ts.
 */
export async function suggestRequirementRule(params: {
  category: RequirementCategory;
  title: string;
  requirementDetail: string;
}): Promise<{ ruleJson?: string; error?: string }> {
  const profile = await requireAdmin();
  if (!categoryToRuleKind(params.category)) {
    return { error: "This category has no machine-evaluable rule shape — leave the structured rule blank; it will show as \"needs review\"." };
  }
  // Same guard addUniversityRequirement applies at save time, applied here too so the admin
  // is never handed a suggestion the save will then refuse — and so no rule is ever generated
  // for a binding application round in the first place.
  const refusal = ruleAuthoringRefusal({ category: params.category, title: params.title, requirementDetail: params.requirementDetail });
  if (refusal) return { error: refusal };
  if (!params.requirementDetail || params.requirementDetail.trim().length === 0) {
    return { error: "Add the sourced requirement text first, then suggest a rule from it." };
  }
  try {
    const rule = await interpretRequirementText({
      adminUserId: profile.id,
      category: params.category,
      title: params.title,
      requirementDetail: params.requirementDetail,
    });
    return { ruleJson: JSON.stringify(rule, null, 2) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI suggestion failed." };
  }
}
