"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "./compare-context";

/** Sticky "Compare N universities" action bar (P0H) — appears once at least one card is
 * selected, anywhere on the page (not per-region), since the tray is a single cross-page
 * selection. Needs at least 2 to actually compare; below that it's just a visible tray. */
export function CompareBar() {
  const t = useTranslations("universities.compareBar");
  const compare = useCompare();
  if (compare.selected.length === 0) return null;

  const ids = compare.selected.map((e) => e.id).join(",");

  return (
    // bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] below `lg`, bottom-4 at `lg`+:
    // features/app-shell/mobile-nav.tsx's bottom bar is also `fixed`, `min-h-14` (3.5rem)
    // plus its own safe-area padding, everywhere below `lg` (1024px) — the one breakpoint
    // this bar's old flat `bottom-4` didn't account for. z-40 already put this bar visually
    // on top of z-30 MobileNav rather than genuinely clearing it, so for as long as 1+
    // universities were selected, the bottom nav's Home/Counselor/Journey/Explore/
    // Universities/More destinations sat underneath and were unreachable on every mobile
    // and tablet viewport — confirmed via mobile-nav.tsx's own exact classes, not just
    // visually. Same `calc(3.5rem+env(safe-area-inset-bottom))` clearance
    // features/advisor/advisor-chat.tsx's composer already uses for this identical problem.
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-40 flex justify-center px-4 lg:bottom-4">
      <div role="region" aria-label={t("ariaLabel")} className="flex max-w-full items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 shadow-lg">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Scale className="size-4 text-brand-primary" />
          {t("selected", { count: compare.selected.length })}
        </span>
        <div className="hidden max-w-xs flex-wrap gap-1.5 sm:flex">
          {compare.selected.map((e) => (
            <span key={e.id} className="truncate rounded-full bg-muted px-2 py-0.5 text-xs">
              {e.name}
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={compare.clear}>
          <X className="size-3.5" />
          {t("clear")}
        </Button>
        <Button size="sm" disabled={compare.selected.length < 2} render={<Link href={`/universities/compare?ids=${ids}`} />} nativeButton={false}>
          {t("compare")}
        </Button>
      </div>
    </div>
  );
}
