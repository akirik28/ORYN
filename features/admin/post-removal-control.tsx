"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { removeReportedPost, restoreReportedPost } from "@/app/(app)/admin/actions";

/**
 * The enforcement control for a reported post, in the admin moderation queue.
 *
 * Admin-only surface. The social layer itself is switched off and unreachable by students
 * (see lib/social/posts-feature-flag.ts); this exists so the report -> queue -> removal
 * loop is a real, exercised path on the day the feature is switched on, rather than the
 * "report lands in a table nobody acts on" state migration 0030's header describes.
 *
 * A removal reason is required rather than optional: the reason is the audit trail, and a
 * removal with no recorded reason cannot be reviewed or appealed later.
 */
export function PostRemovalControl({ postId, isRemoved }: { postId: string; isRemoved: boolean }) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Add a removal reason first.");
      return;
    }
    startTransition(async () => {
      const result = await removeReportedPost(postId, trimmed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setReason("");
      toast.success("Post removed. Its author still sees it, with a notice.");
      router.refresh();
    });
  }

  function restore() {
    startTransition(async () => {
      const result = await restoreReportedPost(postId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Post restored.");
      router.refresh();
    });
  }

  if (isRemoved) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">This post is removed.</span>
        <Button type="button" variant="outline" size="sm" onClick={restore} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Restore post
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Removal reason (recorded)"
        aria-label="Removal reason"
        className="h-8 max-w-xs text-xs"
      />
      <Button type="button" variant="outline" size="sm" onClick={remove} disabled={isPending}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Remove post
      </Button>
    </div>
  );
}
