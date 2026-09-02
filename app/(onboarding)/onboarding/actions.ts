"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { insertCvImportItems } from "@/lib/profile/cv-import";
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
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";
import { resolveEntity } from "@/lib/entities/resolve";
import { CompleteOnboardingSchema, INTEREST_SUGGESTIONS, type CompleteOnboardingInput } from "@/lib/validation/onboarding";
import { shouldRunOnboardingSecondaryWrites, writeStudentInterests } from "@/lib/onboarding/complete-onboarding";
import { meetsMinimumSignupAge } from "@/lib/legal/age-policy";
import { getTranslations } from "next-intl/server";

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
    await assertWithinAIRateLimit(session.userId!, "cv_extraction", { maxCalls: 5, windowMinutes: 60 }, await resolveLocale());
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
      // Phase 61: "Log the failure." This is the actual extraction-failed case (a schema
      // validation miss, a malformed model response, a document Claude couldn't parse) —
      // logging `.cause` (the real underlying error `extractCVData` wrapped, not this
      // wrapper's own friendly message) is what makes a systematic extraction problem
      // (a schema drift, a provider change) visible in server logs instead of only ever
      // reaching a student as "we couldn't fully read this document," indistinguishable
      // from a genuinely bad upload. Found missing during the 2026-09-02 CV-import audit —
      // every OTHER branch in this catch either logs or is a validated, expected condition
      // (rate limit, misconfiguration, unsupported type); this one, the actual "parsing
      // failed" case Phase 61 is about, was the one left silent.
      console.error("[onboarding] CV extraction failed", { cause: error.cause });
      return { success: false, error: error.message };
    }
    console.error("[onboarding] CV extraction failed", error);
    return { success: false, error: "We couldn't fully read this document. You can retry or add the information manually." };
  }
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const parsed = CompleteOnboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const data = parsed.data;

  // Deliberately separate from the schema's own birthYear bounds above: those catch
  // typos and implausible values (format), this is the actual minimum-age policy
  // (lib/legal/age-policy.ts) — a product default pending legal review, not something
  // to fold into the format check, so it can move on its own without touching that
  // validator or its own test coverage (__tests__/onboarding/birth-year-collection.test.ts
  // deliberately asserts the schema stays permissive down to 10 years for exactly this
  // reason). Checked here, after the schema parse, rather than blocking the request
  // earlier: everything else about the submission is still worth validating and telling
  // the student about even when this specific check fails.
  if (!meetsMinimumSignupAge(data.birthYear)) {
    const t = await getTranslations("onboarding.wizard");
    return { error: t("birthYearTooYoung") };
  }

  const supabase = await createClient();

  // Idempotency guard: re-derived from the profile row actually on file, never from
  // client-submitted state — a stale tab, a double form submit, or a network retry must
  // not re-append the one-time writes below. See lib/onboarding/complete-onboarding.ts's
  // own comment for the live bug this closes (5 duplicate rows in career_goals and
  // education_records from a single account being onboarded more than once).
  const { data: existingProfile } = await supabase.from("profiles").select("onboarding_completed").eq("id", userId).single();
  const runSecondaryWrites = shouldRunOnboardingSecondaryWrites({ onboarding_completed: existingProfile?.onboarding_completed ?? null });

  // Canonical Entity Autocomplete System: an id the client sent is re-verified against
  // the canonical registry (entity_type='school') before it's persisted — never trusted
  // blindly, so nothing but a school can be smuggled into school_entity_id. A verified
  // match also overwrites school_name with the entity's CURRENT display name, so the
  // denormalized text column every existing read path uses never drifts from the linked
  // entity. A rejected id fails the whole save rather than silently storing free text
  // under a link the student thinks they made.
  let schoolId: string | null = null;
  let schoolName = data.schoolName;
  if (data.schoolId) {
    const resolved = await resolveEntity(supabase, "school", data.schoolId);
    if (!resolved) return { error: "That school couldn't be verified. Please search and select it again." };
    schoolId = resolved.id;
    schoolName = resolved.canonicalName;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      country: data.country,
      school_name: schoolName,
      school_entity_id: schoolId,
      graduation_year: data.graduationYear,
      birth_year: data.birthYear,
      curriculum: data.curriculum,
      target_geographies: data.targetGeographies,
      onboarding_completed: true,
      onboarding_step: "completed",
    })
    .eq("id", userId);

  if (profileError) {
    console.error("[onboarding] failed to save profile", { code: profileError.code, message: profileError.message });
    return { error: toFriendlyDbErrorMessage("save") };
  }

  // Best-effort: the student's core profile + onboarding_completed above is the critical
  // path. If any of these secondary inserts fail, log and continue rather than stranding
  // the student on the onboarding screen. Guarded by runSecondaryWrites above — these are
  // one-time appends, not safe to repeat if onboarding was already completed before this
  // call (see the idempotency-guard comment above).
  if (runSecondaryWrites) {
    try {
      // Each secondary write below now checks its own `error` explicitly rather than relying
      // on the surrounding try/catch: supabase-js resolves `{ error }` rather than throwing
      // on a Postgres-level failure, so the catch below only ever caught a network exception
      // — a real write failure on either of these two bare calls was previously invisible
      // even to this function's own "log and continue" comment above.
      if (data.goals.length > 0) {
        const { error: goalsError } = await supabase
          .from("career_goals")
          .insert(data.goals.map((title) => ({ user_id: userId, title, category: "onboarding", target_date: null })));
        if (goalsError) console.error("[onboarding] career_goals insert failed", { userId, error: goalsError.message });
      }
      await writeStudentInterests(supabase, userId, data.interests, KNOWN_INTERESTS);
      // profiles above stores this same school/curriculum/country for quick reads, but
      // education_records is what completeness checks and the Advisor's nudges actually
      // query — without this insert, a student was told "Add an education record" about
      // the school they'd just entered two steps earlier. schoolName/schoolId are already
      // server-verified above; graduationYear isn't a real date, so it isn't forced into
      // start_date/end_date rather than guessed.
      const { error: educationError } = await supabase.from("education_records").insert({
        user_id: userId,
        school_name: schoolName,
        school_entity_id: schoolId,
        country: data.country,
        curriculum: data.curriculum,
        start_date: null,
        end_date: null,
        overall_gpa: null,
        gpa_scale: null,
        notes: null,
      });
      if (educationError) console.error("[onboarding] education_records insert failed", { userId, error: educationError.message });
      if (data.extractedItems && data.extractedItems.length > 0) {
        // Shared with the post-onboarding importer at /profile/import — see
        // lib/profile/cv-import.ts. The per-table shape differences (education has no
        // title; work_experiences.organization is NOT NULL) live there rather than being
        // written out twice.
        await insertCvImportItems(supabase, userId, data.extractedItems);
      }

      await recomputeCareerProfile(userId, { snapshotReason: "onboarding_completed" });
    } catch (error) {
      console.error("[onboarding] secondary data save failed", error);
    }
    await logEvent(userId, "onboarding_completed");
  }

  redirect("/dashboard");
}
