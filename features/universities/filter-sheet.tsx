"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  active: boolean;
  /** Pre-built by the server (same philosophy as SortSelect/country pills): toggles this
   * option on, or clears it if it's already the active one — this component only navigates,
   * it never decides what the next URL state should be. */
  href: string;
}

export interface FilterGroup {
  label: string;
  /** Shown under the label — used for the two multi-select groups (cost, student population)
   * to make the "select more than one to span a range" behavior discoverable, since nothing
   * about a row of chips says that on its own. */
  description?: string;
  options: FilterOption[];
}

const CHIP = "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast)";
const CHIP_ACTIVE = "border-brand-primary bg-brand-primary text-primary-foreground";
const CHIP_INACTIVE = "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle";

/**
 * A real filter drawer (P0E) — every option is a plain server-built <Link>, so the actual
 * filtering logic lives entirely in the page's URL-param handling, not in this component.
 * The Sheet itself (open/closed) is the only client state here, same pattern MobileNav uses
 * for its own drawer. Renders as a right-side sheet at every viewport width rather than a
 * separate mobile-specific bottom-sheet instance — a deliberate scope cut, not an oversight:
 * it's fully usable on mobile, just not the bottom-anchored polish a founder review's P0E
 * spec suggested as its preference.
 */
export function FilterSheet({ groups, clearHref, activeCount }: { groups: FilterGroup[]; clearHref: string; activeCount: number }) {
  const t = useTranslations("universities.filterSheet");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-3.5" />
        {t("filters")}
        {activeCount > 0 ? <span className="ml-0.5 rounded-full bg-brand-primary px-1.5 text-xs text-primary-foreground">{activeCount}</span> : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{t("filters")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {groups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{group.label}</p>
                  {group.description ? <p className="text-xs text-muted-foreground">{group.description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => (
                    <Link key={option.value} href={option.href} className={cn(CHIP, option.active ? CHIP_ACTIVE : CHIP_INACTIVE)}>
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {activeCount > 0 ? (
            <SheetFooter className="border-t">
              <Button variant="outline" size="sm" render={<Link href={clearHref} />} nativeButton={false}>
                {t("clearAll")}
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
