"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
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
import { regenerateWeeklyPlan } from "@/app/(app)/plan/actions";

export function GeneratePlanButton({
  label,
  pendingLabel,
  hasExistingPlan = true,
}: {
  label: string;
  pendingLabel: string;
  /** Whether this click would replace an existing plan rather than create a first one.
   * regenerateWeeklyPlan() hard-deletes every action on the current plan, completed or
   * not, along with any reflection notes on them — there is no soft-delete or undo.
   * Defaults to true (confirm first) so a caller that forgets to pass this gets an
   * unnecessary-but-harmless confirmation rather than a silent real data loss; only the
   * dashboard's "no plan yet" mount, where nothing exists to lose, passes false. */
  hasExistingPlan?: boolean;
}) {
  const t = useTranslations("plan");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function run() {
    startTransition(async () => {
      const result = await regenerateWeeklyPlan();
      if (result.error) toast.error(result.error);
      else router.refresh();
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <Button onClick={() => (hasExistingPlan ? setConfirmOpen(true) : run())} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {isPending ? pendingLabel : label}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("regenerateConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("regenerateConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={run}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("regenerate")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
