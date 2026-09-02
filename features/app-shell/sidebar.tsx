"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import { SidebarFlame } from "./sidebar-flame";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-items";
import type { DimensionSignal } from "@/lib/scoring/signal";
import type { PlanTier } from "@/types/database";

const SETTINGS_ITEM = SECONDARY_NAV.find((item) => item.href === "/settings")!;
const SECONDARY_ITEMS = SECONDARY_NAV.filter((item) => item.href !== "/settings");

/**
 * Desktop left navigation — ported from the Figma Make source handoff
 * (src/App.tsx `Sidebar`, 2026-08-30 export): fixed 214px dark column, exact
 * gradient/colors/spacing, active-state left accent bar. Structure only, not colors,
 * differs from the source in one place: Connections and Messages stay out of the visible
 * list. That's not a styling choice — nav-items.ts documents a dated, minor-safety-driven
 * founder decision (2026-08-21) to keep student-to-student messaging out of navigation
 * for V1, and this pass doesn't relitigate that. Their routes/pages are unaffected.
 *
 * Background and active-accent-bar colors, 2026-09-02: read through --tier-sidebar-bg-1/2/3
 * and --tier-sidebar-accent (app/globals.css) rather than the literal hex values above —
 * still the exact same literals at Standard tier, redirected only under
 * [data-tier="ultra"]. Nothing else in this file changed for Ultra: the white/NN text
 * opacities stay as originally ported, verified live against the new sidebar color rather
 * than assumed to still be fine.
 *
 * SidebarFlame added the same day, later: a static color change wasn't enough — the founder
 * asked specifically for motion in the bar itself ("bar yanıyormuş gibi olsun"), not another
 * page-level effect. Painted first, before every other child, so normal DOM-order stacking
 * puts it behind the logo/nav/user-menu without needing an explicit z-index anywhere in this
 * file. `tier` is a required prop (not read from context) because there are exactly two
 * callers of this component — app/(app)/layout.tsx and the design-preview harness's
 * PreviewShell — both already computing a tier value for other reasons.
 */
export function Sidebar({
  displayName,
  email,
  signal,
  isAdmin = false,
  tier,
}: {
  displayName: string;
  email: string | null;
  signal: DimensionSignal[];
  isAdmin?: boolean;
  tier: PlanTier;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className="sticky top-0 hidden h-svh w-[214px] shrink-0 flex-col lg:flex"
      style={{ background: "linear-gradient(175deg, var(--tier-sidebar-bg-1) 0%, var(--tier-sidebar-bg-2) 55%, var(--tier-sidebar-bg-3) 100%)" }}
    >
      {tier === "ultra" ? <SidebarFlame tier={tier} /> : null}
      <Link href="/dashboard" aria-label={t("homeLink")} className="flex items-center gap-2.5 px-5 pt-[26px] pb-5">
        <Image src="/brand/logo-full.png" alt="Oryn" width={92} height={31} priority className="h-6 w-auto" />
      </Link>

      <nav aria-label={t("primaryLandmark")} className="flex flex-1 flex-col gap-px overflow-y-auto px-2.5">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-[10px] px-3 py-[9px] text-[13.5px] transition-colors",
                "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
                active ? "bg-white/10 font-semibold text-white" : "text-white/45 hover:text-white/75"
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-[20%] left-0 w-[3px] rounded-r-[2px]"
                  style={{ background: "var(--tier-sidebar-accent)" }}
                />
              ) : null}
              <Icon className="size-[18px]" strokeWidth={1.6} />
              {t(item.labelKey)}
            </Link>
          );
        })}

        {SECONDARY_ITEMS.length > 0 ? (
          <>
            <div className="mx-1 my-2 h-px bg-white/[0.06]" />
            {SECONDARY_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
                    active ? "bg-white/[0.08] font-semibold text-white" : "text-white/35 hover:text-white/60"
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.6} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </>
        ) : null}
      </nav>

      <div className="border-t border-white/[0.06]">
        <Link
          href={SETTINGS_ITEM.href}
          aria-current={isActive(SETTINGS_ITEM.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 px-[22px] py-2.5 text-[13px] transition-colors",
            "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
            isActive(SETTINGS_ITEM.href) ? "bg-white/[0.07] text-white/90" : "text-white/38 hover:text-white/65"
          )}
        >
          <SETTINGS_ITEM.icon className="size-[18px]" strokeWidth={1.6} />
          {t(SETTINGS_ITEM.labelKey)}
        </Link>
        {/* Sits with Settings rather than inside the account dropdown: a student who has
            switched the product into a language they cannot read needs to find their way
            back out without first parsing a menu label. An always-visible control with a
            globe icon, showing the language named in itself, stays recognisable in any
            locale. */}
        <LanguageSwitcher variant="sidebar" />
        <div className="px-4 pt-2.5 pb-[18px]">
          <UserMenu displayName={displayName} email={email} signal={signal} variant="sidebar" isAdmin={isAdmin} />
        </div>
      </div>
    </aside>
  );
}
