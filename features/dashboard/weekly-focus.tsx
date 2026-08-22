"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionCard } from "@/components/oryn/action-card";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { staggerFadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { updateActionStatus } from "@/app/(app)/plan/actions";
import type { ReflectionOutcome, WeeklyAction } from "@/types/database";

const REFLECTION_OPTIONS: { value: ReflectionOutcome; label: string }[] = [
  { value: "completed_successfully", label: "Completed successfully" },
  { value: "partially_completed", label: "Partially completed" },
  { value: "did_not_work", label: "Didn't work" },
  { value: "opportunity_no_longer_available", label: "No longer available" },
];

function NumeralToggle({ index, done, pending, onToggle }: { index: number; done: boolean; pending: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={done}
      aria-label={done ? "Mark as not started" : "Mark as complete"}
      className={cn(
        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-heading text-sm font-medium transition-colors duration-(--duration-fast)",
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
  const [isPending, startTransition] = useTransition();
  const [showReflection, setShowReflection] = useState(false);
  const [localStatus, setLocalStatus] = useState(action.status);
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
    startTransition(async () => {
      const result = await updateActionStatus({ actionId: action.id, status: "completed", reflectionOutcome: outcome });
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
        meta={action.deadline ? <DeadlineBadge date={action.deadline} /> : null}
      >
        {showReflection ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">What happened?</span>
            {REFLECTION_OPTIONS.map((option) => (
              <Button key={option.value} variant="outline" size="xs" onClick={() => saveReflection(option.value)}>
                <Check className="size-3" /> {option.label}
              </Button>
            ))}
          </div>
        ) : null}
      </ActionCard>
    </motion.div>
  );
}

export function WeeklyFocus({ actions }: { actions: WeeklyAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions in this week&apos;s plan yet.</p>;
  }

  return (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <ActionRow key={action.id} action={action} index={index} />
      ))}
    </div>
  );
}
