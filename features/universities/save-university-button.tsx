"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bookmark, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { addTargetUniversity, removeTargetUniversity, updateTargetUniversityStatus } from "@/app/(app)/universities/actions";
import type { TargetStatus } from "@/types/database";

const STATUS_OPTION_VALUES: TargetStatus[] = ["exploring", "target", "applying", "applied", "accepted", "waitlisted", "rejected", "withdrawn"];

/**
 * Saving is one unconfirmed click, so there has to be a way back. Before this there wasn't:
 * `removeTargetUniversity` existed, correct and scoped to the caller's own row, and nothing
 * called it (docs/known-issues.md). The nearest escape was setting the status to
 * "Withdrawn", which changes a badge — nothing filters withdrawn targets out of any list,
 * including the dashboard's University Outlook, so a mis-click followed the student around.
 *
 * Confirmed rather than immediate, following features/connections/connection-row.tsx: the
 * row carries the student's own status history and any linked application, and none of that
 * is recoverable by re-saving.
 */
export function SaveUniversityButton({
  universityId,
  universityName,
  targetId,
  status,
}: {
  universityId: string;
  /** Named in the confirmation, so the student sees which one they are about to drop. */
  universityName: string;
  targetId: string | null;
  status: TargetStatus | null;
}) {
  const t = useTranslations("universities.saveButton");
  const tStatus = useTranslations("universities.targetStatus");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  if (!targetId) {
    return (
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await addTargetUniversity(universityId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        <Bookmark className="size-4" /> {t("saveToMyUniversities")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
      value={status ?? "exploring"}
      onValueChange={(value) =>
        value &&
        startTransition(async () => {
          const result = await updateTargetUniversityStatus(targetId, value as TargetStatus);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          router.refresh();
        })
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTION_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {tStatus(value)}
          </SelectItem>
        ))}
      </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("removeLabel", { name: universityName })}
        title={t("remove")}
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("remove")}?</AlertDialogTitle>
            <AlertDialogDescription>{t("removeConfirm", { name: universityName })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{t("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeTargetUniversity(targetId);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  setConfirmOpen(false);
                  router.refresh();
                })
              }
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
