import "server-only";

import { z } from "zod";
import mammoth from "mammoth";
import { getAIProvider } from "./index";
import { withUsageLogging } from "./usage";

const ExtractedItemSchema = z.object({
  title: z.string(),
  organization: z.string().nullable(),
  description: z.string().nullable(),
  startDate: z.string().nullable().describe("ISO date (YYYY-MM-DD) if known, else null. Approximate to the 1st of the month if only a month/year is given."),
  endDate: z.string().nullable().describe("null if ongoing or unknown"),
  confidence: z.enum(["high", "medium", "low"]).describe("How clearly the document supports this item"),
});

/**
 * 2026-09-02: skills/languages moved from bare strings to small structured objects, just
 * enough for each to save into its real table without inventing a value the document
 * doesn't support. `skills.category` is asked for because the DB column is NOT NULL with a
 * sensible fallback ('other') — a wrong-but-plausible guess costs nothing, since nothing
 * downstream compares it against an external requirement. `languages.statedLevel` is
 * deliberately NOT the CEFR enum the `languages.proficiency` column actually stores:
 * lib/vocabularies/languages.ts's own header comment is explicit about why that column
 * exists — "a student recording 'C1' here is recording something a requirement check can
 * compare against, which free text never could" — so a model-guessed letter grade would be
 * exactly the false precision the rest of this codebase avoids. `statedLevel` instead
 * carries whatever the document actually says (verbatim or lightly paraphrased — "native",
 * "conversational", "B2", null if nothing is stated) as a hint shown to the student, who
 * picks the real CEFR value themselves during review from the same closed list the manual
 * language form already uses. Neither array gets a `confidence` field, unlike every
 * achievement category — a bare name (or name plus one low-stakes attribute) has no
 * comparable "did I infer the category or the dates" ambiguity to signal.
 */
const ExtractedSkillSchema = z.object({
  name: z.string(),
  category: z
    .enum(["technical", "creative", "analytical", "communication", "leadership", "other"])
    .describe("Best guess from context; use 'other' if genuinely unclear rather than forcing a stronger signal than the document supports."),
});

const ExtractedLanguageSchema = z.object({
  name: z.string(),
  statedLevel: z
    .string()
    .nullable()
    .describe(
      "The proficiency exactly as the document states or implies it (e.g. 'native', 'conversational', 'B2'), verbatim or lightly paraphrased. Null if no level is mentioned at all. Never invent a CEFR letter the document doesn't support.",
    ),
});

export const CVExtractionSchema = z.object({
  education: z.array(ExtractedItemSchema.extend({ schoolName: z.string().nullable() })).max(10),
  activities: z.array(ExtractedItemSchema).max(20),
  awards: z.array(ExtractedItemSchema).max(20),
  projects: z.array(ExtractedItemSchema).max(15),
  research: z.array(ExtractedItemSchema).max(10),
  workExperience: z.array(ExtractedItemSchema).max(15),
  skills: z.array(ExtractedSkillSchema).max(30),
  languages: z.array(ExtractedLanguageSchema).max(10),
  unclassified: z
    .array(z.string())
    .max(20)
    .describe("Short snippets that looked meaningful but didn't clearly fit another category"),
});

export type CVExtractionResult = z.infer<typeof CVExtractionSchema>;
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

const SYSTEM_PROMPT = `You extract structured achievement data from a student's CV or resume for Oryn, a
career-planning product for students aged roughly 14-18.

Rules:
- Only extract what is actually written in the document. Never invent organizations, dates, honors, or
  numbers that aren't stated or clearly implied.
- If a detail is ambiguous or missing, use null rather than guessing.
- Set "confidence" honestly: "low" if you had to infer category or dates, "high" if the document states
  the item plainly.
- Put anything that looks meaningful but doesn't cleanly fit a category into "unclassified" rather than
  forcing it into the wrong bucket.
- The student will review and correct every item before anything is saved, so it's better to extract a
  borderline item with low confidence than to silently drop it.
- For each skill, pick the closest "category"; use "other" rather than forcing a poor fit.
- For each language, set "statedLevel" to whatever the document actually says about proficiency
  (e.g. "native", "conversational", "B2"), verbatim or lightly paraphrased — null if nothing is
  stated. Never translate this into a CEFR letter yourself; the student sets the real level.`;

export const SUPPORTED_CV_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
] as const;

export class UnsupportedCVFileTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported file type "${mimeType}". Upload a PDF, DOCX, or plain text file.`);
    this.name = "UnsupportedCVFileTypeError";
  }
}

export class CVExtractionFailedError extends Error {
  constructor(cause: unknown) {
    super("We couldn't fully read this document. You can retry or add the information manually.");
    this.name = "CVExtractionFailedError";
    this.cause = cause;
  }
}

/**
 * Extracts structured achievement data from an uploaded CV (Phase 60). PDFs and plain
 * text go to Claude as native document content (better than a text-extraction library for
 * multi-column layouts and tables); DOCX is converted to plain text first via mammoth
 * since Claude's API doesn't accept DOCX directly.
 *
 * On failure, throws CVExtractionFailedError — callers must keep the uploaded file and
 * offer retry / manual entry (Phase 61), never silently drop it. Goes through
 * withUsageLogging (added 2026-09-02) rather than a bare generateStructured +
 * logAIUsage pair — a retry-exhausted schema-validation failure is up to two real, billed
 * calls, and without this the outer catch below would swallow that spend into
 * CVExtractionFailedError with no record of it ever having happened.
 */
export async function extractCVData(params: {
  userId: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<CVExtractionResult> {
  const document = await toAIDocument(params.mimeType, params.buffer);

  try {
    const provider = getAIProvider();
    const result = await withUsageLogging({ userId: params.userId, feature: "cv_extraction" }, (model) =>
      provider.generateStructured({
        system: SYSTEM_PROMPT,
        prompt: "Extract every education entry, activity, award, project, research experience, work experience, skill, and language from the attached CV.",
        documents: [document],
        schema: CVExtractionSchema,
        schemaName: "record_cv_extraction",
        schemaDescription: "Records the structured data extracted from the student's CV.",
        maxTokens: 4096,
        model,
      }),
    );
    return result.data;
  } catch (error) {
    throw new CVExtractionFailedError(error);
  }
}

async function toAIDocument(mimeType: string, buffer: Buffer): Promise<{ mediaType: "application/pdf" | "text/plain"; data: string }> {
  if (mimeType === "application/pdf") {
    return { mediaType: "application/pdf", data: buffer.toString("base64") };
  }

  if (mimeType === "text/plain") {
    return { mediaType: "text/plain", data: buffer.toString("utf-8") };
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const { value: text } = await mammoth.extractRawText({ buffer });
    return { mediaType: "text/plain", data: text };
  }

  throw new UnsupportedCVFileTypeError(mimeType);
}
