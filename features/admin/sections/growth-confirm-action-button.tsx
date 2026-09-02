"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

/**
 * Generic confirm-then-call-a-server-action button for the growth panel's per-student
 * actions — same AlertDialog pattern as features/dashboard/generate-plan-button.tsx (the
 * student's own regenerate button), generalized so both admin actions here (destructive
 * plan regeneration, non-destructive onboarding reset) share one component instead of two
 * near-duplicates.
 */
export function GrowthConfirmActionButton({
  label,
  confirmTitle,
  confirmDescription,
  action,
  variant = "outline",
  errorMessage,
}: {
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  action: () => Promise<{ error?: string }>;
  variant?: "outline" | "destructive";
  /** Shown on failure via toast — the action's own returned `error` wins when present;
   *  this is only the fallback for a network-level failure with no structured message. */
  errorMessage: string;
}) {
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function run() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) toast.error(result.error);
        else router.refresh();
      } catch {
        toast.error(errorMessage);
      }
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" disabled={isPending} onClick={() => setConfirmOpen(true)}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {label}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button variant={variant === "destructive" ? "destructive" : "default"} disabled={isPending} onClick={run}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
