"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { setUserPlanTier } from "@/app/(app)/admin/actions";
import type { PlanTier } from "@/types/database";

/**
 * The founder's own named example (2026-09-02): they had to ask oryn-a7 to run raw SQL
 * twice to set their own plan_tier, and once it silently affected zero rows. This is that
 * button — but the point isn't the button, it's that every outcome is visible. A no-op
 * ("already Ultra") and a real change get different, honest toasts rather than one
 * generic "done"; an error surfaces the server action's own message, including the
 * zero-rows case app/(app)/admin/actions.ts's setUserPlanTier now catches explicitly.
 *
 * Deliberately NOT styled as a destructive action (no red button, no `variant="destructive"`
 * the way features/documents/evidence-row.tsx's delete confirmation is) — flipping a tier is
 * cheap and fully reversible by flipping it back, and per oryn-a7's own instruction a
 * confirmable-but-reversible action and a student-visible destructive one should not read
 * the same. Still gated behind a real confirmation dialog, not a bare click, because
 * "immediate and reversible" is not the same claim as "inconsequential enough to skip
 * asking" — the founder still typed the target tier in a prompt tonight, not just clicked
 * through one, and this control should feel at least that deliberate.
 */
export function PlanTierControl({ userId, displayName, tier }: { userId: string; displayName: string; tier: PlanTier }) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const [confirmTarget, setConfirmTarget] = useState<PlanTier | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const other: PlanTier = tier === "ultra" ? "standard" : "ultra";
  const tierLabel = (value: PlanTier) => t(value === "ultra" ? "tierUltra" : "tierStandard");

  function confirm() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    startTransition(async () => {
      const result = await setUserPlanTier(userId, target);
      if (result.error) {
        toast.error(result.error);
        return; // dialog stays open — the admin should see the error next to the action, not lose it to a closed dialog
      }
      setConfirmTarget(null);
      if (result.changed === false) {
        toast.success(t("changeNoop", { name: displayName, tier: tierLabel(target) }));
      } else {
        toast.success(t("changeSuccess", { name: displayName, tier: tierLabel(target) }));
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmTarget(other)}>
        {t("setTier", { tier: tierLabel(other) })}
      </Button>

      <AlertDialog open={confirmTarget !== null} onOpenChange={(open) => !open && !isPending && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { name: displayName, tier: confirmTarget ? tierLabel(confirmTarget) : "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button type="button" disabled={isPending} onClick={confirm}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("confirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
