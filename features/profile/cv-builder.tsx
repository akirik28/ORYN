"use client";

import { useMemo, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/oryn/empty-state";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioCategory, type PortfolioItem } from "@/lib/portfolio/types";

/** Student's own words only — bullets come straight from `description`/`meta` already on
 * the record (the same fields Profile's "Improve with AI" already helps sharpen). No AI
 * call happens here: this view organizes and formats existing facts, never invents new
 * ones, matching the founder's own "AI improves wording, never invents facts" CV principle. */
function dateRange(item: PortfolioItem) {
  return [item.startDate, item.ongoing ? "Present" : item.endDate].filter(Boolean).join(" – ");
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
    return (
      <EmptyState
        icon={FileText}
        title="Add achievements to your profile first"
        description="Your CV is built entirely from your structured profile, never written from scratch."
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6 print:hidden">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="cv-title">
            CV title
          </label>
          <Input id="cv-title" value={cvTitle} onChange={(e) => setCvTitle(e.target.value)} placeholder="e.g. Economics CV" />
          <p className="text-xs text-muted-foreground">
            Only for your own reference — it doesn&apos;t print on the CV itself.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Include ({selectedCount}/{items.length})
            </p>
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
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="cv-print-area rounded-2xl border bg-card p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b pb-4">
          <h1 className="font-heading text-2xl font-semibold">{studentName}</h1>
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
