"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JobTriggerButton({ label, action }: { label: string; action: () => Promise<{ error?: string }> }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.error) {
            toast.error(result.error);
            return;
          }
          router.refresh();
        })
      }
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
      {label}
    </Button>
  );
}
