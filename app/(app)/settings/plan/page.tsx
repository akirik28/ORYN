import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { PlanTierView } from "@/features/settings/plan-tier-view";
import { MONTHLY_AI_TOKEN_LIMIT } from "@/lib/ai/token-limits";
import { ADVISOR_MAX_TOKENS_STANDARD, ADVISOR_MAX_TOKENS_ULTRA } from "@/lib/ai/advisor-chat";

// Routed under /settings, deliberately not /plan — app/(app)/plan already exists and is
// the *weekly* plan (Phase 9). Two different meanings of "plan" one click apart in the
// same nav would be a trap.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.plan");
  return { title: t("title") };
}

export default async function PlanTierPage() {
  // Same discipline as app/(app)/settings/page.tsx's own comment: a layout gate isn't
  // guaranteed to re-run on every client-side navigation, so this page checks for itself
  // rather than trusting the shell around it.
  await requireUser();
  const profile = await getCurrentProfile();
  const tier = resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null });

  // 2026-09-03, the founder-directed redesign: every figure PlanTierView renders (the
  // marquee cards' stat numbers, the comparison table's aiAllowance/replyCeiling rows) is
  // derived here, server-side, from the same constants that actually enforce them --
  // MONTHLY_AI_TOKEN_LIMIT (lib/ai/token-limits.ts, no server-only dependency) and
  // ADVISOR_MAX_TOKENS_STANDARD/_ULTRA (lib/ai/advisor-chat.ts, which IS server-only --
  // safe to import here because this file is a Server Component, never bundled for the
  // client; PlanTierView receives only the resulting plain numbers as props, the same
  // "extract or pass down, never import a server-only value into a client component"
  // pattern the Ultra tier-economics build's own preview-shell.tsx fix already established).
  return (
    <PlanTierView
      tier={tier}
      ultraTokenLimit={MONTHLY_AI_TOKEN_LIMIT.ultra}
      standardTokenLimit={MONTHLY_AI_TOKEN_LIMIT.standard}
      ultraMaxTokens={ADVISOR_MAX_TOKENS_ULTRA}
      standardMaxTokens={ADVISOR_MAX_TOKENS_STANDARD}
    />
  );
}
