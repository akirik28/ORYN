"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createApplication } from "@/app/(app)/applications/actions";
import type { ApplicationType } from "@/types/database";

const APPLICATION_TYPES: ApplicationType[] = ["regular_decision", "early_decision", "early_action", "rolling", "other"];

export function NewApplicationDialog({ availableTargets }: { availableTargets: { id: string; name: string }[] }) {
  const t = useTranslations("applications.newDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState(availableTargets[0]?.id ?? "");
  const [type, setType] = useState<ApplicationType>("regular_decision");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (availableTargets.length === 0) {
    return (
      <Button variant="outline" disabled title={t("saveTargetFirst")}>
        <Plus className="size-4" /> {t("startApplication")}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> {t("startApplication")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("startApplication")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("university")}</Label>
            <Select value={targetId} onValueChange={(value) => value && setTargetId(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("applicationType")}</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as ApplicationType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`typeOptions.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deadline")}</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={isPending || !targetId}
            onClick={() =>
              startTransition(async () => {
                const result = await createApplication({ targetUniversityId: targetId, applicationType: type, deadline: deadline || null });
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              })
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
