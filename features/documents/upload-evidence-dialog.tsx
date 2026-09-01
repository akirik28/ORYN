"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadEvidence } from "@/app/(app)/documents/actions";
import type { LinkableItem } from "@/lib/profile/list-linkable-items";

export function UploadEvidenceDialog({ items }: { items: LinkableItem[] }) {
  const t = useTranslations("documents.uploadDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(items[0] ? `${items[0].table}:${items[0].id}` : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noItemsHint")}</p>;
  }

  function submit() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t("chooseFileError"));
      return;
    }
    const [table, id] = selectedKey.split(":");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("linkedTable", table);
    formData.append("linkedId", id);

    startTransition(async () => {
      const result = await uploadEvidence(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Upload className="size-4" /> {t("addEvidence")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addEvidence")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("thisSupports")}</Label>
            <Select value={selectedKey} onValueChange={(v) => v && setSelectedKey(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={`${item.table}:${item.id}`} value={`${item.table}:${item.id}`}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evidence-file">{t("file")}</Label>
            <input
              ref={fileInputRef}
              id="evidence-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("statusNotice")}</p>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
