"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { isUndefinedTableError } from "@/lib/supabase/errors";
import type { PlanTier } from "@/types/database";

/** Generous enough for a real complaint in a student's own words, capped enough to
 *  discourage an essay or abuse -- not tied to any UI-visible character counter the way
 *  curriculum_other_text's 100 is, so this stays a plain local constant rather than a
 *  shared exported one. */
const MESSAGE_MAX_LENGTH = 2000;

export type SubmitFeedbackResult =
  | { success: true }
  /** Two distinct reasons on purpose (CEO's own framing): "failed" is a real, possibly
   *  transient write failure -- retrying might work. "not_configured" means migration 0113
   *  hasn't landed yet -- retrying never will, and telling a student to try again would send
   *  them into a loop. The client renders a different message for each. */
  | { success: false; reason: "failed" | "not_configured" | "empty" };

/**
 * Migration 0113, proposed and not yet applied — see that migration's own header. Every
 * field the row needs beyond the student's own free text is derived server-side from the
 * session (userId, plan_tier) or the request (locale) — never trusted from the client, both
 * because a client could lie and because the whole point is not asking the student for
 * anything beyond what they typed and the page they were on.
 *
 * `path` IS taken from the client, because the server has no way to know which page the
 * student was looking at when they opened the report dialog — this is the one input
 * trusted from the client, and it's not sensitive (see the migration's own comment on why
 * it's pathname-only, never a full URL with query string).
 */
export async function submitFeedback(input: { message: string; path: string }): Promise<SubmitFeedbackResult> {
  const session = await requireUser();
  const userId = session.userId!;

  const message = input.message.trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!message) return { success: false, reason: "empty" };

  const supabase = await createClient();
  const locale = await resolveLocale();

  const { data: profile, error: profileError } = await supabase.from("profiles").select("plan_tier").eq("id", userId).single();
  if (profileError || !profile) {
    console.error("[feedback] failed to load plan_tier for submission", { userId, error: profileError?.message });
    return { success: false, reason: "failed" };
  }

  const { error } = await supabase.from("feedback_reports").insert({
    user_id: userId,
    message,
    // Pathname only, matching the migration's own comment -- strip a query string/hash if
    // the caller somehow passed one, rather than trust it was already clean.
    path: input.path.split("?")[0].split("#")[0] || "/",
    locale,
    plan_tier: (profile.plan_tier as PlanTier) ?? "standard",
  });

  if (error) {
    if (isUndefinedTableError(error, "feedback_reports")) {
      return { success: false, reason: "not_configured" };
    }
    console.error("[feedback] failed to save report", { code: error.code, message: error.message });
    return { success: false, reason: "failed" };
  }

  return { success: true };
}
