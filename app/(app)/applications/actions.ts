"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/analytics/log";
import type { ApplicationStatus, ApplicationType, RequirementStatus } from "@/types/database";

const DEFAULT_REQUIREMENTS = ["application", "transcript", "test_score", "essay", "recommendation", "portfolio", "interview", "financial_aid"];

export async function createApplication(params: {
  targetUniversityId: string;
  applicationType: ApplicationType;
  deadline: string | null;
}): Promise<{ error?: string; applicationId?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      user_id: session.userId!,
      target_university_id: params.targetUniversityId,
      application_type: params.applicationType,
      deadline: params.deadline,
      status: "not_started",
      notes: null,
    })
    .select()
    .single();

  if (error || !application) return { error: "Couldn't create application." };

  // Best-effort, same posture as onboarding's secondary writes: the application row above
  // is the record that matters and is already saved, so a failure here logs and continues
  // rather than discarding a successfully created application over its default checklist.
  // Safe to degrade this way — computeReadiness (lib/applications/readiness.ts) already
  // treats zero requirements as "unmeasured", not zero-percent, so a student who hits this
  // just sees an application with nothing tracked yet instead of a crash.
  const { error: requirementsError } = await supabase.from("application_requirements").insert(
    DEFAULT_REQUIREMENTS.map((requirement_type) => ({
      application_id: application.id,
      user_id: session.userId!,
      requirement_type,
      title: null,
      status: "not_started" as const,
      notes: null,
    }))
  );
  if (requirementsError) {
    console.error("[applications] application created, but default checklist failed to save", {
      applicationId: application.id,
      error: requirementsError.message,
    });
  }

  revalidatePath("/applications");
  return { applicationId: application.id };
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't update status." };
  await logEvent(session.userId!, "application_updated", { applicationId, status });
  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}`);
  return {};
}

export async function updateRequirementStatus(requirementId: string, status: RequirementStatus): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("application_requirements")
    .update({ status })
    .eq("id", requirementId)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't update requirement." };
  revalidatePath("/applications", "layout");
  return {};
}

// Both notes fields (Phase 22) below trim to null rather than storing an empty string, so
// "no note" stays a single, consistent representation rather than two ("" and null) a
// future read would have to treat as equivalent everywhere it checks for absence.

export async function updateApplicationNotes(applicationId: string, notes: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const trimmed = notes.trim();

  const { error } = await supabase
    .from("applications")
    .update({ notes: trimmed || null })
    .eq("id", applicationId)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't save your note." };
  revalidatePath(`/applications/${applicationId}`);
  return {};
}

export async function updateRequirementNotes(requirementId: string, notes: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const trimmed = notes.trim();

  const { error } = await supabase
    .from("application_requirements")
    .update({ notes: trimmed || null })
    .eq("id", requirementId)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't save your note." };
  revalidatePath("/applications", "layout");
  return {};
}
