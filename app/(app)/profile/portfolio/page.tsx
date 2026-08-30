import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { buildPortfolio } from "@/lib/portfolio/build";
import { PortfolioView } from "@/features/profile/portfolio-view";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const items = await buildPortfolio(supabase, session.userId!);

  return (
    <div className="space-y-6">
      {/* Dark hero, matching Applications/Universities (2026-08-30 founder direction: main
          heading cards should be dark). Contained rounded card rather than edge-to-edge,
          for the same reason those two are — the shared layout's padding is asymmetric and
          doesn't cleanly cancel with a uniform negative margin. */}
      <div
        className="dark relative overflow-hidden rounded-[28px] p-6 text-foreground md:p-8"
        style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-[320px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(107,100,240,0.5) 0%, rgba(107,100,240,0) 70%)" }}
        />
        <div className="relative">
          <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to profile
          </Link>
          <h1 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">Portfolio</h1>
          <p className="mt-1 text-muted-foreground">Everything you&apos;ve done, in one place.</p>
        </div>
      </div>
      <PortfolioView items={items} />
    </div>
  );
}
