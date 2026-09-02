"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import { formatNumber } from "@/lib/i18n/format";
import { usageState } from "@/lib/ai/usage-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/config";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";

/**
 * Founder, 2026-09-02, verbatim: "token limitini kullanıcılar da görsün, yani bir bar
 * olsun, hep görünen, rengi falan değişsin — ben çok sessizce yapmak istemiyorum çünkü
 * sonra bize suç atacak" — a visible usage bar, always present, colour changes with
 * state, explicitly not silent. features/advisor/monthly-usage-meter.tsx already builds
 * the full panel (this month / remaining / a sentence) but its only caller is the advisor
 * page itself — everywhere else, a student's usage was invisible until they happened to
 * visit /advisor. This is that same signal, always on screen, in the app shell every
 * authenticated page shares (app/(app)/layout.tsx → Topbar on desktop, MobileNav below
 * lg) — reusing lib/ai/usage-state.ts's classification rather than a second one, and the
 * exact same advisor.usageMeter copy (Phase 57's register, already written) in the
 * tooltip rather than new wording for the same fact.
 *
 * Deliberately a small bar, not the full panel, here: this sits beside a 34px icon button
 * (NotificationBell) in a persistent strip present on every page, not a dedicated one like
 * the advisor sidebar. A `title`-shaped tooltip carries the one sentence the founder's
 * "not silently" reasoning actually calls for; the full remaining-count/reset-date detail
 * stays one tap away at /advisor, where features/advisor/monthly-usage-meter.tsx already
 * shows it in full. Colour is the always-visible part; the sentence is the disclosed part.
 */
export function UsageIndicator({ quota, budgetDegraded }: { quota: MonthlyQuota; budgetDegraded: boolean }) {
  const t = useTranslations("advisor.usageMeter");
  const locale = useLocale() as Locale;
  const state = usageState(quota, budgetDegraded);
  const resets = formatAbsoluteDate(quota.resetsAt, locale, { month: "short", day: "numeric" });

  const sentence =
    state === "unknown"
      ? t("unknown", { limit: formatNumber(quota.limit), date: resets })
      : state === "exhausted"
        ? t("exhausted", { limit: formatNumber(quota.limit), date: resets })
        : state === "degraded"
          ? t("degraded", { date: resets })
          : state === "low"
            ? t("low", { remaining: formatNumber(quota.remaining), date: resets })
            : t("normal", { remaining: formatNumber(quota.remaining), date: resets });

  const fillColor =
    state === "exhausted"
      ? "bg-rose-500"
      : state === "degraded" || state === "low"
        ? "bg-amber-500"
        : "bg-indigo-500 dark:bg-violet-400";

  // Same 3% floor as the full meter — a last message or two stays a visible sliver rather
  // than rounding away to nothing, and "unknown" never claims a fraction it doesn't have.
  const fillWidth = state === "unknown" ? 0 : state === "exhausted" ? 0 : Math.max((1 - quota.fraction) * 100, 3);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href="/advisor"
            style={{ background: "white", borderColor: "#EEEEF6" }}
            className="flex h-[34px] w-14 shrink-0 items-center rounded-[9px] border px-2 transition-colors hover:border-current focus-visible:outline-none dark:border-white/12 dark:bg-transparent"
          />
        }
        aria-label={sentence}
      >
        <span
          className={cn("relative h-1.5 w-full overflow-hidden rounded-full", state === "unknown" ? "bg-black/10 dark:bg-white/10" : "bg-black/10 dark:bg-white/[0.07]")}
          aria-hidden="true"
        >
          {state === "unknown" ? (
            <span className="absolute inset-0 rounded-full border border-dashed border-black/20 dark:border-white/25" />
          ) : (
            <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out", fillColor)} style={{ width: `${fillWidth}%` }} />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{sentence}</TooltipContent>
    </Tooltip>
  );
}
