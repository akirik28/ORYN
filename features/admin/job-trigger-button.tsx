"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber, formatDuration } from "@/lib/i18n/format";
import type { JobRunResult } from "@/app/(app)/admin/actions";

/** Shows the real outcome of the run in the success toast (items processed, errors,
 *  duration, spend) rather than silently refreshing and leaving the admin to go re-read
 *  the row below — a click that only ever said "triggered" would recreate exactly the
 *  "billed forever, no visible artifact" blindness this whole section exists to catch. */
export function JobTriggerButton({ label, action }: { label: string; action: () => Promise<JobRunResult> }) {
  const t = useTranslations("admin.jobs");
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
          const items = formatNumber(result.itemsProcessed ?? 0);
          const errors = formatNumber(result.errorsEncountered ?? 0);
          if (result.durationMs !== undefined) {
            toast.success(t("runResult", { items, errors, duration: formatDuration(result.durationMs) }));
          } else {
            toast.success(t("runResultNoDuration", { items, errors }));
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
