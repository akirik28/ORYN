"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateReportReview } from "@/app/(app)/admin/actions";
import { REPORT_STATUS_OPTIONS } from "@/lib/moderation/report-status";
import type { MessageReportStatus } from "@/types/database";

export function ReportReviewControl({
  reportId,
  initialStatus,
  initialNote,
}: {
  reportId: string;
  initialStatus: MessageReportStatus;
  initialNote: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus(next: MessageReportStatus) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateReportReview(reportId, { status: next });
      if (result.error) {
        setStatus(previous); // roll back — don't show a status that never saved
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function saveNote() {
    startTransition(async () => {
      const result = await updateReportReview(reportId, { resolutionNote: note });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Select value={status} onValueChange={(v) => v && changeStatus(v as MessageReportStatus)}>
        <SelectTrigger className="w-32 shrink-0" disabled={isPending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REPORT_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-1 items-start gap-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Resolution note (internal only)…"
          rows={1}
          className="min-h-8 resize-none text-xs"
          maxLength={2000}
        />
        <Button size="sm" variant="outline" disabled={isPending} onClick={saveNote}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
