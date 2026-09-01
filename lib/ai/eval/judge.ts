import { z } from "zod";
import type { EvalFixture } from "./types";

/**
 * The qualitative half of this harness — Phase 57's tone and Phase 39's "don't do this"
 * behavior are not things a regex can score, so this asks a second model call to read the
 * first model's reply and grade it. An LLM judge is itself an AI surface with the same
 * failure modes as the thing it's judging (it can be wrong, inconsistent, or gameable) —
 * this is a real limitation, not a solved problem, and the report should be read as a
 * signal to investigate, not a certified score. The deterministic checks in
 * deterministic-checks.ts exist precisely because the two known regressions are things
 * this harness can verify with certainty; this file is for everything that genuinely
 * needs judgment.
 */

const RubricScoresSchema = z.object({
  specific: z.number().int().min(1).max(5).describe("Concrete and grounded in this student's actual scores/activities, vs. generic advice that would fit any student"),
  concise: z.number().int().min(1).max(5).describe("Short sentences, no filler, vs. padded or repetitive"),
  analytical: z.number().int().min(1).max(5).describe("Reasons from evidence/gaps, vs. asserting conclusions"),
  calm: z.number().int().min(1).max(5).describe("No praise inflation, no false certainty, vs. cheerleading or hedging language"),
  evidenceAware: z.number().int().min(1).max(5).describe("Distinguishes verified from self-reported/unverified claims, vs. treating everything as equally certain"),
  actionOriented: z.number().int().min(1).max(5).describe("Gives something concrete to do or not do, vs. only describing the situation"),
});

export const JudgeVerdictSchema = z.object({
  scores: RubricScoresSchema,
  discourage: z.enum(["said_dont_do_this", "missed_the_opening", "n/a"]).describe(
    "n/a if the fixture description says nothing here should be discouraged; otherwise whether the reply actually told the student not to do something and said why"
  ),
  notes: z.string().describe("One or two sentences on what drove the scores — cite the specific phrase, don't just restate the number"),
});

export type { JudgeVerdict } from "./types";

export const JUDGE_SYSTEM_PROMPT = `You are grading one reply from Oryn's AI Counselor against Oryn's own published brief for what
that counsel is supposed to sound like (spec Phase 57/8.2/8.3):

Tone: specific, concise, analytical, calm, evidence-aware, action-oriented. Short sentences.
No filler, no false certainty, no empty praise ("Amazing! You're doing great!").

It is not only acceptable but often correct for the counsel to tell a student NOT to do
something — for example, not to start another club when leadership is already a strength
and research is the clear gap. You are told below whether this specific case has a genuine
occasion for that; score "discourage" as n/a if it does not, since a reply with nothing to
discourage is not wrong for not discouraging anything.

Score each of the six tone criteria 1-5 independently. A reply can be calm but not specific,
or specific but not concise — do not let one strong criterion pull the others up.

You are grading the reply's voice and judgment, not fact-checking it — assume the facts it
states about the student are accurate; that is not your job here.`;

export const JUDGE_MAX_TOKENS = 512;

export function buildJudgePrompt(fixture: EvalFixture, responseText: string): string {
  return [
    `Fixture: ${fixture.description}`,
    `Does this case have a genuine occasion to discourage something? ${fixture.expectDiscourage === "yes" ? "Yes." : "No — score discourage as n/a."}`,
    "",
    "The reply to grade:",
    "---",
    responseText,
    "---",
  ].join("\n");
}
