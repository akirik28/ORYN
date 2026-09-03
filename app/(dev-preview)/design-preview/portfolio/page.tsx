import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";
import { PortfolioView } from "@/features/profile/portfolio-view";
import { FIXTURE_PORTFOLIO_ITEMS, FIXTURE_PORTFOLIO_SKILLS, FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";

/**
 * Design-preview mirror of app/(app)/profile/portfolio/page.tsx (2026-09-03) — never had a
 * preview at all before the student-app mobile pass; oryn-a7 named Portfolio as one of the
 * eight surfaces to check and there was nowhere to look. Real PortfolioView against a
 * 6-item, 6-category fixture spanning every evidenceStatus state
 * (verified/evidence_added/self_reported/null) so the category chips and evidence badges
 * both have something real to collapse badly at 375px, if they do.
 */
export default async function PortfolioPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
      <div className="space-y-6">
        <div
          className="dark relative overflow-hidden rounded-[28px] p-6 text-foreground md:p-8"
          style={heroGradientStyle(tier)}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-[320px] rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(107,100,240,0.5) 0%, rgba(107,100,240,0) 70%)" }}
          />
          <div className="relative">
            <Link href="/design-preview/journey" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Back to profile
            </Link>
            <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">My portfolio</h1>
            <p className="mt-1 text-muted-foreground">Everything you&rsquo;ve added, in one place.</p>
          </div>
        </div>
        <PortfolioView items={FIXTURE_PORTFOLIO_ITEMS} skills={FIXTURE_PORTFOLIO_SKILLS} />
      </div>
    </PreviewShell>
  );
}
