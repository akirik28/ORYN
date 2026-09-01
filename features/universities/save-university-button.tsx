"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTargetUniversity, updateTargetUniversityStatus } from "@/app/(app)/universities/actions";
import type { TargetStatus } from "@/types/database";

const STATUS_OPTION_VALUES: TargetStatus[] = ["exploring", "target", "applying", "applied", "accepted", "waitlisted", "rejected", "withdrawn"];

export function SaveUniversityButton({
  universityId,
  targetId,
  status,
}: {
  universityId: string;
  targetId: string | null;
  status: TargetStatus | null;
}) {
  const t = useTranslations("universities.saveButton");
  const tStatus = useTranslations("universities.targetStatus");
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
        <Bookmark className="size-4" /> {t("saveToMyUniversities")}
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
        {STATUS_OPTION_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {tStatus(value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
