"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpportunityCompare } from "./opportunity-compare-context";

/**
 * Opportunities' own compare bar — same shape as features/universities/compare-bar.tsx,
 * see opportunity-compare-context.tsx for why this mirrors rather than shares code with it.
 *
 * Positioned one bar's height higher than CompareBar's own offset (`+4.5rem`/`bottom-20`
 * instead of `+1rem`/`bottom-4`), not identical to it. This bar's only caller is
 * app/(app)/saved/page.tsx, which is also the one page where a student could plausibly have
 * both an in-progress university comparison (started earlier on /universities) and an
 * opportunity comparison active at once — stacking with a visible gap here beats the two
 * bars occupying the same fixed position and overlapping.
 */
export function OpportunityCompareBar() {
  const t = useTranslations("opportunities.compareBar");
  const compare = useOpportunityCompare();
  if (compare.selected.length === 0) return null;

  const ids = compare.selected.map((e) => e.id).join(",");

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+4.5rem)] z-40 flex justify-center px-4 lg:bottom-20">
      <div className="flex max-w-full items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 shadow-lg">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Scale className="size-4 text-brand-primary" />
          {t("selected", { count: compare.selected.length })}
        </span>
        <div className="hidden max-w-xs flex-wrap gap-1.5 sm:flex">
          {compare.selected.map((e) => (
            <span key={e.id} className="truncate rounded-full bg-muted px-2 py-0.5 text-xs">
              {e.title}
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={compare.clear}>
          <X className="size-3.5" />
          {t("clear")}
        </Button>
        <Button size="sm" disabled={compare.selected.length < 2} render={<Link href={`/opportunities/compare?ids=${ids}`} />} nativeButton={false}>
          {t("compare")}
        </Button>
      </div>
    </div>
  );
}
