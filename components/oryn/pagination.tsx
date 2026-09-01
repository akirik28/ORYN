import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Real `<Link>`s, no client JS — same "server-rendered, keyboard/screen-reader-friendly,
 * one URL is the whole state" convention as region-grid-explorer.tsx. `buildHref` lets the
 * caller decide which other query params survive a page change (region/country/search
 * text all should) without this component needing to know their names.
 *
 * Labels are required props, not hardcoded English with an optional override — this had no
 * callers until the notifications page, and requiring them here means a future caller can't
 * silently ship English text the way an optional-with-English-default would allow.
 */
export function Pagination({
  currentPage,
  totalPages,
  buildHref,
  ariaLabel,
  previousLabel,
  nextLabel,
  pageLabel,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2" aria-label={ariaLabel}>
      <Button variant="outline" size="sm" disabled={currentPage <= 1} render={<Link href={buildHref(Math.max(1, currentPage - 1))} />} nativeButton={false}>
        <ChevronLeft className="size-3.5" /> {previousLabel}
      </Button>
      <span className="px-2 text-sm text-muted-foreground">{pageLabel}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        render={<Link href={buildHref(Math.min(totalPages, currentPage + 1))} />}
        nativeButton={false}
      >
        {nextLabel} <ChevronRight className="size-3.5" />
      </Button>
    </nav>
  );
}
