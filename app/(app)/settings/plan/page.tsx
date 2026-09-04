import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { PlanTierView } from "@/features/settings/plan-tier-view";
import { MONTHLY_AI_TOKEN_LIMIT } from "@/lib/ai/token-limits";
import { ADVISOR_MAX_TOKENS_STANDARD, ADVISOR_MAX_TOKENS_ULTRA } from "@/lib/ai/advisor-chat";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFinanceSettings } from "@/lib/admin/queries";
import { resolveComparisonWidthCeiling, MONTHLY_COMPARISON_LIMIT } from "@/lib/comparison/limits";

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
  // Independent reads (profile vs. the global finance-settings row) run in parallel --
  // same "no reason to serialize two unrelated fetches" reasoning as app/(app)/layout.tsx's
  // own Promise.all just above its Sidebar render.
  const [profile, financeSettings] = await Promise.all([getCurrentProfile(), getFinanceSettings(createAdminClient())]);
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
  //
  // ultraPriceTry, 2026-09-04, added the same way: sourced from admin_finance_settings
  // (not a hardcoded constant like the token limits above) via the same getFinanceSettings
  // read app/(admin)/kumanda/kar-zarar/page.tsx already uses, so interestDescription's
  // stated price actually moves when the founder edits it in the control center. Degrades
  // to ULTRA_PRICE_TRY (lib/admin/finance.ts) via getFinanceSettings' own
  // DEFAULT_FINANCE_SETTINGS if the row or column is ever missing -- never blank or zero.
  //
  // standardCompareMax/ultraCompareMax/monthlyComparisonLimit, 2026-09-04: same
  // server-computed-prop pattern, sourced from lib/comparison/limits.ts -- the exact module
  // both compare pages (app/(app)/universities/compare/page.tsx,
  // .../opportunities/compare/page.tsx) already enforce these limits from, so this page's
  // stated numbers can't drift from what actually gates a comparison. See
  // plan-tier-view.tsx's own header for why these are threaded as props even though that
  // module is technically client-safe to import directly.
  return (
    <PlanTierView
      tier={tier}
      ultraTokenLimit={MONTHLY_AI_TOKEN_LIMIT.ultra}
      standardTokenLimit={MONTHLY_AI_TOKEN_LIMIT.standard}
      ultraMaxTokens={ADVISOR_MAX_TOKENS_ULTRA}
      standardMaxTokens={ADVISOR_MAX_TOKENS_STANDARD}
      ultraPriceTry={financeSettings.ultraPriceTry}
      standardCompareMax={resolveComparisonWidthCeiling("standard")}
      ultraCompareMax={resolveComparisonWidthCeiling("ultra")}
      monthlyComparisonLimit={MONTHLY_COMPARISON_LIMIT}
    />
  );
}
