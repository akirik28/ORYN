import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, SearchIcon, X } from "lucide-react";
import { EmptyState } from "@/components/proxola/empty-state";
import { resolveLocale } from "@/lib/i18n/locale";
import { searchResultTypeLabel, type SearchResult } from "@/lib/search/types";

export async function SearchView({ query, results }: { query: string; results: SearchResult[] }) {
  const locale = await resolveLocale();
  const t = await getTranslations("search.view");

  return (
    <div className="mx-auto max-w-[600px] space-y-7">
      <div className="space-y-4">
        {/* Italic display title (Figma source App.tsx `SearchScreen`) — the app's own
            font-display (not the source's Instrument Serif; see lib/fonts.ts's scoping
            note), matching how this page's counterparts elsewhere use the same face. */}
        <h1 className="font-display text-3xl tracking-[-0.02em] italic">{t("title")}</h1>

        {/* A real GET form, not source's client-only instant filter: works without JS and
            hits the real globalSearch backend rather than a hardcoded 8-row array. Visual
            only — shape/border/icon match source, submission behavior is unchanged. */}
        <form action="/search" className="flex items-center gap-2.5 rounded-[14px] border-2 border-brand-primary bg-background px-4 py-3 shadow-[0_4px_20px_rgba(61,53,232,0.10)]">
          <Search className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
          <input
            name="q"
            defaultValue={query}
            placeholder={t("placeholder")}
            aria-label={t("inputAriaLabel")}
            autoFocus
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
          {query ? (
            // A plain link to the bare route, not a same-named submit button — a button
            // sharing the input's `name="q"` would send both values on submit (`q` twice).
            <Link href="/search" aria-label={t("clearAriaLabel")} className="text-ink-4 hover:text-ink-2">
              <X className="size-4" />
            </Link>
          ) : null}
        </form>
      </div>

      {query.length > 0 && query.length < 2 ? <p className="text-sm text-muted-foreground">{t("keepTyping")}</p> : null}

      {query.length >= 2 ? (
        results.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                className="flex items-center gap-3.5 rounded-xl px-4 py-3 transition-colors hover:bg-white/80"
                style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.70)" }}
              >
                <span className="shrink-0 rounded-[5px] bg-brand-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-primary-strong">
                  {searchResultTypeLabel(result.type, locale)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-1">{result.title}</p>
                  {result.subtitle ? <p className="truncate text-xs text-ink-3">{result.subtitle}</p> : null}
                </div>
                <span aria-hidden="true" className="shrink-0 text-ink-4">
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={SearchIcon} title={t("noResultsTitle")} description={t("noResultsFor", { query })} />
        )
      ) : null}
    </div>
  );
}
