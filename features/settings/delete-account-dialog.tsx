"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "@/app/(app)/settings/actions";

export function DeleteAccountDialog() {
  const t = useTranslations("common");
  const tDelete = useTranslations("settings.deleteAccount");
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>{tDelete("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-destructive" /> {tDelete("title")}
          </DialogTitle>
          <DialogDescription>{tDelete("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {/* The literal word "DELETE" stays untranslated on purpose — it's compared
              verbatim below (confirmText !== "DELETE"), and changing what a student must
              type is a change to destructive-action validation, not a translation. */}
          <Label htmlFor="confirm-delete">{tDelete("confirmLabel")}</Label>
          <Input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={confirmText !== "DELETE" || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMyAccount();
                if (result?.error) setError(result.error);
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {tDelete("permanentlyDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
