"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Filters get their own sheet on mobile instead of sitting permanently above the fold —
 * the un-adapted layout put a full-height filter panel before a student ever saw a map or a
 * result (confirmed live at 375px while building this). `hasActive` just changes the
 * trigger's visual weight so a student can tell at a glance whether anything is filtering
 * the view without opening the sheet to check.
 */
export function OpportunityMobileFilterSheet({ children, hasActive }: { children: ReactNode; hasActive: boolean }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant={hasActive ? "secondary" : "outline"} size="sm">
            <SlidersHorizontal className="size-3.5" /> Filters
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
