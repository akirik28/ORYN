"use client";

import Link from "next/link";
import Image from "next/image";
import { Flame } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/i18n/format";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-items";
import type { DimensionSignal } from "@/lib/scoring/signal";
import type { Locale } from "@/lib/i18n/config";

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
 * Background and active-accent-bar colors, 2026-09-02: the background is now a class
 * (.tier-sidebar-surface, app/globals.css) rather than an inline style — still the exact
 * same literal gradient at Standard tier, redirected only under [data-tier="ultra"]. The
 * accent bar reads --tier-sidebar-accent the same way it always did. Nothing else in this
 * file changed for Ultra: the white/NN text opacities stay as originally ported, verified
 * live against the new gradient rather than assumed to still be fine (a scrim layered into
 * .tier-sidebar-surface's own background, not a text-color change, is what keeps them
 * readable — see that class's own comment). No `tier` prop needed for any of this: every
 * rule lives behind a `[data-tier="ultra"]` ancestor selector, which an ancestor
 * (UltraAmbient / DevPreviewTierStamp) already stamps onto <html> — this file only has to
 * carry the class name, never branch on the value itself.
 *
 * Went through a canvas-based flame first, same day, replaced before it shipped further:
 * the founder rejected an overlay painted over a static dark ground ("don't keep the bar
 * blue and add an effect on top of it") and asked for the surface's own gradient to move
 * instead. That version DID take a `tier` prop, to decide whether to mount the canvas at
 * all — removed along with the canvas, since nothing here needs to know the tier anymore.
 * See app/globals.css's own comment on .tier-sidebar-surface for the full story.
 *
 * The "Upgrade your plan" CTA, added the same day, points at the real /settings/plan page
 * (registerUltraInterestAction — an analytics event, not a purchase; there is no billing
 * flow to fake). Always rendered here, hidden purely in CSS
 * ([data-tier="ultra"] .tier-upgrade-cta, app/globals.css) rather than gated by a prop —
 * first built as a `showUpgradeCta` boolean computed from the REAL resolved tier, on the
 * theory that a founder previewing Ultra via the dev-preview toggle is still, in their real
 * database row, a standard account. Corrected same day, founder direction, verbatim:
 * "zaten premiumken yandan upgrade şeyi olmamalı" (when already on premium, the upgrade
 * thing shouldn't be in the sidebar) — they were looking at a preview showing Ultra and
 * the CTA read as a bug. The CSS-only version is also the more robust fix, not just the
 * simpler one: it reads the exact same [data-tier="ultra"] attribute every other Ultra
 * rule in this file already keys off, so the CTA's visibility structurally cannot disagree
 * with what the rest of the sidebar is displaying — a JS-prop-driven boolean computed from
 * a different tier value than data-tier is exactly the shape of bug that produced the
 * founder's report in the first place.
 *
 * `ultra:text-white/80` / `ultra:hover:text-white` on every non-active nav item, same day:
 * the scrim in .tier-sidebar-surface alone couldn't clear 4.5:1 for the original
 * text-white/35-45% labels — raising scrim opacity further pulls the effective background
 * AND the composited text toward the same dark point together, so there's a mathematical
 * ceiling to how much separation that lever alone can buy. Computed (not eyeballed) across
 * 60+ sampled points along the full gradient path plus the scrim: white/80% clears 4.5:1
 * everywhere with margin (4.76:1 worst case, at the brightest yellow stop), white/100%
 * clears it comfortably (6.37:1 worst case) — hence full white on hover/active rather than
 * a smaller bump. Standard is untouched; these are `ultra:`-prefixed, so they add nothing
 * outside `[data-tier="ultra"]`. language-switcher.tsx's sidebar variant and user-menu.tsx's
 * sidebar summary line carry the identical fix for the identical reason.
 *
 * `ultraPriceTry`, 2026-09-04: the price stated in the upgrade CTA's subtext line below,
 * previously baked into the catalog string itself. Now a prop threaded from
 * admin_finance_settings (app/(app)/layout.tsx's getFinanceSettings call) so editing it in
 * the control center changes what's shown here, formatted per-locale via formatPrice
 * rather than string-replaced — "399,99" is correct Turkish grouping, not a fact that
 * survives a naive find/replace into English.
 */
export function Sidebar({
  displayName,
  email,
  signal,
  isAdmin = false,
  ultraPriceTry,
}: {
  displayName: string;
  email: string | null;
  signal: DimensionSignal[];
  isAdmin?: boolean;
  ultraPriceTry: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="tier-sidebar-surface sticky top-0 hidden h-svh w-[214px] shrink-0 flex-col lg:flex">
      <Link href="/dashboard" aria-label={t("homeLink")} className="flex items-center gap-2.5 px-5 pt-[26px] pb-5">
        {/* Açık varyant: kenar çubuğunun zemini koyu, mavi marka orada yeterli kontrast
            vermiyor -- founder, 2026-09-03 ("bazı yerlerde logonun rengi değişebilir
            kontrast yüksek olacak şekilde"). Her iki dosya da aynı kilitlemenin aynı
            boyuttaki hâli; sadece renk farklı. */}
        <Image src="/brand/logo-full-light.png" alt="Proxola" width={109} height={36} priority className="h-9 w-auto" />
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
                active ? "bg-white/10 font-semibold text-white" : "text-white/45 ultra:text-white/80 hover:text-white/75 ultra:hover:text-white"
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
                    active ? "bg-white/[0.08] font-semibold text-white" : "text-white/35 ultra:text-white/80 hover:text-white/60 ultra:hover:text-white"
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

      <div className="tier-upgrade-cta px-2.5 pb-2">
        <Link
          href="/settings/plan"
          className={cn(
            "flex items-center gap-2.5 rounded-[10px] border border-white/15 bg-white/[0.08] px-3 py-2 transition-colors",
            "hover:bg-white/[0.13] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          )}
        >
          <Flame className="size-[16px] shrink-0 text-[var(--tier-grad-1)]" strokeWidth={1.8} />
          {/* Price/trial fact added 2026-09-02, founder direction: state it everywhere
              Ultra is offered. Second line, not appended to the label — "Upgrade your
              plan — 399,99 TL/month · First week free" would wrap awkwardly at this
              214px width, and a subtext line reads as a fact being disclosed rather than
              a longer pitch. Deliberately no urgency language or countdown, per the
              founder's own constraint — the two facts, stated once, nothing else.
              white/90, not the label's full white: this backdrop is one step lighter
              than the plain sidebar (the CTA's own bg-white/[0.08] pill sits on top of
              the scrimmed flame gradient, brightening it slightly), and computed WCAG
              contrast against that composited color — not assumed from the nav labels'
              own numbers, which are a different backdrop — put the floor at 90%: 85%
              measured 4.34:1 and failed, 90% measured 4.64:1 and cleared it. */}
          <span className="flex min-w-0 flex-col">
            <span className="text-[13px] font-medium text-white">{t("upgradePlan")}</span>
            {/* No truncate: measured live at 168px needed vs 142px available at this
                width, in English — "First week free" was getting cut to "First we…",
                silently dropping the fact this line exists to state. Wraps to two lines
                instead; both languages checked, neither runs past three. */}
            <span className="text-[11px] leading-snug text-white/90">{t("upgradePlanPrice", { price: formatPrice(ultraPriceTry, locale) })}</span>
          </span>
        </Link>
      </div>

      <div className="border-t border-white/[0.06]">
        <Link
          href={SETTINGS_ITEM.href}
          aria-current={isActive(SETTINGS_ITEM.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 px-[22px] py-2.5 text-[13px] transition-colors",
            "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
            isActive(SETTINGS_ITEM.href) ? "bg-white/[0.07] text-white/90" : "text-white/38 ultra:text-white/80 hover:text-white/65 ultra:hover:text-white"
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
