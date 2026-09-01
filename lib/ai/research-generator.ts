import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";
import { openAlexProvider } from "@/lib/providers/openalex";
import { buildStudentAdvisorContext } from "./student-context";
import { withOutputLanguage } from "./output-language";

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

Scale difficulty and scope to the student's stated experience and available weekly time. Use the real paper
titles and topics provided as grounding for what's currently being studied in this space — reference the
kind of question being asked in the field, not the specific papers verbatim. Never fabricate a dataset,
API, or source that doesn't actually exist publicly.`;

export async function generateResearchProjects(params: { userId: string; interests: string[]; field: string }): Promise<ResearchProject[]> {
  const context = await buildStudentAdvisorContext(params.userId);

  const searchQuery = [params.field, ...params.interests].filter(Boolean).join(" ");
  const worksResult = await openAlexProvider.searchWorks(searchQuery, 8);
  const themesContext = worksResult.success && worksResult.data.length > 0
    ? worksResult.data.map((w) => `- "${w.title}" (${w.publicationYear ?? "n.d."}) — topics: ${w.topics.slice(0, 3).join(", ") || "n/a"}`).join("\n")
    : "No live research database results available — rely on general knowledge of the field and stay conservative about what's current.";

  const provider = getAIProvider();
  const result = await provider.generateStructured({
    system: withOutputLanguage(SYSTEM_PROMPT, context.student.preferredLanguage),
    prompt: `Student field of interest: ${params.field}\nOther interests: ${params.interests.join(", ") || "none stated"}\nWeekly time budget: ${context.student.weeklyTimeBudget ?? "not set"}\nCurrent research score: ${context.profileScores.find((s) => s.dimension === "research")?.score ?? "unknown"}/100\n\nCurrent research literature in this space, for grounding:\n${themesContext}\n\nGenerate up to 3 achievable research project ideas.`,
    schema: ResearchProjectListSchema,
    schemaName: "record_research_projects",
    schemaDescription: "Records up to 3 achievable research project ideas for the student.",
    maxTokens: 2048,
  });

  await logAIUsage({ userId: params.userId, feature: "research_generator", usage: result.usage });
  return result.data.projects;
}
