import { differenceInCalendarDays } from "date-fns";
import { Clock } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";

function urgencyTone(daysUntil: number): StatusTone {
  if (daysUntil <= 3) return "error";
  if (daysUntil <= 7) return "warning";
  if (daysUntil <= 14) return "brand";
  return "neutral";
}

function urgencyLabel(daysUntil: number): string {
  if (daysUntil < 0) return "Past due";
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "1 day left";
  return `${daysUntil} days left`;
}

// Single source of truth for "how urgent is this deadline" — was previously duplicated
// (with slightly different thresholds) across the dashboard, opportunity cards, and
// applications. date-fns `differenceInCalendarDays` (already a dependency elsewhere)
// so "due today" means the calendar date, not a 24h countdown.
export function DeadlineBadge({ date, className }: { date: string | Date; className?: string }) {
  const daysUntil = differenceInCalendarDays(new Date(date), new Date());
  return <StatusBadge label={urgencyLabel(daysUntil)} tone={urgencyTone(daysUntil)} icon={Clock} className={className} />;
}
