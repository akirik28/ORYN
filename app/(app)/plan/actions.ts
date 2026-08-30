"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { logEvent } from "@/lib/analytics/log";
import { buildActionStatusPatch } from "@/lib/plan/status-patch";
import type { ActionStatus, ReflectionOutcome } from "@/types/database";

export async function regenerateWeeklyPlan(): Promise<{ error?: string }> {
  const session = await requireUser();
  try {
    await assertWithinAIRateLimit(session.userId!, "weekly_plan", { maxCalls: 5, windowMinutes: 60 });
    await getOrCreateWeeklyPlan(session.userId!, { force: true });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { error: error.message };
    }
    if (error instanceof AIProviderNotConfiguredError) {
      return { error: "The AI Advisor isn't configured yet, so weekly plans can't be generated. See API_SETUP.md." };
    }
    console.error("[plan] failed to regenerate weekly plan", error);
    return { error: "Something went wrong generating your plan. Please try again." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return {};
}

export async function ensureWeeklyPlan(): Promise<{ error?: string }> {
  const session = await requireUser();
  try {
    await getOrCreateWeeklyPlan(session.userId!);
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) {
      return { error: "not_configured" };
    }
    console.error("[plan] failed to create weekly plan", error);
    return { error: "generation_failed" };
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
  const supabase = await createClient();

  // See lib/plan/status-patch.ts for why this is built conditionally rather than
  // `{ status, reflection_outcome: params.reflectionOutcome ?? null, ... }` inline here —
  // the race it fixes (two concurrent Server Action calls from one "complete + reflect"
  // click) and the reasoning are documented there, next to the tests that pin it.
  const patch = buildActionStatusPatch(params);

  const { error } = await supabase
    .from("weekly_actions")
    .update(patch)
    .eq("id", params.actionId)
    .eq("user_id", session.userId!);

  if (error) {
    return { error: "Couldn't update that action. Please try again." };
  }

  if (params.status === "completed") {
    await logEvent(session.userId!, "weekly_action_completed", { actionId: params.actionId });
  }

  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return {};
}
