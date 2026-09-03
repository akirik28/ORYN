"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";
import { LanguageSchema, translateAchievementValidationError, type LanguageFormInput } from "@/lib/validation/achievements";
import { isDuplicateLanguage } from "@/lib/social/languages";
import { resolveLocale } from "@/lib/i18n/locale";

type ActionResult = { error?: string };

/**
 * Languages CRUD. Mirrors `skills-actions.ts` deliberately, including the case-insensitive
 * duplicate check (lib/social/languages.ts — pulled out to a shared module 2026-09-02 so
 * the CV-import path can reuse the exact same rule rather than a second copy).
 */
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
  const locale = await resolveLocale();
  const parsed = LanguageSchema.safeParse(input);
  if (!parsed.success) return { error: translateAchievementValidationError(parsed.error.issues[0]?.message, locale) ?? (locale === "tr" ? "Geçersiz giriş." : "Invalid input.") };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("languages").select("name").eq("user_id", session.userId!);
  if (isDuplicateLanguage((existing ?? []).map((l) => l.name), parsed.data.name)) {
    return { error: locale === "tr" ? "Bu dili zaten eklemişsin." : "You've already added that language." };
  }

  const { error } = await supabase.from("languages").insert({ ...parsed.data, user_id: session.userId! });
  if (error) {
    console.error("[profile] createLanguage failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save", locale) };
  }

  await afterLanguagesWrite(session.userId!);
  return {};
}

export async function updateLanguage(id: string, input: LanguageFormInput): Promise<ActionResult> {
  const session = await requireUser();
  const locale = await resolveLocale();
  const parsed = LanguageSchema.safeParse(input);
  if (!parsed.success) return { error: translateAchievementValidationError(parsed.error.issues[0]?.message, locale) ?? (locale === "tr" ? "Geçersiz giriş." : "Invalid input.") };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("languages").select("id, name").eq("user_id", session.userId!);
  const otherNames = (existing ?? []).filter((l) => l.id !== id).map((l) => l.name);
  if (isDuplicateLanguage(otherNames, parsed.data.name)) return { error: locale === "tr" ? "Bu dili zaten eklemişsin." : "You've already added that language." };

  const { error } = await supabase.from("languages").update(parsed.data).eq("id", id).eq("user_id", session.userId!);
  if (error) {
    console.error("[profile] updateLanguage failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save", locale) };
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
    return { error: toFriendlyDbErrorMessage("delete", await resolveLocale()) };
  }

  await afterLanguagesWrite(session.userId!);
  return {};
}
