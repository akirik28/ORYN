"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";

/**
 * B3a (2026-09-04): the founder's own complaint was "no separate pages at all" for the
 * parent surface -- this is what makes the four new routes (opportunities/universities/
 * applications/progress) actually reachable from one another and from the overview, rather
 * than each being a real URL nobody would ever navigate to.
 *
 * Client Component, the only one anywhere under app/parent/ -- `usePathname()` for
 * active-link highlighting is the one piece of this surface that genuinely needs the
 * client, everything else here stays server-rendered same as before. Sits in
 * app/parent/(dashboard)/layout.tsx, above `{children}`, not wrapping it -- same width-
 * constraint lesson as app/parent/layout.tsx's own header: a sibling, so nothing here can
 * squeeze whatever full-width shell a page renders below it.
 *
 * No background of its own on purpose: the ambient `--role-page-bg-1` from app/parent/
 * layout.tsx's outer div shows through, which is the same color every page's own
 * `ParentPageShell` gradient starts at -- the nav and whatever page follows it read as one
 * continuous surface, not two stacked panels.
 */
const NAV_ITEMS = [
  { href: "/parent", labelEn: "Overview", labelTr: "Genel bakış" },
  { href: "/parent/opportunities", labelEn: "Opportunities", labelTr: "Fırsatlar" },
  { href: "/parent/universities", labelEn: "Universities", labelTr: "Üniversiteler" },
  { href: "/parent/applications", labelEn: "Applications", labelTr: "Başvurular" },
  { href: "/parent/progress", labelEn: "Progress", labelTr: "Gelişim" },
] as const;

export function ParentNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const tr = locale === "tr";

  return (
    <nav aria-label={tr ? "Veli gezinme" : "Parent navigation"} className="border-b" style={{ borderColor: "var(--role-surface-border)" }}>
      <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-6 pt-4">
        {NAV_ITEMS.map((item) => {
          // Exact match for "/parent" (would otherwise stay "active" on every sub-route,
          // since every one of them starts with that same prefix); startsWith for the rest.
          const active = item.href === "/parent" ? pathname === "/parent" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? "" : "text-muted-foreground"}`}
              style={active ? { color: "var(--role-accent-strong)", borderBottom: "2px solid var(--role-accent)" } : { borderBottom: "2px solid transparent" }}
            >
              {tr ? item.labelTr : item.labelEn}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
