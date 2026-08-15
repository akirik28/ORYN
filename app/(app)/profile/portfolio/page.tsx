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
      <div>
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Portfolio</h1>
        <p className="mt-1 text-muted-foreground">Everything you&apos;ve done, in one place.</p>
      </div>
      <PortfolioView items={items} />
    </div>
  );
}
