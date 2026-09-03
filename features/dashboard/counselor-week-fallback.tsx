import Link from "next/link";
import { ActionCard } from "@/components/proxola/action-card";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CounselorRecommendation } from "@/lib/counselor";

/**
 * Deterministic "This week" fallback (B4, counselor-data-quality-v1 founder brief) —
 * renders Counselor Core's own ranked "do" candidates (lib/counselor/dashboard-contract.ts)
 * when the AI weekly plan (lib/ai/weekly-plan.ts) hasn't run or is unavailable, so the
 * dashboard is never solely blocked on an AI call to show real, useful priorities.
 *
 * Deliberately read-only, unlike WeeklyFocus's checkbox/reflection flow: these
 * recommendations aren't backed by a persisted `weekly_actions` row, so there's nothing to
 * toggle or reflect on yet — a student who wants to act uses the same nextAction link
 * CounselorPriorities already offers on the Advisor page (same visual language, no new
 * component pattern introduced).
 */
export function CounselorWeekFallback({ actions, locale = DEFAULT_LOCALE }: { actions: CounselorRecommendation[]; locale?: Locale }) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <ActionCard
          key={action.id}
          leading={
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-sm font-medium text-brand-primary-strong">
              {index + 1}
            </span>
          }
          title={action.title}
          reason={action.why[0]}
          impact={action.impact}
          meta={
            <>
              {action.deadline ? <DeadlineBadge date={action.deadline.date} locale={locale} /> : null}
              <Button variant="outline" size="xs" render={<Link href={action.nextAction.href} />} nativeButton={false}>
                {action.nextAction.label}
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}
