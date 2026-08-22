"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateWeeklyPlan } from "@/app/(app)/plan/actions";

export function GeneratePlanButton({ label = "Generate my plan" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          const result = await regenerateWeeklyPlan();
          if (result.error) toast.error(result.error);
          else router.refresh();
        })
      }
      disabled={isPending}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {isPending ? "Thinking…" : label}
    </Button>
  );
}
