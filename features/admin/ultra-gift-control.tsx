"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
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
import { grantUltraGift } from "@/app/(app)/admin/actions";

/**
 * The founder's own named prototype item. Once `expiresAt` is non-null this renders a
 * label, never a clickable button again — the founder's explicit second constraint was
 * that a second press must show the gift was already used, not silently do nothing, so
 * there is no state here where clicking is possible but does nothing.
 *
 * Two label states, not one, now that the stored value is the expiry moment rather than
 * the grant moment (migration 0106): "used" alone would be misleading for a student still
 * inside their active window — an admin checking this row could reasonably want to know
 * that, distinct from a fully spent gift.
 *
 * Confirmation dialog, same as PlanTierControl right next to this in the row — that
 * control's own reasoning was "immediate and reversible is not the same claim as
 * inconsequential enough to skip asking." This one is less reversible than that one (a
 * tier toggle can be flipped back; this can't be re-granted once used), so it gets at
 * least the same friction, not less.
 */
export function UltraGiftControl({
  userId,
  displayName,
  expiresAt,
  active,
  live = true,
}: {
  userId: string;
  displayName: string;
  expiresAt: string | null;
  /** Computed server-side (getAdminUserList) rather than from `expiresAt` here — calling
   *  Date.now() during this component's own render trips react-hooks/purity regardless of
   *  client vs. server component. */
  active: boolean;
  /** profiles.ultra_gift_expires_at, migration 0106 — whether the column itself exists yet. */
  live?: boolean;
}) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (expiresAt) {
    const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;
    return (
      <span className="text-xs text-muted-foreground">
        {active
          ? t("giftActive", { time: formatDistanceToNow(new Date(expiresAt), { addSuffix: true, ...dateFnsLocale }) })
          : t("giftUsed", { time: formatDistanceToNow(new Date(expiresAt), { addSuffix: true, ...dateFnsLocale }) })}
      </span>
    );
  }

  function confirm() {
    startTransition(async () => {
      const result = await grantUltraGift(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      if (result.granted === false) {
        toast.error(t("giftAlreadyUsedToast", { name: displayName }));
      } else {
        toast.success(t("giftGrantedToast", { name: displayName }));
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={isPending || !live} onClick={() => setConfirmOpen(true)}>
        {t("grantGift")}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("giftConfirmTitle", { name: displayName })}</AlertDialogTitle>
            <AlertDialogDescription>{t("giftConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button type="button" disabled={isPending} onClick={confirm}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("giftConfirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
