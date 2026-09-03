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
import { updateProductSettings } from "@/app/(app)/admin/actions";

/**
 * Gates signUp() itself (app/(auth)/actions.ts), not just this button's own label —
 * confirmed by reading that action before building this. Same asymmetric-confirmation
 * shape JobDisableToggle already established: turning signups OFF is the consequential
 * direction (a real visitor loses the ability to create an account) and gets a confirm
 * step; turning them back ON only restores normal behavior and doesn't.
 */
export function SignupsToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("admin.control.settings.signups");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function run(next: boolean) {
    startTransition(async () => {
      const result = await updateProductSettings({ signupsEnabled: next });
      if (result.error) toast.error(result.error);
      else router.refresh();
      setConfirmOpen(false);
    });
  }

  if (!enabled) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => run(true)}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        {t("enable")}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Ban className="size-3.5" />
        {t("disable")}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disableConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("disableConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(false)}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("disableConfirmAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
