"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBusyMode, updateTimeBudget } from "@/app/(app)/settings/actions";
import type { TimeBudget } from "@/types/database";

/** Phases 64/65 — how much of the weekly plan's "3 highest-impact actions" a student can
 * realistically act on. Both fields already flow into the advisor's prompt context
 * (lib/ai/student-context.ts); this is the form that actually lets a student set them. */
export function CapacityForm({
  initialTimeBudget,
  initialBusyMode,
  initialBusyModeUntil,
}: {
  initialTimeBudget: TimeBudget | null;
  initialBusyMode: boolean;
  initialBusyModeUntil: string | null;
}) {
  const t = useTranslations("common");
  const tCapacity = useTranslations("settings.capacity");
  const TIME_BUDGET_OPTIONS: { value: TimeBudget; label: string }[] = [
    { value: "under_2h", label: tCapacity("timeBudgetOptions.under2h") },
    { value: "2_5h", label: tCapacity("timeBudgetOptions.between2And5h") },
    { value: "5_10h", label: tCapacity("timeBudgetOptions.between5And10h") },
    { value: "10h_plus", label: tCapacity("timeBudgetOptions.over10h") },
  ];
  const [timeBudget, setTimeBudget] = useState<TimeBudget | null>(initialTimeBudget);
  const [busyMode, setBusyMode] = useState(initialBusyMode);
  const [busyModeUntil, setBusyModeUntil] = useState(initialBusyModeUntil ?? "");
  const [savedField, setSavedField] = useState<"time" | "busy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="time-budget">{tCapacity("timeBudgetLabel")}</Label>
        <div className="flex items-end gap-2">
          <Select
            value={timeBudget ?? undefined}
            onValueChange={(v) => {
              if (!v) return;
              setTimeBudget(v as TimeBudget);
              setSavedField(null);
            }}
          >
            <SelectTrigger id="time-budget" className="w-full">
              <SelectValue placeholder={tCapacity("notSet")} />
            </SelectTrigger>
            <SelectContent>
              {TIME_BUDGET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={isPending || timeBudget === initialTimeBudget}
            onClick={() =>
              startTransition(async () => {
                const result = await updateTimeBudget(timeBudget);
                if (result.error) setError(result.error);
                else setSavedField("time");
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : savedField === "time" ? tCapacity("saved") : t("save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{tCapacity("timeBudgetHelper")}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="busy-mode"
            checked={busyMode}
            onCheckedChange={(checked) => {
              setBusyMode(checked === true);
              setSavedField(null);
            }}
          />
          <Label htmlFor="busy-mode" className="font-normal">
            {tCapacity("busyModeLabel")}
          </Label>
        </div>
        {busyMode ? (
          <div className="flex items-center gap-2 pl-6">
            <Label htmlFor="busy-until" className="text-xs text-muted-foreground">
              {tCapacity("until")}
            </Label>
            <Input
              id="busy-until"
              type="date"
              className="w-auto"
              value={busyModeUntil}
              onChange={(e) => {
                setBusyModeUntil(e.target.value);
                setSavedField(null);
              }}
            />
          </div>
        ) : null}
        <div className="pl-6">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || (busyMode === initialBusyMode && busyModeUntil === (initialBusyModeUntil ?? ""))}
            onClick={() =>
              startTransition(async () => {
                const result = await updateBusyMode(busyMode, busyMode ? busyModeUntil || null : null);
                if (result.error) setError(result.error);
                else setSavedField("busy");
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : savedField === "busy" ? tCapacity("saved") : t("save")}
          </Button>
        </div>
        <p className="pl-6 text-xs text-muted-foreground">{tCapacity("busyModeHelper")}</p>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
