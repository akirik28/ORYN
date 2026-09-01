"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { collectStoryBankExperiences } from "@/lib/story-bank/collect";
import { generateEssayOutlines, type EssayOutlineResponse } from "@/lib/ai/essay-outlines";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { resolveLocale } from "@/lib/i18n/locale";

const MAX_PROMPT_LENGTH = 1000;

export async function generateStoryOutlines(
  essayPrompt: string,
  selectedIds: string[]
): Promise<{ data?: EssayOutlineResponse; error?: string }> {
  const session = await requireUser();
  const trimmed = essayPrompt.trim();

  if (!trimmed) return { error: "Paste the essay prompt you're answering first." };
  if (trimmed.length > MAX_PROMPT_LENGTH) return { error: "That prompt is too long — paste just the question itself." };

  try {
    const locale = await resolveLocale();
    await assertWithinAIRateLimit(session.userId!, "essay_story_bank", { maxCalls: 10, windowMinutes: 60 }, locale);

    const supabase = await createClient();
    // Re-read every experience server-side from the student's own RLS-scoped rows rather
    // than trusting anything the client sent — the client only ever supplies ids to filter
    // by, never the content that reaches the model.
    const [all, goalsRes] = await Promise.all([
      collectStoryBankExperiences(supabase, session.userId!),
      supabase.from("career_goals").select("title").eq("user_id", session.userId!),
    ]);

    const selected = selectedIds.length > 0 ? all.filter((e) => selectedIds.includes(e.id)) : all;
    if (selected.length === 0) {
      return { error: "Add some experiences to your profile first — story ideas come from what you've actually done." };
    }

    const data = await generateEssayOutlines({
      userId: session.userId!,
      locale,
      essayPrompt: trimmed,
      experiences: selected,
      goals: (goalsRes.data ?? []).map((g) => g.title),
    });
    return { data };
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    if (error instanceof AIProviderNotConfiguredError) {
      return { error: "The AI isn't configured yet, so story ideas can't be generated. See API_SETUP.md." };
    }
    console.error("[story-bank] outline generation failed", error);
    return { error: "Couldn't generate story ideas right now. Please try again." };
  }
}
