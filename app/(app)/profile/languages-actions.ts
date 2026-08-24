"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";
import { LanguageSchema, type LanguageFormInput } from "@/lib/validation/achievements";

type ActionResult = { error?: string };

/**
 * Languages CRUD.
 *
 * Mirrors `skills-actions.ts` deliberately, including the case-insensitive duplicate
 * check: a student who records "english" and later "English" has one language, not two,
 * and the profile should say so before the row lands.
 *
 * There is no DB unique index on `languages(user_id, name)` the way migration 0034 added
 * one for skills, so unlike skills this check is the *only* thing preventing duplicates.
 * If that ever changes, this stays useful for the friendly message but stops being the
 * backstop.
 */
function isDuplicateLanguage(existing: string[], candidate: string): boolean {
  const normalized = candidate.trim().toLowerCase();
  return existing.some((name) => name.trim().toLowerCase() === normalized);
}

async function afterLanguagesWrite(userId: string) {
  // Languages feed intellectual curiosity's breadth signal indirectly via the profile's
  // completeness, so the recompute is kept for parity with skills — a failure here must
  // not fail the write the student actually asked for.
  try {
    await recomputeCareerProfile(userId);
  } catch (error) {
    console.error("[profile] failed to recompute career profile after languages edit", error);
  }
  revalidatePath("/profile");
  revalidatePath(`/u/${userId}`);
  revalidatePath("/dashboard");
}

export async function createLanguage(input: LanguageFormInput): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = LanguageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("languages").select("name").eq("user_id", session.userId!);
  if (isDuplicateLanguage((existing ?? []).map((l) => l.name), parsed.data.name)) {
    return { error: "You've already added that language." };
  }

  const { error } = await supabase.from("languages").insert({ ...parsed.data, user_id: session.userId! });
  if (error) {
    console.error("[profile] createLanguage failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save") };
  }

  await afterLanguagesWrite(session.userId!);
  return {};
}

export async function updateLanguage(id: string, input: LanguageFormInput): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = LanguageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("languages").select("id, name").eq("user_id", session.userId!);
  const otherNames = (existing ?? []).filter((l) => l.id !== id).map((l) => l.name);
  if (isDuplicateLanguage(otherNames, parsed.data.name)) return { error: "You've already added that language." };

  const { error } = await supabase.from("languages").update(parsed.data).eq("id", id).eq("user_id", session.userId!);
  if (error) {
    console.error("[profile] updateLanguage failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save") };
  }

  await afterLanguagesWrite(session.userId!);
  return {};
}

export async function deleteLanguage(id: string): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("languages").delete().eq("id", id).eq("user_id", session.userId!);
  if (error) {
    console.error("[profile] deleteLanguage failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("delete") };
  }

  await afterLanguagesWrite(session.userId!);
  return {};
}
