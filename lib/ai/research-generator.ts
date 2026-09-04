import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { withUsageLogging } from "./usage";
import { selectModelForUser } from "./limits/budget";
import { openAlexProvider } from "@/lib/providers/openalex";
import { buildStudentAdvisorContext, timeBudgetLabel } from "./student-context";
import { skillCategoryLabel } from "@/lib/profile/cv-import";
import { withOutputLanguage } from "./output-language";
import type { PlanTier } from "@/types/database";

const ResearchProjectSchema = z.object({
  researchQuestion: z.string(),
  whyItFits: z.string().describe("Why this fits this specific student's interests and current level"),
  difficulty: z.enum(["accessible", "moderate", "ambitious"]),
  estimatedDuration: z.string().describe("e.g. '4-6 weeks, 3-4 hours/week'"),
  requiredSkills: z.array(z.string()).max(6),
  dataSources: z.array(z.string()).max(5).describe("Real, publicly accessible sources a high school student could actually use — public datasets, open APIs, published papers, surveys they could run themselves"),
  method: z.string(),
  expectedOutput: z.string().describe("What the finished project looks like — a paper, a dataset analysis, a poster, etc."),
  firstSteps: z.array(z.string()).min(1).max(3),
});

const ResearchProjectListSchema = z.object({
  projects: z.array(ResearchProjectSchema).min(1).max(3),
});

export type ResearchProject = z.infer<typeof ResearchProjectSchema>;

const SYSTEM_PROMPT = `You generate realistic, achievable research project ideas for a high-school-aged student
(roughly 14-18), grounded in real current research literature.

The single most important rule: every project must be something this student could actually complete with
public data and no special access — never propose something that sounds impressive but is impossible at
this level.

Bad (rejected): "Develop a new macroeconomic model predicting all European inflation."
Good (accepted): "Compare youth unemployment and tertiary education rates across 10 European countries from
2015-2025 using public OECD/Eurostat datasets."

Scale difficulty and scope to the student's stated experience, grade level, and available weekly time — a
student three years from applying can take on more than one three months out. Use the real paper titles and
topics provided as grounding for what's currently being studied in this space — reference the kind of
question being asked in the field, not the specific papers verbatim. Never fabricate a dataset, API, or
source that doesn't actually exist publicly.`;

export async function generateResearchProjects(params: {
  userId: string;
  interests: string[];
  field: string;
  /** 2026-09-03, closing the Ultra tier-economics boundary — see lib/ai/advisor-chat.ts's
   *  own comment on why the untouched withUsageLogging default (tier "standard") would
   *  otherwise silently degrade an Ultra student's calls at Standard's target. Required, no
   *  default, for the same reason getMonthlyQuota's tier param has none: this function's one
   *  real caller (app/(app)/profile/actions.ts) already resolves a real tier, so a default
   *  here would only ever paper over that caller forgetting to pass it. */
  tier: PlanTier;
}): Promise<ResearchProject[]> {
  const context = await buildStudentAdvisorContext(params.userId);

  const searchQuery = [params.field, ...params.interests].filter(Boolean).join(" ");
  const worksResult = await openAlexProvider.searchWorks(searchQuery, 8);
  const themesContext = worksResult.success && worksResult.data.length > 0
    ? worksResult.data.map((w) => `- "${w.title}" (${w.publicationYear ?? "n.d."}) — topics: ${w.topics.slice(0, 3).join(", ") || "n/a"}`).join("\n")
    : "No live research database results available — rely on general knowledge of the field and stay conservative about what's current.";

  // Phase 13's own words: "The system should scale the difficulty to the student's age and
  // experience." graduationYear/birthYear were already fetched into context (Counselor Core's
  // eligibility checks need them) but student-context.ts's own comment on both admits
  // "not used in prompt text today" -- true here specifically, this function builds its own
  // prompt rather than calling formatContextForPrompt. Without this, "scale to age" was only
  // ever true in the generic sense that every output is pitched at "roughly 14-18" broadly,
  // never adjusted for whether THIS student is 14 or 18 -- a real difference in what's
  // realistically achievable that the model was never told to account for.
  const currentYear = new Date().getFullYear();
  const yearsUntilGraduation = context.student.graduationYear !== null ? context.student.graduationYear - currentYear : null;
  const gradeContext =
    yearsUntilGraduation !== null
      ? `Graduating ${context.student.graduationYear} (${yearsUntilGraduation} year${yearsUntilGraduation === 1 ? "" : "s"} from now).`
      : "Graduation year not on file.";

  // 2026-09-04, research-generator audit follow-up
  // (docs/handoffs/research-project-generator-audit-2026-09-04.md): this function builds its
  // own prompt rather than calling formatContextForPrompt, so it missed the 2026-09-02
  // raw-enum-leak sweep entirely — the model was seeing the literal stored token ("5_10h"),
  // not "5-10 hours a week", for one of the inputs the spec calls out by name (Phase 64:
  // "Do not recommend 15 hours of extracurricular work to a student with 3 free hours").
  // Same fix as student-context.ts's own formatContextForPrompt, same accessor, reused not
  // reinvented.
  const timeBudgetText = context.student.weeklyTimeBudget ? timeBudgetLabel(context.student.weeklyTimeBudget, context.student.preferredLanguage) : "not set";
  // `skills` reached context for the first time in this same pass (see student-context.ts's
  // interface comment) — without this, `requiredSkills` on a generated project was the model
  // inventing what a project needs with zero signal about what the student already has.
  const skillsText =
    context.skills.length > 0 ? context.skills.map((s) => `${s.name} [${skillCategoryLabel(s.category, context.student.preferredLanguage)}]`).join(", ") : "none listed";

  const provider = getAIProvider();
  const result = await withUsageLogging({ userId: params.userId, feature: "research_generator", selectModel: (uid) => selectModelForUser(uid, params.tier) }, (model) =>
    provider.generateStructured({
      system: withOutputLanguage(SYSTEM_PROMPT, context.student.preferredLanguage),
      prompt: `Student field of interest: ${params.field}\nOther interests: ${params.interests.join(", ") || "none stated"}\n${gradeContext}\nWeekly time budget: ${timeBudgetText}\nExisting skills: ${skillsText}\nCurrent research score: ${context.profileScores.find((s) => s.dimension === "research")?.score ?? "unknown"}/100\n\nCurrent research literature in this space, for grounding:\n${themesContext}\n\nGenerate up to 3 achievable research project ideas, building on the student's existing skills where relevant rather than assuming they start from zero.`,
      schema: ResearchProjectListSchema,
      schemaName: "record_research_projects",
      schemaDescription: "Records up to 3 achievable research project ideas for the student.",
      maxTokens: 2048,
      model,
    }),
  );

  return result.data.projects;
}
