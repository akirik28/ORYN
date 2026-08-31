"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const TYPE_OPTIONS: { value: ApplicationType; label: string }[] = [
  { value: "regular_decision", label: "Regular Decision" },
  { value: "early_decision", label: "Early Decision" },
  { value: "early_action", label: "Early Action" },
  { value: "rolling", label: "Rolling" },
  { value: "other", label: "Other" },
];

export function NewApplicationDialog({ availableTargets }: { availableTargets: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState(availableTargets[0]?.id ?? "");
  const [type, setType] = useState<ApplicationType>("regular_decision");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (availableTargets.length === 0) {
    return (
      <Button variant="outline" disabled title="Save a target university first — applications start from a target.">
        <Plus className="size-4" /> Start an application
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> Start an application
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start an application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>University</Label>
            <Select value={targetId} onValueChange={(value) => value && setTargetId(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Application type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as ApplicationType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
