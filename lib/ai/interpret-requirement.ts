import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { withUsageLogging } from "./usage";
import { RULE_FIELD_SCHEMAS_BY_KIND, ruleAuthoringRefusal } from "@/lib/validation/requirements";
import { categoryToRuleKind } from "@/lib/requirements/types";
import type { RequirementCategory } from "@/types/database";
import type { StructuredRule } from "@/lib/requirements/types";

const SYSTEM_PROMPT = `You convert one already-sourced university admission requirement into a structured, machine-comparable rule.

Rules — these are absolute:
- Use ONLY facts stated in the text given to you. Never invent a minimum score, GPA, or subject that isn't there.
- If the text doesn't clearly state a value a field needs, omit that optional field rather than guessing.
- You are not looking up the requirement yourself — a human already found and pasted the official source text below.
  Your only job is structuring what it says, not verifying or supplementing it.`;

/**
 * AI-assisted (never AI-authored) interpretation of one requirement's sourced text into a
 * StructuredRule, for an admin to review and edit before saving (see
 * app/(app)/universities/[id]/requirement-actions.ts). Every category maps to exactly one
 * rule `kind` (lib/requirements/types.ts's categoryToRuleKind) — the model fills in only
 * that shape's fields, never picks a schema itself, which keeps extraction focused and
 * reliable. Categories with no evaluable shape (essay, recommendation, ...) have nothing to
 * interpret and are rejected before an AI call is even made.
 */
export async function interpretRequirementText(params: {
  adminUserId: string;
  category: RequirementCategory;
  title: string;
  requirementDetail: string;
}): Promise<StructuredRule> {
  const kind = categoryToRuleKind(params.category);
  if (!kind) {
    throw new Error(`"${params.category}" has no machine-evaluable rule shape — it needs manual review, not AI interpretation.`);
  }
  // Refused before any AI call, not after: some requirements must never carry a structured
  // rule regardless of how cleanly their text would structure (a binding Early Decision
  // commitment structures perfectly and must still never become a checkbox). See
  // ruleAuthoringRefusal.
  const refusal = ruleAuthoringRefusal({ category: params.category, title: params.title, requirementDetail: params.requirementDetail });
  if (refusal) throw new Error(refusal);

  const fieldSchema = RULE_FIELD_SCHEMAS_BY_KIND[kind];
  const provider = getAIProvider();
  // withUsageLogging (2026-09-02): see essay-outlines.ts's identical comment — a
  // retry-exhausted schema-validation failure used to spend up to two real, billed calls
  // with no ai_usage record at all, the same shape already fixed elsewhere. This surface is
  // admin-triggered rather than student-facing, but the gap and the fix are identical.
  const result = await withUsageLogging({ userId: params.adminUserId, feature: "requirement_interpretation" }, (model) =>
    provider.generateStructured({
      system: SYSTEM_PROMPT,
      prompt: `Requirement title: ${params.title}\nCategory: ${params.category}\nSourced text:\n${params.requirementDetail.slice(0, 4000)}\n\nStructure this as a "${kind}" rule.`,
      schema: fieldSchema as z.ZodType<Record<string, unknown>>,
      schemaName: "record_requirement_rule",
      schemaDescription: `Records the structured "${kind}" rule extracted from the requirement text.`,
      maxTokens: 512,
      model,
    }),
  );

  return { kind, ...result.data } as StructuredRule;
}
