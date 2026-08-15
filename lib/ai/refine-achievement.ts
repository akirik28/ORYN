import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";

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
similar) in their Oryn profile.

Rules — these are absolute:
- NEVER invent or assume a number, outcome, organization name, or any other fact the student didn't provide.
  If the description says "ran a club" with no member count, do not write "led a 50-member club."
- Only rephrase, tighten, and clarify what's already stated. Prefer concrete verbs over vague ones ("organized
  weekly meetings for 12 members" over "was involved with").
- Where genuinely useful missing context would strengthen the entry (team size, duration, measurable
  outcome, selectivity, scope), ask a short question instead of guessing.
- If the existing description is already specific and strong, set improvedDescription to null rather than
  padding it.`;

export async function refineAchievementDescription(params: {
  userId: string;
  achievementType: string;
  title: string;
  organization: string | null;
  description: string | null;
}): Promise<AchievementRefinement> {
  const provider = getAIProvider();

  const result = await provider.generateStructured({
    system: SYSTEM_PROMPT,
    prompt: `Achievement type: ${params.achievementType}\nTitle: ${params.title}\nOrganization: ${params.organization ?? "(not given)"}\nCurrent description: ${params.description ?? "(none)"}\n\nSuggest a tightened description (or null) and up to 4 clarifying questions.`,
    schema: RefinementSchema,
    schemaName: "record_refinement",
    schemaDescription: "Records the suggested improved description and clarifying questions.",
    maxTokens: 768,
  });

  await logAIUsage({ userId: params.userId, feature: "achievement_refinement", usage: result.usage });
  return result.data;
}
