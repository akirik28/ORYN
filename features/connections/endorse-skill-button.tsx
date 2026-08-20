"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endorseSkill, withdrawEndorsement } from "@/app/(app)/u/[id]/endorsement-actions";

/** Only rendered for an accepted connection viewing someone else's skill (the page
 * decides that, not this component) — the Server Actions re-verify the same eligibility
 * server-side regardless (lib/social/skill-endorsements.ts), so a denied attempt here
 * would just surface a friendly error, never a silent bypass. */
export function EndorseSkillButton({
  skillId,
  skillOwnerId,
  initialCount,
  initialEndorsedByMe,
}: {
  skillId: string;
  skillOwnerId: string;
  initialCount: number;
  initialEndorsedByMe: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [endorsed, setEndorsed] = useState(initialEndorsedByMe);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (endorsed) {
        const result = await withdrawEndorsement(skillId, skillOwnerId);
        if (result.error) {
          toast.error(result.error);
        } else {
          setEndorsed(false);
          setCount((c) => Math.max(0, c - 1));
        }
      } else {
        const result = await endorseSkill(skillId, skillOwnerId);
        if (result.error) {
          toast.error(result.error);
        } else {
          setEndorsed(true);
          setCount((c) => c + 1);
        }
      }
    });
  }

  return (
    <Button variant={endorsed ? "secondary" : "ghost"} size="xs" disabled={isPending} onClick={toggle}>
      <ThumbsUp className="size-3" /> {count > 0 ? count : ""}
    </Button>
  );
}
