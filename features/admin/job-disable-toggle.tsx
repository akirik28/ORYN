"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Ban, Play } from "lucide-react";
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
import { toggleJobDisabled } from "@/app/(app)/admin/actions";

/**
 * Same reversible/consequential split `GeneratePlanButton` already established for
 * "Regenerate": disabling needs a confirm step (a real operational change — future runs,
 * cron and manual alike, stop until someone reverses it), re-enabling doesn't (it only ever
 * restores the job to its normal, already-expected behavior, the same direction as
 * `AlertDialogCancel` on any other confirm dialog in this app).
 *
 * `live` (job_controls, migration 0095): defaults to `true` rather than a required prop —
 * every existing caller/test predates the table-liveness check, and this control has no
 * reason to know or care whether the table exists when a caller already has (or is a test
 * exercising confirm/cancel behavior directly). ScheduledJobsSection is the one real caller
 * that actually threads the checked value through.
 */
export function JobDisableToggle({ jobName, disabled, live = true }: { jobName: string; disabled: boolean; live?: boolean }) {
  const t = useTranslations("admin.jobs");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function run(next: boolean) {
    startTransition(async () => {
      const result = await toggleJobDisabled(jobName, next);
      if (result.error) toast.error(result.error);
      else router.refresh();
      setConfirmOpen(false);
    });
  }

  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled={isPending || !live} onClick={() => run(false)}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        {t("enableToggle")}
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" disabled={isPending || !live} onClick={() => setConfirmOpen(true)} className="text-muted-foreground hover:text-destructive">
        <Ban className="size-3.5" />
        {t("disableToggle")}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disableConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("disableConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={() => run(true)}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("disableConfirmAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
