import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { withUsageLogging } from "./usage";
import { selectModelForUser } from "./limits/budget";
import { withOutputLanguage } from "./output-language";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { PlanTier } from "@/types/database";

const RefinementSchema = z.object({
  improvedDescription: z
    .string()
    .nullable()
    .describe("A tighter, more specific rewrite of the description using ONLY facts already provided. Null if there isn't enough to meaningfully improve, or it's already strong."),
  suggestedQuestions: z
    .array(z.string())
    .max(4)
    .describe("Short, specific questions that would let the student add missing high-value context (e.g. 'How many members were in the club?', 'What was the measurable outcome?'). Never state something as fact — only ask."),
});

export type AchievementRefinement = z.infer<typeof RefinementSchema>;

const SYSTEM_PROMPT = `You help a student strengthen a single achievement entry (an activity, project, award, or
similar) in their Proxola profile.

Rules — these are absolute:
- NEVER invent or assume a number, outcome, organization name, or any other fact the student didn't provide.
  If the description says "ran a club" with no member count, do not write "led a 50-member club."
- Only rephrase, tighten, and clarify what's already stated. Prefer concrete verbs over vague ones ("organized
  weekly meetings for 12 members" over "was involved with").
- Where genuinely useful missing context would strengthen the entry (team size, duration, measurable
  outcome, selectivity, scope), ask a short question instead of guessing.
- If the existing description is already specific and strong, set improvedDescription to null rather than
  padding it.`;

/**
 * Goes through withUsageLogging (added 2026-09-02) rather than a bare generateStructured +
 * logAIUsage pair, for the same reason cv-extraction.ts's own comment gives: a
 * retry-exhausted schema-validation failure is up to two real, billed calls that used to
 * have no record in ai_usage at all.
 */
export async function refineAchievementDescription(params: {
  userId: string;
  /** The student's current UI language. Additive and optional — an un-migrated caller
   *  keeps English, which is what the prompt was written in. */
  locale?: Locale;
  achievementType: string;
  title: string;
  organization: string | null;
  description: string | null;
  /** 2026-09-03, closing the Ultra tier-economics boundary — see
   *  lib/ai/research-generator.ts's own comment on why this is required, not defaulted. */
  tier: PlanTier;
}): Promise<AchievementRefinement> {
  const provider = getAIProvider();

  const result = await withUsageLogging({ userId: params.userId, feature: "achievement_refinement", selectModel: (uid) => selectModelForUser(uid, params.tier) }, (model) =>
    provider.generateStructured({
      system: withOutputLanguage(SYSTEM_PROMPT, params.locale ?? DEFAULT_LOCALE),
      prompt: `Achievement type: ${params.achievementType}\nTitle: ${params.title}\nOrganization: ${params.organization ?? "(not given)"}\nCurrent description: ${params.description ?? "(none)"}\n\nSuggest a tightened description (or null) and up to 4 clarifying questions.`,
      schema: RefinementSchema,
      schemaName: "record_refinement",
      schemaDescription: "Records the suggested improved description and clarifying questions.",
      maxTokens: 768,
      model,
    }),
  );
  return result.data;
}
