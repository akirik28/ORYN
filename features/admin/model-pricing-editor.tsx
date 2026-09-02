"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The live-adjust lever behind the unpriced-calls alert (AiFeatureShapeSection) —
 * setModelPricing (app/(app)/admin/actions.ts). `model` comes pre-known from the row this
 * renders inside (an unpriced model already seen in real ai_usage rows), so the form only
 * ever asks for the two rates, never the model name itself — no room to fat-finger a typo
 * into a model string that then silently prices nothing, ever.
 */
export function ModelPricingEditor({
  model,
  saveAction,
  saveLabel,
  inputPlaceholder,
  outputPlaceholder,
}: {
  model: string;
  saveAction: (model: string, inputRatePerMillion: number, outputRatePerMillion: number) => Promise<{ error?: string }>;
  saveLabel: string;
  inputPlaceholder: string;
  outputPlaceholder: string;
}) {
  const [inputRate, setInputRate] = useState("");
  const [outputRate, setOutputRate] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      const result = await saveAction(model, Number(inputRate), Number(outputRate));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input
        type="number"
        min={0}
        step={0.01}
        value={inputRate}
        onChange={(e) => setInputRate(e.target.value)}
        disabled={isPending}
        placeholder={inputPlaceholder}
        className="h-7 w-24 text-xs"
        aria-label={inputPlaceholder}
      />
      <Input
        type="number"
        min={0}
        step={0.01}
        value={outputRate}
        onChange={(e) => setOutputRate(e.target.value)}
        disabled={isPending}
        placeholder={outputPlaceholder}
        className="h-7 w-24 text-xs"
        aria-label={outputPlaceholder}
      />
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={isPending || !inputRate || !outputRate} onClick={save}>
        {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
        {saveLabel}
      </Button>
    </div>
  );
}
