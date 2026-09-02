"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

/**
 * The one-time "welcome to Ultra" moment (Phase 57 / founder request 2026-09-02). Rendered
 * by the caller only when lib/tier/ultra-welcome.ts's shouldShowUltraWelcome() says so, for
 * exactly one page load — see that file's own comment for why "shown" and "recorded" are
 * one guarantee, not two. This component has nothing to write: dismissing it is local-only
 * state, since the read that decided to show it already recorded that fact server-side
 * before this ever rendered.
 *
 * States what's now available, not what the student did — Phase 57's "no excessive praise"
 * applies literally here: a student who just paid doesn't want to be told they made a great
 * choice, they want to know what changed. Names only the two real differences
 * lib/tier/comparison.ts documents (visual theme, advisor allowance) plus the response-mode
 * slider's Ultra position genuinely unlocking (features/advisor/response-mode-slider.tsx's
 * own `canSelectUltra` gate) — nothing invented, nothing implied beyond what's true today.
 *
 * Inline, not a modal — this product doesn't wall anyone anywhere (founder's own standing
 * instruction), and a dialog that dims/covers the page reads as an interruption a plain
 * dismissible card at the top of the page doesn't.
 */
export function UltraWelcomeBanner({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = useTranslations("dashboard.ultraWelcome");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      role="note"
      aria-label={t("title")}
      lang={locale}
      className="relative mb-6 flex items-start gap-3 rounded-2xl border border-[var(--tier-grad-2)]/30 bg-[var(--tier-grad-1)]/[0.06] p-4 sm:p-5"
    >
      <Flame aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--tier-grad-2)]" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-foreground">{t("title")}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("body")}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("dismiss")}
        onClick={() => setDismissed(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </aside>
  );
}
