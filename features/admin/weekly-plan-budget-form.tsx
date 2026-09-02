"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateWeeklyPlanBudgetCeiling } from "@/app/(app)/admin/actions";

/** No confirm step — raising or lowering a spend ceiling is reversible (it only changes
 *  when future calls degrade, never anything already spent), matching ProviderRecheckButton's
 *  own reversible-action treatment rather than JobDisableToggle's confirmed one. */
export function WeeklyPlanBudgetForm({ currentCeilingUsd }: { currentCeilingUsd: number }) {
  const t = useTranslations("admin.weeklyPlanBudget");
  const [value, setValue] = useState(String(currentCeilingUsd));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    const parsed = Number(value);
    startTransition(async () => {
      const result = await updateWeeklyPlanBudgetCeiling(parsed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="weekly-plan-ceiling">{t("ceilingLabel")}</Label>
        <Input
          id="weekly-plan-ceiling"
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          className="w-32"
        />
      </div>
      <Button onClick={save} disabled={isPending || !Number.isFinite(Number(value)) || Number(value) <= 0} size="sm">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("saveButton")}
      </Button>
    </div>
  );
}
