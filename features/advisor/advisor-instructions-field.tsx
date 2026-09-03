"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateAdvisorInstructions } from "@/app/(app)/settings/actions";
import { advisorInstructionsMaxLength } from "@/lib/tier/advisor-instructions";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/types/database";

/**
 * Özelleşme piece 1 (docs/ozellesme-spec-2026-09-03.md §1) — the student's own standing
 * instruction to the advisor: "kısa yaz" (write short), "tıp önerme" (don't suggest
 * medicine), "sadece Avrupa" (Europe only). Deliberately plain — a labeled textarea, a
 * counter, a Save button — same shape as every other plain-text settings field
 * (features/settings/display-name-form.tsx), not ResponseModeSlider's bespoke animated
 * track: that control needed its own design because the founder had already approved a
 * specific prototype for it (see that file's own header); this one hasn't, and a free-text
 * field has no third visual state to animate between the way a three-position mode picker
 * does. AGENTS.md's own design philosophy is explicit about this — "avoid unnecessary
 * animations" — the calm form is the correct choice here, not a fallback for one not built.
 *
 * The limit shown is the whole point of showing it at all (spec: "öğrenci sınıra
 * dayandığında Ultra'nın dört katı verdiğini orada görsün" — when a Standard student hits
 * the limit, they should see right there that Ultra gives four times as much). Both the
 * counter and the textarea's own `maxLength` read `advisorInstructionsMaxLength(planTier)` —
 * the identical function the server action re-checks with, so the client can never claim a
 * ceiling the server would reject.
 *
 * The client-side `maxLength` is a UX convenience (stops a paste mid-type), never the real
 * enforcement — updateAdvisorInstructions re-validates the trimmed length itself, the same
 * "a Server Action is directly callable with any argument" backstop every other tier-gated
 * write in this codebase already applies.
 */
export function AdvisorInstructionsField({ initialInstructions, planTier }: { initialInstructions: string | null; planTier: PlanTier }) {
  const t = useTranslations("advisor.instructions");
  const tCommon = useTranslations("common");
  const maxLength = advisorInstructionsMaxLength(planTier);
  const [text, setText] = useState(initialInstructions ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = text.trim();
  const overLimit = trimmed.length > maxLength;
  const unchanged = trimmed === (initialInstructions ?? "").trim();

  return (
    <div className="space-y-1.5 rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.04]">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor="advisor-instructions">{t("label")}</Label>
        <span className={cn("font-mono text-xs tabular-nums text-muted-foreground", overLimit && "text-destructive")}>
          {trimmed.length} / {maxLength}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t("description")}</p>
      <Textarea
        id="advisor-instructions"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        // +1 over the real limit, deliberately: a hard maxLength at exactly the cap would
        // stop a paste right at the boundary with no feedback that anything was refused —
        // this lets the student briefly see the over-limit count and the Save button
        // disable, the same "say why" posture ResponseModeSlider's own header describes,
        // rather than a silent, unexplained truncation at the input event itself.
        maxLength={maxLength + 1}
        placeholder={t("placeholder")}
        rows={3}
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {planTier !== "ultra" ? <p className="text-xs text-muted-foreground">{t("ultraUpsell", { limit: advisorInstructionsMaxLength("ultra") })}</p> : <span />}
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || unchanged || overLimit}
          onClick={() =>
            startTransition(async () => {
              const result = await updateAdvisorInstructions(trimmed);
              if (result.error) setError(result.error);
              else {
                setError(null);
                setSaved(true);
              }
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? t("saved") : tCommon("save")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
