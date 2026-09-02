"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobBudgetFeature } from "@/lib/ai/limits/job-budget";

/**
 * The live-adjust control for one catalog job's monthly budget (setJobBudgetOverride/
 * clearJobBudgetOverride, app/(app)/admin/actions.ts) — same useTransition/toast/
 * router.refresh() shape as JobTriggerButton, extended with an editable value instead of a
 * single trigger. `budgetUsd` re-seeds the input on every render (a stale local value would
 * otherwise survive a router.refresh() that changed the real figure from elsewhere).
 */
export function JobBudgetEditor({
  feature,
  budgetUsd,
  isOverridden,
  saveAction,
  resetAction,
  saveLabel,
  resetLabel,
}: {
  feature: JobBudgetFeature;
  budgetUsd: number;
  isOverridden: boolean;
  saveAction: (feature: JobBudgetFeature, budgetUsd: number) => Promise<{ error?: string }>;
  resetAction: (feature: JobBudgetFeature) => Promise<{ error?: string }>;
  saveLabel: string;
  resetLabel: string;
}) {
  const [value, setValue] = useState(String(budgetUsd));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        step={0.01}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
        className="h-7 w-20 text-xs"
        aria-label={saveLabel}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={isPending}
        onClick={() => run(() => saveAction(feature, Number(value)))}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
        {saveLabel}
      </Button>
      {isOverridden ? (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={isPending} onClick={() => run(() => resetAction(feature))}>
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}
