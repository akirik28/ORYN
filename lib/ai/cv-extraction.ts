import "server-only";

import { z } from "zod";
import mammoth from "mammoth";
import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";
import { selectModelForUser } from "./limits/budget";

const ExtractedItemSchema = z.object({
  title: z.string(),
  organization: z.string().nullable(),
  description: z.string().nullable(),
  startDate: z.string().nullable().describe("ISO date (YYYY-MM-DD) if known, else null. Approximate to the 1st of the month if only a month/year is given."),
  endDate: z.string().nullable().describe("null if ongoing or unknown"),
  confidence: z.enum(["high", "medium", "low"]).describe("How clearly the document supports this item"),
});

export const CVExtractionSchema = z.object({
  education: z.array(ExtractedItemSchema.extend({ schoolName: z.string().nullable() })).max(10),
  activities: z.array(ExtractedItemSchema).max(20),
  awards: z.array(ExtractedItemSchema).max(20),
  projects: z.array(ExtractedItemSchema).max(15),
  research: z.array(ExtractedItemSchema).max(10),
  workExperience: z.array(ExtractedItemSchema).max(15),
  skills: z.array(z.string()).max(30),
  languages: z.array(z.string()).max(10),
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
  borderline item with low confidence than to silently drop it.`;

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
 * offer retry / manual entry (Phase 61), never silently drop it.
 */
export async function extractCVData(params: {
  userId: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<CVExtractionResult> {
  const document = await toAIDocument(params.mimeType, params.buffer);

  try {
    const provider = getAIProvider();
    const selection = await selectModelForUser(params.userId);
    const result = await provider.generateStructured({
      system: SYSTEM_PROMPT,
      prompt: "Extract every education entry, activity, award, project, research experience, work experience, skill, and language from the attached CV.",
      documents: [document],
      schema: CVExtractionSchema,
      schemaName: "record_cv_extraction",
      schemaDescription: "Records the structured data extracted from the student's CV.",
      maxTokens: 4096,
      model: selection.model,
    });

    await logAIUsage({
      userId: params.userId,
      feature: "cv_extraction",
      usage: result.usage,
      model: result.model,
      degraded: selection.degraded,
      degradeReason: selection.degraded ? selection.reason : null,
    });
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
