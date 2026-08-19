import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Real `<Link>`s, no client JS — same "server-rendered, keyboard/screen-reader-friendly,
 * one URL is the whole state" convention as region-grid-explorer.tsx. `buildHref` lets the
 * caller decide which other query params survive a page change (region/country/search
 * text all should) without this component needing to know their names.
 */
export function Pagination({ currentPage, totalPages, buildHref }: { currentPage: number; totalPages: number; buildHref: (page: number) => string }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={currentPage <= 1} render={<Link href={buildHref(Math.max(1, currentPage - 1))} />} nativeButton={false}>
        <ChevronLeft className="size-3.5" /> Previous
      </Button>
      <span className="px-2 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        render={<Link href={buildHref(Math.min(totalPages, currentPage + 1))} />}
        nativeButton={false}
      >
        Next <ChevronRight className="size-3.5" />
      </Button>
    </nav>
  );
}
