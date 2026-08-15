"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { File, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteEvidence } from "@/app/(app)/documents/actions";

export function EvidenceRow({
  id,
  fileName,
  linkedLabel,
  signedUrl,
}: {
  id: string;
  fileName: string;
  linkedLabel: string;
  signedUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <File className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <Badge variant="outline" className="mt-0.5 text-xs">
            {linkedLabel}
          </Badge>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {signedUrl ? (
          <Button variant="ghost" size="icon-sm" render={<a href={signedUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false} aria-label="View">
            <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteEvidence(id);
              router.refresh();
            })
          }
          aria-label="Delete"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />}
        </Button>
      </div>
    </li>
  );
}
