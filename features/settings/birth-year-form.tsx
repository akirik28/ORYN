"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBirthYear } from "@/app/(app)/settings/actions";

const currentYear = new Date().getFullYear();

/**
 * Onboarding asks for this now, but every account created before it did has `birth_year`
 * null and no way to fix that — this is the way. Kept beside Citizenship rather than under
 * Account: both exist for the same reason, feeding `lib/counselor/eligibility.ts` so it can
 * answer "can I actually apply to this?" instead of declining to guess.
 */
export function BirthYearForm({ initialBirthYear }: { initialBirthYear: number | null }) {
  const t = useTranslations("common");
  const tBirthYear = useTranslations("settings.birthYear");
  const [birthYear, setBirthYear] = useState(initialBirthYear ? String(initialBirthYear) : "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = birthYear.trim();
  const parsed = Number(trimmed);
  const valid =
    trimmed !== "" && Number.isInteger(parsed) && parsed >= currentYear - 100 && parsed <= currentYear - 10;
  const unchanged = trimmed === (initialBirthYear ? String(initialBirthYear) : "");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="settings-birth-year">{tBirthYear("label")}</Label>
          <Input
            id="settings-birth-year"
            type="number"
            inputMode="numeric"
            placeholder={String(currentYear - 16)}
            value={birthYear}
            min={currentYear - 100}
            max={currentYear - 10}
            onChange={(e) => {
              setBirthYear(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <Button
          variant="outline"
          disabled={isPending || unchanged || !valid}
          onClick={() =>
            startTransition(async () => {
              const result = await updateBirthYear(parsed);
              if (result.error) setError(result.error);
              else {
                setError(null);
                setSaved(true);
              }
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? tBirthYear("saved") : t("save")}
        </Button>
      </div>
      {/* States what changes when it is filled in, and what is not being asked for. Both
          matter for an audience that is mostly under 18. */}
      <p className="text-sm text-muted-foreground">
        {initialBirthYear === null ? tBirthYear("notSet") : tBirthYear("helper")}
      </p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
