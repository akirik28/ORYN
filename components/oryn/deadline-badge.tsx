import { differenceInCalendarDays } from "date-fns";
import { Clock } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

function urgencyTone(daysUntil: number): StatusTone {
  if (daysUntil <= 3) return "error";
  if (daysUntil <= 7) return "warning";
  if (daysUntil <= 14) return "brand";
  return "neutral";
}

function urgencyLabel(daysUntil: number, locale: Locale): string {
  const tr = locale === "tr";
  if (daysUntil < 0) return tr ? "süresi geçti" : "Past due";
  if (daysUntil === 0) return tr ? "son gün bugün" : "Due today";
  if (daysUntil === 1) return tr ? "1 gün kaldı" : "1 day left";
  return tr ? `${daysUntil} gün kaldı` : `${daysUntil} days left`;
}

// Single source of truth for "how urgent is this deadline" — was previously duplicated
// (with slightly different thresholds) across the dashboard, opportunity cards, and
// applications. date-fns `differenceInCalendarDays` (already a dependency elsewhere)
// so "due today" means the calendar date, not a 24h countdown.
//
// Plain function taking `locale`, not a next-intl hook — this component's 7 call sites
// span both Server and Client Components, and a hook would force one or the other.
// `locale` is optional/defaulted rather than required, matching source-badge.tsx and
// confidence-indicator.tsx's own precedent, so a caller this pass didn't reach still
// compiles; confirmed live in Turkish on /advisor ("30 days left") before this fix.
export function DeadlineBadge({ date, className, locale = DEFAULT_LOCALE }: { date: string | Date; className?: string; locale?: Locale }) {
  const daysUntil = differenceInCalendarDays(new Date(date), new Date());
  return <StatusBadge label={urgencyLabel(daysUntil, locale)} tone={urgencyTone(daysUntil)} icon={Clock} className={className} />;
}
