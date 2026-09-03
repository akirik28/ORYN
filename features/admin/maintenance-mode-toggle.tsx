"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
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
 * Gates app/(app)/layout.tsx, the authenticated student shell — deliberately not
 * app/(admin)/layout.tsx, its own separate route group with its own layout, never touched
 * by this flag by construction. No admin-exemption inside the gate itself, confirmed with
 * oryn-a7 before building: "a check that treats the checker specially stops being a
 * check" — the panel (and this exact off-switch) is already reachable regardless, which is
 * what makes an exemption unnecessary rather than merely omitted.
 *
 * Confirmation is on the ACTIVATE direction — every real visitor loses access the moment
 * this is on, the inverse of SignupsToggle's own asymmetry but the same underlying rule:
 * the consequential direction gets a confirm step, restoring normal behavior doesn't.
 */
export function MaintenanceModeToggle({ active, live = true }: { active: boolean; live?: boolean }) {
  const t = useTranslations("admin.control.settings.maintenance");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function run(next: boolean) {
    startTransition(async () => {
      const result = await updateProductSettings({ maintenanceMode: next });
      if (result.error) toast.error(result.error);
      else router.refresh();
      setConfirmOpen(false);
    });
  }

  if (active) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={isPending || !live} onClick={() => run(false)}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
        {t("turnOff")}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending || !live}
        onClick={() => setConfirmOpen(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <ShieldAlert className="size-3.5" />
        {t("turnOn")}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("turnOnConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("turnOnConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => run(true)}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("turnOnConfirmAction")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
