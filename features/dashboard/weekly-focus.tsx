"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionCard } from "@/components/proxola/action-card";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import { staggerFadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { updateActionStatus } from "@/app/(app)/plan/actions";
import type { Locale } from "@/lib/i18n/config";
import type { ReflectionOutcome, WeeklyAction } from "@/types/database";

const REFLECTION_OPTIONS: ReflectionOutcome[] = [
  "completed_successfully",
  "partially_completed",
  "did_not_work",
  "opportunity_no_longer_available",
];

/** Labels live in the message catalogs, not next to the values — this runs inside a
 *  component (ActionRow), where the translation hook is actually valid to call, unlike
 *  the module-level array above. Kept as a static if/else chain rather than a computed
 *  key so __tests__/i18n/translation-keys.test.ts can still verify every call. */
function reflectionLabel(t: ReturnType<typeof useTranslations>, value: ReflectionOutcome): string {
  if (value === "completed_successfully") return t("reflectionOptions.completedSuccessfully");
  if (value === "partially_completed") return t("reflectionOptions.partiallyCompleted");
  if (value === "did_not_work") return t("reflectionOptions.didNotWork");
  return t("reflectionOptions.noLongerAvailable");
}

function NumeralToggle({ index, done, pending, onToggle }: { index: number; done: boolean; pending: boolean; onToggle: () => void }) {
  const t = useTranslations("dashboard.weeklyFocus");
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={done}
      aria-label={done ? t("markNotStarted") : t("markComplete")}
      className={cn(
        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors duration-(--duration-fast)",
        done
          ? "bg-brand-primary text-primary-foreground"
          : "bg-brand-primary-soft text-brand-primary-strong hover:bg-brand-primary-border"
      )}
    >
      {done ? <Check className="size-3.5" /> : index}
    </button>
  );
}

function ActionRow({ action, index }: { action: WeeklyAction; index: number }) {
  const t = useTranslations("dashboard.weeklyFocus");
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const [showReflection, setShowReflection] = useState(false);
  const [localStatus, setLocalStatus] = useState(action.status);
  // AGENTS.md Phase 10 ("Allow short notes") — updateActionStatus has accepted and
  // persisted `reflectionNote` since it was written, but no input for it existed anywhere,
  // so the capability was reachable from the server and dead everywhere else. Deliberately
  // a single-line Input, not a Textarea: "short notes," and the four preset reasons above
  // already carry the main signal — this is for the one extra detail worth keeping, not a
  // second description field.
  const [reflectionNote, setReflectionNote] = useState("");
  const isDone = localStatus === "completed";

  function toggle() {
    const previousStatus = localStatus;
    const previousShowReflection = showReflection;
    const nextStatus = isDone ? "not_started" : "completed";
    setLocalStatus(nextStatus);
    setShowReflection(!isDone);
    startTransition(async () => {
      const result = await updateActionStatus({ actionId: action.id, status: nextStatus });
      if (result.error) {
        // Roll back both optimistic updates this click made — otherwise a failed write
        // leaves the checkbox showing "completed" (or the reflection prompt open)
        // indefinitely, misreporting success rather than just failing silently.
        setLocalStatus(previousStatus);
        setShowReflection(previousShowReflection);
        toast.error(result.error);
      }
    });
  }

  function saveReflection(outcome: ReflectionOutcome) {
    setShowReflection(false);
    const note = reflectionNote.trim();
    startTransition(async () => {
      const result = await updateActionStatus({
        actionId: action.id,
        status: "completed",
        reflectionOutcome: outcome,
        reflectionNote: note || undefined,
      });
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={staggerFadeUp}>
      <ActionCard
        leading={<NumeralToggle index={index + 1} done={isDone} pending={isPending} onToggle={toggle} />}
        title={action.title}
        reason={action.reason}
        impact={action.impact_level}
        estimatedMinutes={action.estimated_minutes}
        done={isDone}
        emphasis={index === 0}
        meta={action.deadline ? <DeadlineBadge date={action.deadline} locale={locale} /> : null}
      >
        {showReflection ? (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-3">{t("whatHappened")}</span>
              {REFLECTION_OPTIONS.map((value) => (
                <Button key={value} variant="outline" size="xs" onClick={() => saveReflection(value)}>
                  <Check className="size-3" /> {reflectionLabel(t, value)}
                </Button>
              ))}
            </div>
            <Input
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              placeholder={t("reflectionPlaceholder")}
              className="h-7 max-w-xs text-xs"
            />
          </div>
        ) : null}
      </ActionCard>
    </motion.div>
  );
}

/**
 * A completed action that survived a "Regenerate" click (migration 0077's `carried_forward`
 * -- see lib/plan/persist.ts). Read-only, deliberately: it already has whatever reflection
 * the student gave it, and re-opening that for editing weeks later isn't something this
 * surface needs to support. `reason` is repurposed from "why Oryn suggested this" (its role
 * in ActionRow, for a not-yet-done action) to "how it went" -- once an action is done, the
 * outcome is the more useful thing to show in the same slot, not a second line competing for
 * attention on what CEO scoped this as: a lighter, secondary surface.
 */
function CarriedForwardRow({ action }: { action: WeeklyAction }) {
  const t = useTranslations("dashboard.weeklyFocus");
  return (
    <ActionCard
      leading={
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-primary-foreground"
        >
          <Check className="size-3.5" />
        </span>
      }
      title={action.title}
      reason={action.reflection_outcome ? reflectionLabel(t, action.reflection_outcome) : undefined}
      done
    />
  );
}

export function WeeklyFocus({ actions }: { actions: WeeklyAction[] }) {
  const t = useTranslations("dashboard.weeklyFocus");
  if (actions.length === 0) {
    return <p className="text-sm text-ink-3">{t("noActions")}</p>;
  }

  // Split, not filtered-and-dropped: a carried-forward action is still real, it's just a
  // different kind of real. AGENTS.md's "at most three primary actions" is about what's
  // still to do -- CEO's call (docs/founder-blocked-backlog.md item 39) was that what's
  // already done this week is worth showing too, as long as it isn't competing with the
  // active three for the same slots. Active keeps the exact rendering (and index/priority
  // meaning) this component always had; nothing here changes for a week that's never been
  // regenerated, since carried_forward only ever becomes true partway through one.
  //
  // Deliberately no null/undefined guard on `action.carried_forward` here, even though
  // migration 0077 (the column itself) is written but not applied live as of 2026-09-02 --
  // see lib/plan/persist.ts's own SEV comment. While it's unapplied, every row comes back
  // with carried_forward simply absent, `!action.carried_forward` is true for all of them,
  // and every action -- including a genuinely carried-forward one -- lands in `active`, the
  // normal interactive list, rather than in a "Completed this week" section that can't exist
  // yet. That's the chosen degraded behavior (visible and interactive beats hidden), and it
  // falls out of plain JS truthiness with no special-case code required; don't add one.
  const active = actions.filter((action) => !action.carried_forward);
  const carriedForward = actions.filter((action) => action.carried_forward);

  return (
    <div className="space-y-6">
      {active.length > 0 ? (
        <div className="space-y-3">
          {active.map((action, index) => (
            <ActionRow key={action.id} action={action} index={index} />
          ))}
        </div>
      ) : null}
      {carriedForward.length > 0 ? (
        <div className="space-y-1 border-t pt-4">
          <p className="text-xs text-ink-3">{t("completedThisWeek")}</p>
          <div className="space-y-1">
            {carriedForward.map((action) => (
              <CarriedForwardRow key={action.id} action={action} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
