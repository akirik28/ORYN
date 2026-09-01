"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { File, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteEvidence } from "@/app/(app)/documents/actions";

export function EvidenceRow({
  id,
  fileName,
  linkedLabel,
  signedUrl,
}: {
  id: string;
  fileName: string;
  linkedLabel: string;
  signedUrl: string | null;
}) {
  const t = useTranslations("documents.row");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEvidence(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    // Figma-source card chrome (ProfileTools.tsx `DocumentsScreen`): translucent white,
    // 14px blur, literal source colors. rounded-lg -> rounded-[14px], px-4 py-3 -> a
    // slightly roomier 16/18 to match the source card's own padding.
    <li
      className="lit-card flex items-start gap-3.5 rounded-[14px] px-[18px] py-4"
      style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.70)" }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "#F0F0F6" }}
      >
        <File className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <Badge variant="outline" className="mt-1.5 text-xs">
          {linkedLabel}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {signedUrl ? (
          <Button variant="ghost" size="icon-sm" render={<a href={signedUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false} aria-label={t("view")}>
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
          aria-label={t("deleteAriaLabel", { fileName })}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle", { fileName })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {tCommon("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
