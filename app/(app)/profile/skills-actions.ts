"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";
import { SkillSchema, type SkillFormInput } from "@/lib/validation/achievements";
import { canAddAnotherSkill, isDuplicateSkillName } from "@/lib/social/skills";
import { resolveLocale } from "@/lib/i18n/locale";

type ActionResult = { error?: string };

async function afterSkillsWrite(userId: string) {
  try {
    await recomputeCareerProfile(userId);
  } catch (error) {
    console.error("[profile] failed to recompute career profile after skills edit", error);
  }
  revalidatePath("/profile");
  revalidatePath(`/u/${userId}`);
  revalidatePath("/dashboard");
}

/**
 * Cap (max 15) and case-insensitive dedup (lib/social/skills.ts) are re-checked here for
 * a friendly error message — migration 0034's `skills_user_name_idx` unique index is the
 * real, final backstop for dedup; there is no DB-level cap on count, so the 15-skill
 * limit exists only here (a soft product limit, not a security boundary, so app-layer
 * enforcement is sufficient).
 */
export async function createSkill(input: SkillFormInput): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = SkillSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("skills").select("name").eq("user_id", session.userId!);
  const existingNames = (existing ?? []).map((s) => s.name);

  if (!canAddAnotherSkill(existingNames.length)) return { error: "You can have up to 15 skills. Remove one before adding another." };
  if (isDuplicateSkillName(existingNames, parsed.data.name)) return { error: "You already have that skill." };

  const { error } = await supabase.from("skills").insert({ ...parsed.data, user_id: session.userId! });
  if (error) {
    console.error("[profile] createSkill failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save", await resolveLocale()) };
  }

  await afterSkillsWrite(session.userId!);
  return {};
}

export async function updateSkill(id: string, input: SkillFormInput): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = SkillSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("skills").select("id, name").eq("user_id", session.userId!);
  const otherNames = (existing ?? []).filter((s) => s.id !== id).map((s) => s.name);
  if (isDuplicateSkillName(otherNames, parsed.data.name)) return { error: "You already have that skill." };

  const { error } = await supabase.from("skills").update(parsed.data).eq("id", id).eq("user_id", session.userId!);
  if (error) {
    console.error("[profile] updateSkill failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("save", await resolveLocale()) };
  }

  await afterSkillsWrite(session.userId!);
  return {};
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("skills").delete().eq("id", id).eq("user_id", session.userId!);
  if (error) {
    console.error("[profile] deleteSkill failed", { code: error.code, message: error.message });
    return { error: toFriendlyDbErrorMessage("delete", await resolveLocale()) };
  }

  await afterSkillsWrite(session.userId!);
  return {};
}
