"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Founder-facing entry point, not a component harness detail — built after the founder
 * asked to open a premium-account preview and look around it, and found `/design-preview`
 * had no links to any of the twelve preview routes and no way to compare tiers side by
 * side. `DevPreviewTierStamp` (app/(dev-preview)/layout.tsx) already makes `?tier=ultra`
 * work correctly on every route; the gap was purely navigational, so this is purely
 * navigational too — it reads and writes the same `?tier=` URL param that component
 * already reads, and touches nothing about how the stamp itself works.
 *
 * One shared control, mounted in `PreviewShell` (covers 9 of the 12 preview routes) plus
 * directly in the three that don't use that shell (admin, auth, onboarding — each has its
 * own bespoke wrapper mirroring its real counterpart's distinct layout, same reason
 * `PreviewShell` itself isn't just reused there). Fixed-position by design: it never needs
 * to be part of any page's own layout flow to be "on every preview page," and every route
 * this mounts into gets the identical control with zero page-specific styling.
 *
 * Deliberately undecorated — a plain Button/Link, semantic tokens only, no attempt at a
 * "premium" look of its own. This is a dev tool sitting on top of the preview, not part of
 * what the preview shows; the vivid Ultra treatment CEO warned is about to get louder
 * belongs to the page content reacting to `[data-tier="ultra"]`, not to the toolbar that
 * toggles it.
 */
export function PreviewToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") === "ultra" ? "ultra" : "standard";

  function setTier(next: "standard" | "ultra") {
    // Preserves every other param already on the URL (map's own ?country=, etc.) --
    // this only ever touches `tier`.
    const params = new URLSearchParams(searchParams.toString());
    if (next === "ultra") params.set("tier", "ultra");
    else params.delete("tier");
    const query = params.toString();
    // replace, not push -- flipping a display toggle shouldn't fill the back-button
    // history with one entry per click.
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const backHref = tier === "ultra" ? "/design-preview?tier=ultra" : "/design-preview";

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-popover/95 p-1.5 text-sm shadow-lg backdrop-blur-sm">
      <Link
        href={backHref}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All previews
      </Link>
      <div className="h-4 w-px bg-border" aria-hidden="true" />
      <div role="group" aria-label="Preview tier" className="flex items-center gap-0.5">
        <Button
          type="button"
          size="sm"
          variant={tier === "standard" ? "default" : "ghost"}
          className={cn("h-7 rounded-full px-3", tier !== "standard" && "text-muted-foreground")}
          aria-pressed={tier === "standard"}
          onClick={() => setTier("standard")}
        >
          Standard
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tier === "ultra" ? "default" : "ghost"}
          className={cn("h-7 rounded-full px-3", tier !== "ultra" && "text-muted-foreground")}
          aria-pressed={tier === "ultra"}
          onClick={() => setTier("ultra")}
        >
          Ultra
        </Button>
      </div>
    </div>
  );
}
