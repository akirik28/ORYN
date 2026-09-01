import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";
import { withOutputLanguage } from "./output-language";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Essay Story Bank (founder-confirmed MVP scope). Deliberately NOT an essay writer: it
 * takes experiences the student already recorded in their own profile and helps them see
 * which ones carry a real story, then offers structures for telling it. The student writes
 * the essay. See docs/product-decisions.md.
 */

const OutlineSchema = z.object({
  angle: z.string().describe("A one-line description of the narrative angle this outline takes on the same experience."),
  hook: z.string().describe("What concrete moment or image the essay could open on. Must come from the student's own notes, never invented."),
  context: z.string().describe("What the reader needs to know to understand the situation."),
  conflict: z.string().describe("The real tension, obstacle, or uncertainty the student described."),
  action: z.string().describe("What the student actually did about it, per their own notes."),
  turningPoint: z.string().describe("The moment something shifted — in the situation or in the student's thinking."),
  reflection: z.string().describe("What the student's own notes suggest they took away. Phrase as a question or prompt if their notes don't say."),
  connectionToFuture: z.string().describe("How this could connect to what they want next, based on their stated goals and interests."),
});

const StoryCandidateSchema = z.object({
  experienceTitle: z.string().describe("The exact title of the profile experience this story comes from."),
  whyThisStory: z.string().describe("Why this experience has real narrative material for this specific prompt — reference the student's own details."),
  missingDetail: z
    .string()
    .nullable()
    .describe("One specific thing the student should add to their story notes to make this stronger. Null if their notes are already rich enough."),
  outlines: z.array(OutlineSchema).min(1).max(3).describe("Two or three genuinely different structures for the same true experience."),
});

const EssayOutlineResponseSchema = z.object({
  candidates: z.array(StoryCandidateSchema).min(1).max(3).describe("The two or three experiences with the most real material for this prompt."),
  notEnoughMaterial: z
    .string()
    .nullable()
    .describe("If the student's records are too thin to build an honest story from, say so plainly here and set candidates to the best available anyway. Null when there's enough."),
});

export type EssayOutlineResponse = z.infer<typeof EssayOutlineResponseSchema>;
export type StoryCandidate = z.infer<typeof StoryCandidateSchema>;

const SYSTEM_PROMPT = `You help a high-school student find which of their OWN real experiences could become a
strong application essay, and how they might structure it. You are not writing the essay.

Absolute rules:
- NEVER invent an event, feeling, quote, person, outcome, or detail. Every element of every outline must
  trace back to something in the experiences given to you. If a section has no material, say what the
  student would need to recall — do not fill it in for them.
- Do not write finished prose. Outlines are short structural prompts, not paragraphs the student can paste.
- Prefer the experience with genuine specific detail over the one with the most impressive title. A small
  honest story beats a prestigious vague one, and admissions readers can tell the difference.
- If the student's notes are thin everywhere, say so in notEnoughMaterial and tell them which questions to
  answer in their story notes first. That is more useful than a fabricated-sounding outline.
- Never flatter. No "what an incredible journey." Be specific and direct.
- The student's story notes are their private reflections — treat them as the richest source, more than the
  CV-facing description.`;

export interface StoryBankExperience {
  category: string;
  title: string;
  organization: string | null;
  description: string | null;
  storyNotes: string | null;
  startDate: string | null;
  endDate: string | null;
  ongoing: boolean;
}

function formatExperience(e: StoryBankExperience): string {
  const when = [e.startDate, e.ongoing ? "present" : e.endDate].filter(Boolean).join(" to ") || "date not given";
  return [
    `- [${e.category}] ${e.title}${e.organization ? ` (${e.organization})` : ""} — ${when}`,
    e.description ? `  Description: ${e.description}` : null,
    e.storyNotes ? `  Story notes (the student's own private reflections): ${e.storyNotes}` : "  Story notes: (none written yet)",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateEssayOutlines(params: {
  userId: string;
  /** The student's current UI language. Additive and optional — an un-migrated caller
   *  keeps English, which is what the prompt was written in. */
  locale?: Locale;
  essayPrompt: string;
  experiences: StoryBankExperience[];
  goals: string[];
}): Promise<EssayOutlineResponse> {
  const provider = getAIProvider();

  const result = await provider.generateStructured({
    system: withOutputLanguage(SYSTEM_PROMPT, params.locale ?? DEFAULT_LOCALE),
    prompt: [
      `Essay prompt the student is answering:\n${params.essayPrompt}`,
      "",
      `The student's stated goals: ${params.goals.length > 0 ? params.goals.join("; ") : "(none recorded)"}`,
      "",
      "The student's recorded experiences:",
      params.experiences.map(formatExperience).join("\n"),
      "",
      "Pick the 2-3 experiences with the most real material for this specific prompt, and give 2-3 genuinely different outlines for each. Use only what's above.",
    ].join("\n"),
    schema: EssayOutlineResponseSchema,
    schemaName: "essay_story_outlines",
    schemaDescription: "Records story candidates drawn from the student's own experiences, with structural outlines for each.",
    maxTokens: 3000,
  });

  await logAIUsage({ userId: params.userId, feature: "essay_story_bank", usage: result.usage });
  return result.data;
}
