"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { setOpportunityDisabled } from "@/app/(app)/admin/actions";

/**
 * oryn-a7's own named example, hit personally tonight: their write to disable a bad
 * opportunity record was blocked by RLS, and the founder had to run raw SQL for them a
 * second time. See app/(app)/admin/actions.ts's setOpportunityDisabled for the schema side
 * (no new migration — `status` already has "disabled").
 *
 * Styled AS destructive (`variant="destructive"` on the confirm button) for the disable
 * direction specifically — unlike PlanTierControl, which is deliberately NOT styled
 * destructive. oryn-a7's own instruction: a fully reversible skin toggle and disabling
 * something student-visible shouldn't feel the same, and this is the other half of that
 * distinction, not an inconsistency with it. Reactivate stays neutral — restoring
 * visibility isn't the dangerous direction.
 *
 * A removal reason is required, mirroring features/admin/post-removal-control.tsx's own
 * rule exactly: the reason is the audit trail (logged to admin_action_log, not a new
 * column — see the action's own comment for why this table doesn't need posts' three-column
 * shape).
 */
export function OpportunityDisableControl({
  opportunityId,
  title,
  isDisabled,
  onChanged,
}: {
  opportunityId: string;
  title: string;
  isDisabled: boolean;
  /** Called after a confirmed, successful change so the parent list can update its own
   * copy of this row without a full re-fetch — the list owns its own state (client-side
   * search), unlike every other admin section, which just calls router.refresh(). */
  onChanged: (nowDisabled: boolean) => void;
}) {
  const t = useTranslations("admin.opportunities");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const target = !isDisabled;
    if (target && !reason.trim()) {
      toast.error(t("disableReasonPlaceholder"));
      return;
    }
    startTransition(async () => {
      const result = await setOpportunityDisabled(opportunityId, target, reason.trim() || undefined);
      if (result.error) {
        toast.error(result.error);
        return; // dialog stays open so the admin sees the error next to the action
      }
      setConfirmOpen(false);
      setReason("");
      if (result.changed === false) {
        toast.success(t("changeNoop", { title }));
      } else {
        toast.success(t(target ? "disableSuccess" : "reactivateSuccess", { title }));
        onChanged(target);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        {t(isDisabled ? "reactivateButton" : "disableButton")}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(isDisabled ? "confirmReactivateTitle" : "confirmDisableTitle", { title })}</AlertDialogTitle>
            <AlertDialogDescription>{t(isDisabled ? "confirmReactivateDescription" : "confirmDisableDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          {!isDisabled ? (
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("disableReasonPlaceholder")}
              aria-label={t("disableReasonPlaceholder")}
              className="text-sm"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button type="button" variant={isDisabled ? "default" : "destructive"} disabled={isPending} onClick={submit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t(isDisabled ? "confirmReactivateButton" : "confirmDisableButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
