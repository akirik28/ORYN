"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markFeatureDead, unmarkFeatureDead } from "@/app/(app)/admin/actions";

/**
 * Per-row control for the feature census — record + display only
 * (docs/admin-panel-architecture-2026-09-02.md D8): marking a feature here is a dated,
 * attributed decision a human reads later, not a flag that changes any runtime behavior.
 */
export function GrowthFeatureDeadControl({ eventName, isDead }: { eventName: string; isDead: boolean }) {
  const t = useTranslations("admin.growth.featureCensus");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  if (isDead) {
    return (
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(() => unmarkFeatureDead(eventName))}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {t("unmark")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} className="h-8 w-40 text-xs" disabled={isPending} />
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(() => markFeatureDead(eventName, note))}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {t("markDead")}
      </Button>
    </div>
  );
}
