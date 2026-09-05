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
 *
 * `isUnderReview` (2026-09-05, the under_review-graveyard fix): a third real status this
 * control must present differently, discovered by measuring what actually blocked a real
 * approval path (docs/under-review-pool-audit-2026-09-03*.md, three independent passes) —
 * setOpportunityDisabled already writes "active" for ANY prior status when called with
 * `disabled: false`, so approving an under_review row is the IDENTICAL call reactivating a
 * disabled one already made. Only the copy differs ("Approve" vs "Reactivate" — "reactivate"
 * would wrongly imply the row was ever visible before), and only non-destructive styling
 * applies to both, since neither direction hides anything from a student who could see it.
 */
export function OpportunityDisableControl({
  opportunityId,
  title,
  isDisabled,
  isUnderReview = false,
  onChanged,
}: {
  opportunityId: string;
  title: string;
  isDisabled: boolean;
  isUnderReview?: boolean;
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

  // The only real write-direction question: disable (true) only applies when the row is
  // currently neither disabled nor under_review. Approving and reactivating are both the
  // `target: false` call -- see this component's own header for why that's correct, not a
  // coincidence.
  const target = !isDisabled && !isUnderReview;

  function submit() {
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
        toast.success(t(target ? "disableSuccess" : isUnderReview ? "approveSuccess" : "reactivateSuccess", { title }));
        onChanged(target);
      }
    });
  }

  const buttonKey = target ? "disableButton" : isUnderReview ? "approveButton" : "reactivateButton";
  const titleKey = target ? "confirmDisableTitle" : isUnderReview ? "confirmApproveTitle" : "confirmReactivateTitle";
  const descriptionKey = target ? "confirmDisableDescription" : isUnderReview ? "confirmApproveDescription" : "confirmReactivateDescription";
  const confirmButtonKey = target ? "confirmDisableButton" : isUnderReview ? "confirmApproveButton" : "confirmReactivateButton";
  // Per-item aria-label so a screen-reader user with several rows on this page knows WHICH
  // opportunity a bare "Disable"/"Reactivate"/"Approve" acts on before ever reaching the
  // confirmation dialog -- same reasoning (and same shape) as achievement-section.tsx's own
  // deleteItemAriaLabel, from the 2026-09-01 a11y sweep. The visible label stays the short
  // verb; only the accessible name gains the title.
  const ariaLabelKey = target ? "disableButtonAriaLabel" : isUnderReview ? "approveButtonAriaLabel" : "reactivateButtonAriaLabel";

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(true)} aria-label={t(ariaLabelKey, { title })}>
        {t(buttonKey)}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(titleKey, { title })}</AlertDialogTitle>
            <AlertDialogDescription>{t(descriptionKey)}</AlertDialogDescription>
          </AlertDialogHeader>
          {target ? (
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
            <Button type="button" variant={target ? "destructive" : "default"} disabled={isPending} onClick={submit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t(confirmButtonKey)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
