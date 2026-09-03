"use server";

import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { collectStoryBankExperiences } from "@/lib/story-bank/collect";
import { generateEssayOutlines, type EssayOutlineResponse } from "@/lib/ai/essay-outlines";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { resolveLocale } from "@/lib/i18n/locale";
import { resolvePlanTier } from "@/lib/tier/plan-tier";

const MAX_PROMPT_LENGTH = 1000;

export async function generateStoryOutlines(
  essayPrompt: string,
  selectedIds: string[]
): Promise<{ data?: EssayOutlineResponse; error?: string }> {
  const session = await requireUser();
  const locale = await resolveLocale();
  const tr = locale === "tr";
  const trimmed = essayPrompt.trim();

  if (!trimmed) return { error: tr ? "Önce yanıtladığın deneme sorusunu yapıştır." : "Paste the essay prompt you're answering first." };
  if (trimmed.length > MAX_PROMPT_LENGTH) return { error: tr ? "Bu soru çok uzun — sadece sorunun kendisini yapıştır." : "That prompt is too long — paste just the question itself." };

  try {
    await assertWithinAIRateLimit(session.userId!, "essay_story_bank", { maxCalls: 10, windowMinutes: 60 }, locale);

    const supabase = await createClient();
    // Re-read every experience server-side from the student's own RLS-scoped rows rather
    // than trusting anything the client sent — the client only ever supplies ids to filter
    // by, never the content that reaches the model.
    const [all, goalsRes, profile] = await Promise.all([
      collectStoryBankExperiences(supabase, session.userId!, locale),
      supabase.from("career_goals").select("title").eq("user_id", session.userId!),
      getCurrentProfile(),
    ]);

    const selected = selectedIds.length > 0 ? all.filter((e) => selectedIds.includes(e.id)) : all;
    if (selected.length === 0) {
      return {
        error: tr
          ? "Önce profiline birkaç deneyim ekle — hikaye fikirleri gerçekten yaptığın şeylerden gelir."
          : "Add some experiences to your profile first — story ideas come from what you've actually done.",
      };
    }

    const data = await generateEssayOutlines({
      userId: session.userId!,
      locale,
      essayPrompt: trimmed,
      experiences: selected,
      goals: (goalsRes.data ?? []).map((g) => g.title),
      // 2026-09-03, closing the Ultra tier-economics boundary -- same pattern as every
      // other threaded feature this build touches.
      tier: resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null }),
    });
    return { data };
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    if (error instanceof AIProviderNotConfiguredError) {
      // Same rewrite as profile/actions.ts's identical catch (2026-09-03 audit): a missing
      // API key is a deployment fact, not student copy, and API_SETUP.md isn't something a
      // student can open.
      console.error("[story-bank] outline generation unavailable: AI provider not configured");
      return { error: tr ? "Bu özellik şu anda kullanılamıyor." : "This feature isn't available right now." };
    }
    console.error("[story-bank] outline generation failed", error);
    return { error: tr ? "Şu anda hikaye fikri üretilemedi. Lütfen tekrar dene." : "Couldn't generate story ideas right now. Please try again." };
  }
}
