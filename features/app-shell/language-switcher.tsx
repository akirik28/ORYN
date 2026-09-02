"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_LABELS, isLocale } from "@/lib/i18n/config";

/**
 * Interface language picker.
 *
 * Language names are endonyms and deliberately never translated (`LOCALE_LABELS`) — a
 * student hunting for Turkish looks for "Türkçe", not for whatever the language they
 * currently cannot read calls it.
 *
 * The switch is a Server Action round-trip rather than client state: the locale is
 * resolved server-side (cookie, then `profiles.preferred_language`) and the whole tree is
 * re-rendered with the new catalog, so there is no client-side copy of the language to
 * drift out of sync with what the server believes. `useTransition` keeps the current
 * language legible while that happens instead of blanking the control.
 */
export function LanguageSwitcher({ variant = "sidebar" }: { variant?: "sidebar" | "sheet" | "settings" }) {
  const t = useTranslations("language");
  const active = useLocale();
  const [pending, startTransition] = useTransition();

  function onSelect(next: string) {
    if (!isLocale(next) || next === active) return;

    startTransition(async () => {
      const result = await setLocale(next);
      // The language itself has already switched at this point — the cookie write
      // succeeded and only the write to the student's account failed. Saying so is more
      // useful than a generic failure, because the visible outcome is success and the
      // part that broke is invisible until they open the product somewhere else.
      if (result.error === "not-saved-to-account") toast.error(t("saveFailed"));
    });
  }

  const onDark = variant === "sidebar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("change")}
        disabled={pending}
        className={cn(
          "flex w-full items-center gap-2.5 transition-colors focus-visible:outline-none disabled:opacity-60",
          onDark
            ? // ultra: overrides match sidebar.tsx's own — same scrim, same computed
              // 4.5:1-at-80%/100% fix, see that file's doc comment for the numbers.
              "px-[22px] py-2.5 text-[13px] text-white/38 ultra:text-white/80 hover:text-white/65 ultra:hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
            : "min-h-12 rounded-lg px-3 py-2.5 text-sm text-ink-2 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        {pending ? (
          <Loader2 className="size-[18px] shrink-0 animate-spin" strokeWidth={1.6} />
        ) : (
          <Globe className="size-[18px] shrink-0" strokeWidth={1.6} />
        )}
        {/* The control's accessible name is the stable "Change language" above; this
            visible text is the current value, which is why it is not the label. */}
        <span className="truncate">{LOCALE_LABELS[isLocale(active) ? active : "en"]}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuRadioGroup value={active} onValueChange={onSelect}>
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {LOCALE_LABELS[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
