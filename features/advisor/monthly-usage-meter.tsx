"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";
import { usageState } from "@/lib/ai/usage-state";

/**
 * This month's counselor allowance, as a real balance rather than decoration — the number
 * shown is the same one app/(app)/advisor/actions.ts enforces, counted from `ai_usage`.
 *
 * The bar shows what is LEFT, not what has been spent, because everything around it does:
 * the big figure is `remaining`, and the sentence underneath reads "300 messages left".
 * Drawing spent instead put the panel at odds with itself — at the start of a month it
 * said "300 messages left" above a completely empty bar, which reads as "you have none"
 * and was reported as the bar being missing (founder, 2026-08-31). Full at the start of
 * the month, draining as it is used, is the meaning the surrounding copy already carries.
 *
 * The colour is a function of how much is left, not a fixed brand gradient: a bar that
 * looks identical at 5% and 95% spent tells a student nothing. It travels indigo → violet
 * while there is plenty of headroom, warms to amber past three-quarters, and goes rose
 * once the allowance is nearly gone. The sheen animation is confined to the filled portion
 * and stops entirely at the exhausted state, where a cheerful shimmer would be the wrong
 * note.
 *
 * `budgetDegraded` is a second, independent signal from `quota` (2026-09-02, degrade-
 * disclosure package) — `quota` is the message-count backstop (50/month,
 * lib/ai/monthly-quota.ts), but replies actually start using the cheaper model earlier,
 * once this month's spend crosses lib/ai/limits/budget.ts's $0.50 target (~19 messages at
 * today's real per-message cost). Before this, the bar could show a full indigo-violet
 * fill and "30 messages left" while the student's last several replies were already
 * degraded — true about the message count, misleading about what's actually happening to
 * their conversation. `budgetDegraded` takes priority over the message-count colour/copy
 * for exactly that reason: being degraded is the more urgent, more immediate fact once
 * it's true, regardless of how much of the message-count backstop remains. Optional and
 * defaults to `false` — a caller not yet passing it renders exactly as before, matching this
 * codebase's established "not yet wired up" convention (see lib/ai/usage.ts's `degraded?`
 * param doc).
 */
export function MonthlyUsageMeter({
  quota,
  budgetDegraded = false,
  className,
}: {
  quota: MonthlyQuota;
  budgetDegraded?: boolean;
  className?: string;
}) {
  const t = useTranslations("advisor.usageMeter");
  const locale = useLocale() as Locale;
  // Animate up from empty on mount so the bar reads as a measurement being taken rather
  // than a static graphic. Width transitions handle the rest.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(1 - quota.fraction));
    return () => cancelAnimationFrame(id);
  }, [quota.fraction]);

  // Shared with features/app-shell/usage-indicator.tsx (lib/ai/usage-state.ts's own
  // comment has the full reasoning for the state ordering) — one classification, not one
  // per surface that shows it.
  const state = usageState(quota, budgetDegraded);
  const unknown = state === "unknown";
  const exhausted = state === "exhausted";
  const degraded = state === "degraded";
  const low = state === "low";
  const spent = quota.fraction;

  const fill = exhausted
    ? "from-rose-500 via-rose-400 to-rose-500"
    : degraded || low
      ? "from-amber-500 via-orange-400 to-amber-500"
      : spent > 0.75
        ? "from-amber-400 via-violet-400 to-indigo-400"
        : "from-indigo-500 via-violet-400 to-fuchsia-400";

  // Inline rather than an arbitrary `shadow-[...]` class: Tailwind's shadow utilities
  // compose through CSS variables that the reset zeroes out, so the arbitrary value was
  // being flattened to a transparent shadow.
  const glow = exhausted
    ? "0 0 18px -2px rgba(244,63,94,0.65)"
    : degraded || low
      ? "0 0 18px -2px rgba(245,158,11,0.6)"
      : "0 0 20px -2px rgba(139,92,246,0.55)";

  // formatAbsoluteDate, not a bare toLocaleDateString(undefined, ...) — the old call used the
  // *browser's* locale, entirely independent of the app's own oryn_locale cookie, so this
  // date could already disagree with a page otherwise rendering in Turkish.
  const resets = formatAbsoluteDate(quota.resetsAt, locale, { month: "short", day: "numeric" });

  return (
    // Toned for the surface this actually sits on. Every value here used to be white-alpha
    // (border-white/12, bg-white/[0.04], track bg-white/[0.07], text-white/35) — correct on
    // a dark card, but the meter's only caller puts it in the Counselor page's light
    // sidebar, beside a `border-white/65 bg-white/45` chat panel. At 4-12% white on a pale
    // lilac ground the panel, its border and the whole progress track were invisible, so
    // the meter read as an unstyled number floating on the page (founder report,
    // 2026-08-31: "bar gözükmüyor, saydam"). Tokens below flip with the theme rather than
    // assuming either one.
    <div
      className={cn(
        "rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.04]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground" lang={locale}>
          <Sparkles className="size-3.5" /> {t("thisMonth")}
        </p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          <span
            className={cn(
              "font-semibold",
              unknown
                ? "text-muted-foreground"
                : exhausted
                ? "text-rose-600 dark:text-rose-300"
                : degraded || low
                  ? "text-amber-600 dark:text-amber-300"
                  : "text-foreground",
            )}
          >
            {unknown ? "—" : quota.remaining}
          </span>
          <span className="text-ink-3"> / {quota.limit}</span>
        </p>
      </div>

      <div
        className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/[0.07]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={unknown ? undefined : quota.remaining}
        aria-label={
          unknown
            ? t("ariaUnknown", { limit: formatNumber(quota.limit) })
            : t("ariaKnown", { remaining: formatNumber(quota.remaining), limit: formatNumber(quota.limit) })
        }
      >
        <div
          className={cn(
            "relative h-full rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
            fill,
          )}
          // Floor of 3% while anything remains, so a last message or two is still a visible
          // sliver rather than rounding away to an empty bar. Exhausted is a true zero.
          style={{ width: unknown ? "0%" : `${exhausted ? 0 : Math.max(shown * 100, 3)}%`, boxShadow: unknown ? undefined : glow }}
        >
          {/* Sheen travels across the filled portion only. Suppressed once exhausted. */}
          {!exhausted && !unknown ? (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="usage-sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground">
        {unknown
          ? t("unknown", { limit: formatNumber(quota.limit), date: resets })
          : exhausted
            ? t("exhausted", { limit: formatNumber(quota.limit), date: resets })
            : degraded
              ? t("degraded", { date: resets })
              : low
                ? t("low", { remaining: formatNumber(quota.remaining), date: resets })
                : t("normal", { remaining: formatNumber(quota.remaining), date: resets })}
      </p>
    </div>
  );
}
