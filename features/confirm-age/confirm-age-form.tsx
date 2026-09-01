"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitBirthYear } from "@/app/(confirm-age)/confirm-age/actions";

const currentYear = new Date().getFullYear();

/**
 * One field, one action. No default value — a pre-filled year would be silently wrong
 * for almost everyone (same reasoning as the onboarding wizard's birth-year field),
 * and no upper-bound-biased placeholder either, per the neutral-presentation standard
 * docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md's UK section documents (ICO
 * Children's Code, Standard 13): don't design a question so it nudges someone toward
 * answering older than they are.
 */
export function ConfirmAgeForm() {
  const t = useTranslations("confirmAge");
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitBirthYear(birthYear);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmBirthYear">{t("fieldLabel")}</Label>
        <Input
          id="confirmBirthYear"
          type="number"
          inputMode="numeric"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          min={currentYear - 100}
          max={currentYear - 10}
          aria-describedby="confirmBirthYear-why"
          autoFocus
        />
        <p id="confirmBirthYear-why" className="text-xs text-muted-foreground">
          {t("fieldWhy")}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
      </Button>
    </form>
  );
}
