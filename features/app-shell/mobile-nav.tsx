"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DimensionSignal } from "@/lib/scoring/signal";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { CommandPalette } from "@/features/search/command-palette";
import { LanguageSwitcher } from "./language-switcher";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-items";
import type { Notification } from "@/types/database";

const BOTTOM_NAV = PRIMARY_NAV.filter((item) => item.mobilePrimary);
const OVERFLOW_NAV = [...PRIMARY_NAV.filter((item) => !item.mobilePrimary), ...SECONDARY_NAV];

/**
 * Mobile and tablet shell (UI-V3 § 32). Deliberately not the desktop chrome at a smaller
 * width: a compact header for identity and utilities, and a thumb-reachable bottom bar for
 * the destinations a student actually moves between (six as of 2026-09-02, Applications
 * promoted alongside the original five — see nav-items.ts). Everything else is one tap away
 * under "More" — hidden from the bar, not from the product.
 *
 * The boundary is `lg` (1024), not `md`. The desktop header carries a logo, seven nav
 * items, a 208px search field, notifications and an avatar, which does not fit below about
 * 1100px — measured at 1024 the utilities cluster ran 44px past the header's right edge and
 * the document scrolled horizontally. A tablet gets this shell rather than a cramped
 * desktop one.
 *
 * Renders as two fixed elements rather than a scroll container, so the page body keeps
 * the document's own scrolling (and with it iOS address-bar collapse, scroll restoration,
 * and `scroll-margin` anchors). Clearance for the bottom bar is bottom padding on the
 * content container, not a spacer here — a spacer in this component can only render
 * beside the nav, which puts it at the top of the flow where it does nothing.
 */
export function MobileNav({
  signal,
  displayName,
  email,
  notifications,
  isAdmin = false,
}: {
  signal: DimensionSignal[];
  displayName: string;
  email: string | null;
  notifications: Notification[];
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const overflowActive = OVERFLOW_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Link href="/dashboard" aria-label={t("homeLink")}>
          <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          <CommandPalette />
          <NotificationBell notifications={notifications} />
          <UserMenu displayName={displayName} email={email} signal={signal} isAdmin={isAdmin} />
        </div>
      </header>

      <nav
        aria-label={t("primaryLandmark")}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
      >
        {BOTTOM_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              /* min-h-14: a 44pt-plus touch target, per the same rule the overflow
                 button below follows. */
              className={cn(
                // 9px below 360: six columns at 320px leave ~53px each, where
                // "Universities" ellipsised at 10px. The icon carries recognition and the
                // full label is always the link's accessible name, so this trades a little
                // legibility at the narrowest width for a complete word.
                //
                // The tight tracking and 2px padding now hold at every width, not just
                // below 360. The earlier `min-[360px]:tracking-normal` / `min-[360px]:px-1`
                // pair was tuned against English, where "Universities" measures 54px into
                // 55px of inner width — a 1px margin that Turkish does not have.
                // "Üniversiteler" is 58px and ellipsised at 375px (measured in the browser
                // at mobile width, 2026-09-01, by substituting the string and reading
                // scrollWidth vs clientWidth; every other label fit). Keeping tight
                // tracking brings it to 55px and keeping px-0.5 leaves 59px of room, so the
                // headroom is ~4px rather than the 0px either change alone would give.
                // Same trade the paragraph above already made, applied at the width where
                // the second language needs it.
                "flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] tracking-tight transition-colors min-[360px]:text-[10px]",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:-outline-offset-2",
                active ? "text-brand-primary" : "text-ink-3",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {/* The visible text may be the short form, so the link keeps the full label
                  as its accessible name — a screen reader shouldn't hear "Explore". */}
              <span aria-hidden="true" className="max-w-full truncate">{t(item.shortLabelKey ?? item.labelKey)}</span>
              <span className="sr-only">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("moreDestinations")}
          aria-expanded={open}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] tracking-tight transition-colors min-[360px]:text-[10px]",
            "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:-outline-offset-2",
            overflowActive ? "text-brand-primary" : "text-ink-3",
          )}
        >
          <MoreHorizontal className="size-5 shrink-0" />
          <span>{t("more")}</span>
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <SheetHeader className="px-5 pt-5 pb-1">
            <SheetTitle>{t("more")}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-1 p-4">
            {OVERFLOW_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active ? "bg-accent font-medium text-accent-foreground" : "text-ink-2 hover:bg-muted",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
            {/* Desktop reaches this from the sidebar footer; below `lg` that column does
                not render at all, so the overflow sheet is the only place a phone user can
                change language. */}
            <LanguageSwitcher variant="sheet" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
