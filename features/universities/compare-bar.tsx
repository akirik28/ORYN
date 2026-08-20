"use client";

import Link from "next/link";
import { X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "./compare-context";

/** Sticky "Compare N universities" action bar (P0H) — appears once at least one card is
 * selected, anywhere on the page (not per-region), since the tray is a single cross-page
 * selection. Needs at least 2 to actually compare; below that it's just a visible tray. */
export function CompareBar() {
  const compare = useCompare();
  if (compare.selected.length === 0) return null;

  const ids = compare.selected.map((e) => e.id).join(",");

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex max-w-full items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 shadow-lg">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Scale className="size-4 text-brand-primary" />
          {compare.selected.length} selected
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
          Clear
        </Button>
        <Button size="sm" disabled={compare.selected.length < 2} render={<Link href={`/universities/compare?ids=${ids}`} />} nativeButton={false}>
          Compare
        </Button>
      </div>
    </div>
  );
}
