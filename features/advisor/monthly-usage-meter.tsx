"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";

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
 */
export function MonthlyUsageMeter({ quota, className }: { quota: MonthlyQuota; className?: string }) {
  // Animate up from empty on mount so the bar reads as a measurement being taken rather
  // than a static graphic. Width transitions handle the rest.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(1 - quota.fraction));
    return () => cancelAnimationFrame(id);
  }, [quota.fraction]);

  const spent = quota.fraction;
  const exhausted = quota.remaining <= 0;
  const low = !exhausted && quota.remaining <= quota.limit * 0.1;

  const fill = exhausted
    ? "from-rose-500 via-rose-400 to-rose-500"
    : low
      ? "from-amber-500 via-orange-400 to-amber-500"
      : spent > 0.75
        ? "from-amber-400 via-violet-400 to-indigo-400"
        : "from-indigo-500 via-violet-400 to-fuchsia-400";

  // Inline rather than an arbitrary `shadow-[...]` class: Tailwind's shadow utilities
  // compose through CSS variables that the reset zeroes out, so the arbitrary value was
  // being flattened to a transparent shadow.
  const glow = exhausted
    ? "0 0 18px -2px rgba(244,63,94,0.65)"
    : low
      ? "0 0 18px -2px rgba(245,158,11,0.6)"
      : "0 0 20px -2px rgba(139,92,246,0.55)";

  const resets = new Date(quota.resetsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

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
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5" /> This month
        </p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          <span
            className={cn(
              "font-semibold",
              exhausted
                ? "text-rose-600 dark:text-rose-300"
                : low
                  ? "text-amber-600 dark:text-amber-300"
                  : "text-foreground",
            )}
          >
            {quota.remaining}
          </span>
          <span className="text-ink-4"> / {quota.limit}</span>
        </p>
      </div>

      <div
        className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/[0.07]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={quota.remaining}
        aria-label={`${quota.remaining} of ${quota.limit} counselor messages left this month`}
      >
        <div
          className={cn(
            "relative h-full rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
            fill,
          )}
          // Floor of 3% while anything remains, so a last message or two is still a visible
          // sliver rather than rounding away to an empty bar. Exhausted is a true zero.
          style={{ width: `${exhausted ? 0 : Math.max(shown * 100, 3)}%`, boxShadow: glow }}
        >
          {/* Sheen travels across the filled portion only. Suppressed once exhausted. */}
          {!exhausted ? (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="usage-sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground">
        {exhausted
          ? `All ${quota.limit} messages used. Resets ${resets}.`
          : low
            ? `Only ${quota.remaining} left. Resets ${resets}.`
            : `${quota.remaining} counselor messages left. Resets ${resets}.`}
      </p>
    </div>
  );
}
