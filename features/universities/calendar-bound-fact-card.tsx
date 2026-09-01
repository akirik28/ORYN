import { getTranslations } from "next-intl/server";
import { CalendarClock, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/oryn/status-badge";
import { formatRelativeTime } from "@/lib/i18n/date";
import { resolveLocale } from "@/lib/i18n/locale";
import type { CalendarBoundFactDisplay } from "@/lib/requirements/calendar-bound";

/**
 * Renders a calendar-bound fact (currently: CAO points cutoffs) as dated evidence about
 * competitiveness — never as a requirement a student can check off.
 *
 * The enforcement is the prop type, not this component's own restraint: `Calendar
 * BoundFactDisplay` (lib/requirements/calendar-bound.ts) carries no
 * `RequirementEvaluationStatus`, no reasoning field, nothing `RequirementEvaluationBadge`
 * or `evaluateRequirement()` produce. This component has nothing to render a Met/Not-met
 * verdict FROM, even by mistake — a later edit that tried to "unify" this with the
 * ordinary requirement card would have to change the data shape first, not just add a
 * prop, which is the point: the two paths staying visually and structurally distinct is
 * exactly what stops a competitive-outcome figure from being read as a threshold.
 *
 * Visual grammar deliberately matches DeadlineGroup's own list-item pattern (app/(app)/
 * universities/[id]/page.tsx) — a bordered list, one fact per row, source link — rather
 * than inventing a third card style on the same page.
 */
export async function CalendarBoundFactList({ title, items }: { title: string; items: CalendarBoundFactDisplay[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("universities.calendarBoundFacts");
  const locale = await resolveLocale();
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{t("competitivenessNote")}</p>
      <ul className="divide-y rounded-lg border">
        {items.map((fact) => (
          <li key={fact.id} className="space-y-1.5 px-4 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge label={t("pastCycle")} tone="neutral" icon={CalendarClock} />
            </div>
            <p>{fact.factText}</p>
            <p className="text-xs text-muted-foreground">{fact.nextCheckLabel}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {/* formatRelativeTime, not a raw formatDistanceToNow call — the previous version
                  bypassed lib/i18n/date.ts's locale-aware helper entirely, so this "Checked …"
                  timestamp stayed English-only even on an otherwise fully Turkish page. */}
              {fact.retrievedAt ? <span>{t("checkedAgo", { time: formatRelativeTime(fact.retrievedAt, locale) })}</span> : null}
              {fact.sourceUrl ? (
                <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {t("source")} <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
