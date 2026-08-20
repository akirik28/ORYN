"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTargetUniversity, updateTargetUniversityStatus } from "@/app/(app)/universities/actions";
import type { TargetStatus } from "@/types/database";

const STATUS_OPTIONS: { value: TargetStatus; label: string }[] = [
  { value: "exploring", label: "Exploring" },
  { value: "target", label: "Target" },
  { value: "applying", label: "Applying" },
  { value: "applied", label: "Applied" },
  { value: "accepted", label: "Accepted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function SaveUniversityButton({
  universityId,
  targetId,
  status,
}: {
  universityId: string;
  targetId: string | null;
  status: TargetStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
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
        <Bookmark className="size-4" /> Save to my universities
      </Button>
    );
  }

  return (
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
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
