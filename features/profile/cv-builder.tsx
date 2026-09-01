"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/oryn/empty-state";
import { spanLabel } from "@/lib/profile/journey";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioCategory, type PortfolioItem } from "@/lib/portfolio/types";

/** Student's own words only — bullets come straight from `description`/`meta` already on
 * the record (the same fields Profile's "Improve with AI" already helps sharpen). No AI
 * call happens here: this view organizes and formats existing facts, never invents new
 * ones, matching the founder's own "AI improves wording, never invents facts" CV principle. */
// Shares the Journey timeline's formatter rather than joining raw column values: this
// was printing "2025-09-01 – Present" into a document students hand to people. spanLabel
// is also timezone-safe, which a naive `new Date(...)` here would not have been.
function dateRange(item: PortfolioItem) {
  return spanLabel({
    start: item.startDate,
    end: item.endDate,
    ongoing: item.ongoing,
    ongoingLabel: "Present",
  });
}

export function CVBuilder({
  studentName,
  schoolName,
  country,
  graduationYear,
  items,
}: {
  studentName: string;
  schoolName: string | null;
  country: string | null;
  graduationYear: number | null;
  items: PortfolioItem[];
}) {
  const t = useTranslations("profile.cvBuilder");
  const [cvTitle, setCvTitle] = useState("My CV");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));

  const byCategory = useMemo(() => {
    const categories = Object.keys(PORTFOLIO_CATEGORY_LABELS) as PortfolioCategory[];
    return categories
      .map((category) => ({ category, items: items.filter((i) => i.category === category) }))
      .filter((group) => group.items.length > 0);
  }, [items]);

  const selectedCount = selected.size;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(categoryItems: PortfolioItem[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of categoryItems) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  if (items.length === 0) {
    return <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    // Both tracks are minmax(0,...) rather than a bare `1fr`/implicit `auto`. A grid item
    // defaults to `min-width: auto`, so an `auto`-minimum track is inflated to the item's
    // min-content width — and the "Include" list's entry titles are `truncate`, i.e.
    // `white-space: nowrap`, which makes their min-content the *full* untruncated title.
    // At 375px that sized the single mobile column to 623px: the layout's own
    // `overflow-x-hidden` then clipped the right half of both the controls panel and the CV
    // preview, with no way to scroll to it (founder report, 2026-08-31). The explicit `0`
    // minimum lets the track shrink and the titles ellipsise as they were always meant to.
    // Same idiom the advisor/dashboard/universities grids already use.
    <div className="grid gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Controls panel gets the glass-card frame; the print area below deliberately does
          not (a printed CV must stay a plain white document — `print:` resets already
          strip its screen chrome, and an animated glow has no business near it). */}
      <div className="glass-card h-fit min-w-0 space-y-6 rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl print:hidden">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="cv-title">
            {t("cvTitleLabel")}
          </label>
          <Input id="cv-title" value={cvTitle} onChange={(e) => setCvTitle(e.target.value)} placeholder={t("cvTitlePlaceholder")} />
          <p className="text-xs text-muted-foreground">{t("cvTitleHelper")}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("includeCount", { selected: selectedCount, total: items.length })}</p>
          </div>
          {byCategory.map((group) => {
            const allChecked = group.items.every((i) => selected.has(i.id));
            return (
              <div key={group.category} className="space-y-2 rounded-xl border p-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox checked={allChecked} onCheckedChange={(c) => toggleCategory(group.items, c === true)} />
                  {PORTFOLIO_CATEGORY_LABELS[group.category]}
                </label>
                <div className="space-y-1.5 pl-6">
                  {group.items.map((item) => (
                    <label key={item.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
                      <span className="min-w-0 truncate">{item.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={() => window.print()} className="w-full">
          <Printer className="size-4" /> {t("printButton")}
        </Button>
      </div>

      {/* Deliberately untranslated: PORTFOLIO_CATEGORY_LABELS backs both this printed area's
          section headers AND the controls panel's checkbox-group labels above, so partially
          localizing it would either mismatch the two (checkbox says "Eğitim", the printed
          section under it still says "Education") or require deciding whether a printed CV
          — a document a student may hand to an English-speaking reader regardless of their
          own UI locale — should follow their locale at all, a real product question this
          pass doesn't have an answer to. Left both sides consistent instead of half-fixing
          one and creating a new, more visible mismatch. */}
      {/* p-5 below `sm`: 32px of padding either side of a 343px column left the CV body
          under 280px, which wrapped every entry into a ragged column. */}
      <div className="cv-print-area min-w-0 rounded-2xl border bg-card p-5 sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b pb-4">
          <h1 className="font-display text-2xl">{studentName}</h1>
          <p className="text-sm text-muted-foreground">
            {[schoolName, country, graduationYear ? `Class of ${graduationYear}` : null].filter(Boolean).join(" · ")}
          </p>
        </header>

        {byCategory.map((group) => {
          const visible = group.items.filter((i) => selected.has(i.id));
          if (visible.length === 0) return null;
          return (
            <section key={group.category} className="mt-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
                {PORTFOLIO_CATEGORY_LABELS[group.category]}
              </h2>
              <div className="mt-2 space-y-3">
                {visible.map((item) => (
                  <div key={item.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm font-medium">
                        {item.title}
                        {item.organization ? <span className="font-normal text-muted-foreground"> — {item.organization}</span> : null}
                      </p>
                      {dateRange(item) ? <span className="shrink-0 text-xs text-muted-foreground">{dateRange(item)}</span> : null}
                    </div>
                    {item.description ? <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p> : null}
                    {item.meta ? <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
