"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import {
  extractCVData,
  SUPPORTED_CV_MIME_TYPES,
  CVExtractionFailedError,
  UnsupportedCVFileTypeError,
  type CVExtractionResult,
} from "@/lib/ai/cv-extraction";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { logEvent } from "@/lib/analytics/log";
import { CompleteOnboardingSchema, INTEREST_SUGGESTIONS, type CompleteOnboardingInput } from "@/lib/validation/onboarding";

const KNOWN_INTERESTS = new Set<string>(INTEREST_SUGGESTIONS);

const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;

export type CVUploadResult =
  | { success: true; extraction: CVExtractionResult; filePath: string }
  | { success: false; error: string };

/** Uploads the CV to private storage, then runs AI extraction. The upload always
 * succeeds independently of extraction (Phase 61) — a parsing failure never loses the
 * file. */
export async function uploadAndExtractCV(formData: FormData): Promise<CVUploadResult> {
  const session = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false, error: "No file was uploaded." };
  }
  if (file.size > MAX_CV_SIZE_BYTES) {
    return { success: false, error: "File is too large (10MB max)." };
  }
  if (!SUPPORTED_CV_MIME_TYPES.includes(file.type as (typeof SUPPORTED_CV_MIME_TYPES)[number])) {
    return { success: false, error: "Upload a PDF, DOCX, or plain text file." };
  }

  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = `${session.userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

  const { error: uploadError } = await supabase.storage.from("cv-uploads").upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  try {
    await assertWithinAIRateLimit(session.userId!, "cv_extraction", { maxCalls: 5, windowMinutes: 60 });
    const extraction = await extractCVData({ userId: session.userId!, mimeType: file.type, buffer });
    await logEvent(session.userId!, "cv_imported", { itemCount: extraction.education.length + extraction.activities.length + extraction.awards.length + extraction.projects.length + extraction.research.length + extraction.workExperience.length });
    return { success: true, extraction, filePath };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, error: error.message };
    }
    if (error instanceof AIProviderNotConfiguredError) {
      return { success: false, error: "AI CV import isn't configured yet. Try entering your profile manually." };
    }
    if (error instanceof UnsupportedCVFileTypeError) {
      return { success: false, error: error.message };
    }
    if (error instanceof CVExtractionFailedError) {
      return { success: false, error: error.message };
    }
    console.error("[onboarding] CV extraction failed", error);
    return { success: false, error: "We couldn't fully read this document. You can retry or add the information manually." };
  }
}

const CATEGORY_TABLE = {
  education: "education_records",
  activities: "activities",
  awards: "awards",
  projects: "projects",
  research: "research_experiences",
  workExperience: "work_experiences",
} as const;

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const parsed = CompleteOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      country: data.country,
      school_name: data.schoolName,
      graduation_year: data.graduationYear,
      curriculum: data.curriculum,
      target_geographies: data.targetGeographies,
      onboarding_completed: true,
      onboarding_step: "completed",
    })
    .eq("id", userId);

  if (profileError) {
    return { error: `Couldn't save your profile: ${profileError.message}` };
  }

  // Best-effort: the student's core profile + onboarding_completed above is the critical
  // path. If any of these secondary inserts fail, log and continue rather than stranding
  // the student on the onboarding screen.
  try {
    if (data.goals.length > 0) {
      await supabase
        .from("career_goals")
        .insert(data.goals.map((title) => ({ user_id: userId, title, category: "onboarding", target_date: null })));
    }
    if (data.interests.length > 0) {
      await supabase
        .from("student_interests")
        .insert(data.interests.map((label) => ({ user_id: userId, label, is_custom: !KNOWN_INTERESTS.has(label) })));
    }
    if (data.extractedItems && data.extractedItems.length > 0) {
      const byCategory = new Map<string, typeof data.extractedItems>();
      for (const item of data.extractedItems) {
        byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
      }
      for (const [category, items] of byCategory) {
        const table = CATEGORY_TABLE[category as keyof typeof CATEGORY_TABLE];
        const rows = items.map((item) =>
          category === "education"
            ? {
                user_id: userId,
                school_name: item.organization || item.title,
                start_date: item.startDate,
                end_date: item.endDate,
                notes: item.description,
                is_current: !item.endDate,
              }
            : category === "workExperience"
              ? {
                  user_id: userId,
                  title: item.title,
                  organization: item.organization || "Unknown",
                  description: item.description,
                  start_date: item.startDate,
                  end_date: item.endDate,
                  source: "cv_import",
                }
              : {
                  user_id: userId,
                  title: item.title,
                  organization: item.organization,
                  description: item.description,
                  start_date: item.startDate,
                  end_date: item.endDate,
                  source: "cv_import",
                }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name is dynamic across differently-shaped tables
        await (supabase.from(table as any) as any).insert(rows);
      }
    }

    await recomputeCareerProfile(userId, { snapshotReason: "onboarding_completed" });
  } catch (error) {
    console.error("[onboarding] secondary data save failed", error);
  }

  await logEvent(userId, "onboarding_completed");
  redirect("/dashboard");
}
