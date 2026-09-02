import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser, requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { createClient } from "@/lib/supabase/server";
import { buildPortfolio, getPortfolioSkills } from "@/lib/portfolio/build";
import { PortfolioView } from "@/features/profile/portfolio-view";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("profile.portfolio");
  return { title: tMeta("title") };
}

export default async function PortfolioPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const [items, skills] = await Promise.all([
    buildPortfolio(supabase, session.userId!),
    getPortfolioSkills(supabase, session.userId!),
  ]);
  const t = await getTranslations("profile");
  const tPortfolio = await getTranslations("profile.portfolio");
  const planTier = resolvePlanTier(await requireProfile());

  return (
    <div className="space-y-6">
      {/* Dark hero, matching Applications/Universities (2026-08-30 founder direction: main
          heading cards should be dark). Contained rounded card rather than edge-to-edge,
          for the same reason those two are — the shared layout's padding is asymmetric and
          doesn't cleanly cancel with a uniform negative margin. */}
      <div
        className="dark relative overflow-hidden rounded-[28px] p-6 text-foreground md:p-8"
        style={heroGradientStyle(planTier)}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-[320px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(107,100,240,0.5) 0%, rgba(107,100,240,0) 70%)" }}
        />
        <div className="relative">
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> {t("backToProfile")}
          </Link>
          <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">{tPortfolio("title")}</h1>
          <p className="mt-1 text-muted-foreground">{tPortfolio("description")}</p>
        </div>
      </div>
      <PortfolioView items={items} skills={skills} />
    </div>
  );
}
