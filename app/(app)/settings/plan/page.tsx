import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { PlanTierView } from "@/features/settings/plan-tier-view";

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

  return <PlanTierView tier={tier} />;
}
