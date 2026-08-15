import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";
import { ADVISOR_SYSTEM_PROMPT } from "./advisor-prompt";
import { buildStudentAdvisorContext, formatContextForPrompt } from "./student-context";

const WeeklyActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  reason: z.string().describe("Why this matters, in terms of the student's actual scores/gaps"),
  category: z.string(),
  estimatedMinutes: z.number().int().positive().max(1200),
  impact: z.enum(["low", "medium", "high", "very_high"]),
});

const WeeklyPlanSchema = z.object({
  summary: z.string().describe("One or two sentences on what changed and what matters most this week"),
  actions: z.array(WeeklyActionSchema).min(1).max(3),
  avoidForNow: z
    .object({ activity: z.string(), reason: z.string() })
    .nullable()
    .describe("One thing the student should explicitly NOT prioritize right now, if applicable. Null if nothing stands out."),
});

export type WeeklyPlanGeneration = z.infer<typeof WeeklyPlanSchema>;

export async function generateWeeklyPlan(userId: string): Promise<WeeklyPlanGeneration> {
  const context = await buildStudentAdvisorContext(userId);
  const provider = getAIProvider();

  const result = await provider.generateStructured({
    system: ADVISOR_SYSTEM_PROMPT,
    prompt: `Here is the student's current context:\n\n${formatContextForPrompt(context)}\n\nGenerate this week's plan: 1-3 highest-impact actions (fewer is fine if that's all that's genuinely high-impact), plus one thing to explicitly avoid prioritizing right now if something stands out. Ground every action in the student's actual gaps and existing work — don't propose generic tasks.`,
    schema: WeeklyPlanSchema,
    schemaName: "record_weekly_plan",
    schemaDescription: "Records this week's prioritized action plan for the student.",
    maxTokens: 2048,
  });

  await logAIUsage({ userId, feature: "weekly_plan", usage: result.usage });
  return result.data;
}
