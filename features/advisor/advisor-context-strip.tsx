import { Gauge, Clock, CalendarClock } from "lucide-react";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { ProfileDimension, TimeBudget } from "@/types/database";

const TIME_BUDGET_LABEL: Record<TimeBudget, string> = {
  under_2h: "Under 2h/week",
  "2_5h": "2–5h/week",
  "5_10h": "5–10h/week",
  "10h_plus": "10h+/week",
};

// The spec is explicit that the Advisor shouldn't read as a generic chatbot with no
// memory of the student — a compact, always-visible strip of what Oryn already knows,
// rather than making the student re-state it every conversation.
export function AdvisorContextStrip({
  biggestGap,
  upcomingDeadlineCount,
  timeBudget,
}: {
  biggestGap: { dimension: ProfileDimension; score: number } | null;
  upcomingDeadlineCount: number;
  timeBudget: TimeBudget | null;
}) {
  const chips = [
    biggestGap
      ? { icon: Gauge, label: `${DIMENSION_LABELS[biggestGap.dimension]} ${biggestGap.score}/100` }
      : null,
    upcomingDeadlineCount > 0
      ? { icon: CalendarClock, label: `${upcomingDeadlineCount} upcoming deadline${upcomingDeadlineCount === 1 ? "" : "s"}` }
      : null,
    timeBudget ? { icon: Clock, label: TIME_BUDGET_LABEL[timeBudget] } : null,
  ].filter((c): c is { icon: typeof Gauge; label: string } => c !== null);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary-border bg-brand-primary-subtle px-3 py-1 text-xs font-medium text-brand-primary-strong"
        >
          <chip.icon className="size-3.5" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}
