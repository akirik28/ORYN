"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Mobile's equivalent of the desktop right-column detail panel — the same `?selected=`
 * param, same server-rendered OpportunityDetailPanel content (passed as children from the
 * server component that renders this), just presented as a bottom sheet instead of a
 * permanent sidebar there's no room for at 375px. Closing (backdrop tap, swipe, or the
 * sheet's own close button) removes `selected` from the URL rather than merely hiding
 * local state, so the server stops rendering the panel's data fetch on the next request —
 * consistent with every other piece of state on this page already being URL-driven.
 */
export function OpportunityMobileSelectedSheet({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.push(`/opportunities?${params.toString()}`, { scroll: false });
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-hidden rounded-t-2xl p-0 md:hidden" showCloseButton={false}>
        {children}
      </SheetContent>
    </Sheet>
  );
}
