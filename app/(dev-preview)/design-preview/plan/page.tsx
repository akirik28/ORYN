import { notFound } from "next/navigation";
import { PlanTierView } from "@/features/settings/plan-tier-view";
import { UltraAmbient } from "@/features/app-shell/ultra-ambient";
import { PreviewShell } from "../preview-shell";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";

/**
 * Dedicated preview for the plan/comparison page — added 2026-09-02 verifying the live,
 * founder-reported "ultra yazısı gözükmüyor" bug fix (tier-grad-text on Ultra labels
 * reading as flame-gradient-on-amber-ground once the page ground itself turned warm; see
 * plan-tier-view.tsx's own header comment for the full story). Same reason the dashboard
 * got its own single-purpose route: no authenticated session reaches this page any other
 * way tonight (migration 0089 unapplied, no live account can carry plan_tier), and this is
 * the one surface where the actual bug (text against the real amber Ultra page ground, not
 * a stand-in color) is reproducible at all.
 */
export default async function PlanPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";

  return (
    <>
      <UltraAmbient tier={tier} />
      <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
        <PlanTierView tier={tier} />
      </PreviewShell>
    </>
  );
}
