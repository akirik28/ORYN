"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { RateLimitExceededError } from "@/lib/ai/rate-limit";
import { logEvent } from "@/lib/analytics/log";
import { aiServiceFailureMessage } from "@/lib/ai/service-failure";
import { buildActionStatusPatch, shouldLogCompletion } from "@/lib/plan/status-patch";
import { resolveLocale } from "@/lib/i18n/locale";
import type { ActionStatus, ReflectionOutcome } from "@/types/database";

export async function regenerateWeeklyPlan(): Promise<{ error?: string }> {
  const session = await requireUser();
  const locale = await resolveLocale();
  const tr = locale === "tr";
  try {
    // The rate limit itself now lives inside getOrCreateWeeklyPlan (lib/plan/persist.ts,
    // 2026-09-02) so every caller gets it, not just this action -- removed the duplicate
    // pre-check that used to live here rather than leave two gates on the same window:
    // this action's own try/catch already handles RateLimitExceededError regardless of
    // which layer throws it, so nothing here needed to change beyond the import.
    await getOrCreateWeeklyPlan(session.userId!, { force: true });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { error: error.message };
    }
    if (error instanceof AIProviderNotConfiguredError) {
      // Same rewrite as every other AIProviderNotConfiguredError catch touched in this
      // audit (2026-09-03): a missing API key is a deployment fact, not student copy, and
      // API_SETUP.md isn't something a student can open.
      console.error("[plan] weekly plan generation unavailable: AI provider not configured");
      return { error: tr ? "Bu özellik şu anda kullanılamıyor." : "This feature isn't available right now." };
    }
    console.error("[plan] failed to regenerate weekly plan", error);
    // A spent balance or a provider outage is not something a student fixes by pressing the
    // button again — see lib/ai/service-failure.ts. Falls through to the generic wording only
    // when the error carries no status to classify on. Now passes locale (that file's own
    // header comment had documented this exact call as the one deliberately left English by
    // an earlier pass) -- closed during 2026-09-03's student-facing i18n audit.
    const serviceMessage = aiServiceFailureMessage(error, tr ? "Plan oluşturucun" : "Your plan generator", locale);
    if (serviceMessage) return { error: serviceMessage };
    return { error: tr ? "Planın oluşturulurken bir şeyler ters gitti. Lütfen tekrar dene." : "Something went wrong generating your plan. Please try again." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return {};
}

export async function updateActionStatus(params: {
  actionId: string;
  status: ActionStatus;
  reflectionOutcome?: ReflectionOutcome;
  reflectionNote?: string;
}): Promise<{ error?: string }> {
  const session = await requireUser();
  const locale = await resolveLocale();
  const supabase = await createClient();

  // See lib/plan/status-patch.ts for why this is built conditionally rather than
  // `{ status, reflection_outcome: params.reflectionOutcome ?? null, ... }` inline here —
  // the race it fixes (two concurrent Server Action calls from one "complete + reflect"
  // click) and the reasoning are documented there, next to the tests that pin it.
  const patch = buildActionStatusPatch(params);

  // Read the status BEFORE writing, only so the analytics event below can tell a real
  // completion from a second write about an already-completed action. The same click
  // produces two independent Server Action calls (see status-patch.ts for the full
  // reasoning) and BOTH carry `status: "completed"` — the toggle, then the reflection
  // moments later. status-patch.ts fixed what that race did to the DATA; it never touched
  // what it did to the event, so every real completion has been logging
  // `weekly_action_completed` twice, inflating that metric roughly 2x for anyone reading it.
  const { data: before } = await supabase
    .from("weekly_actions")
    .select("status")
    .eq("id", params.actionId)
    .eq("user_id", session.userId!)
    .maybeSingle();

  const { error } = await supabase
    .from("weekly_actions")
    .update(patch)
    .eq("id", params.actionId)
    .eq("user_id", session.userId!);

  if (error) {
    return { error: locale === "tr" ? "Bu adım güncellenemedi. Lütfen tekrar dene." : "Couldn't update that action. Please try again." };
  }

  // See lib/plan/status-patch.ts's shouldLogCompletion for why a transition, not a mention:
  // both calls from one click carry status "completed", and this event was measured firing
  // exactly 2.00 times per real completion before the guard existed.
  if (shouldLogCompletion(before?.status, params.status)) {
    await logEvent(session.userId!, "weekly_action_completed", { actionId: params.actionId });
  }

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return {};
}
