"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Bookmark, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import { NOT_INTERESTED_REASONS } from "./opportunity-card";
import type { SavedOpportunityStatus } from "@/types/database";

/** The detail page's action row — same underlying setOpportunityStatus mutation
 * OpportunityCard uses, just laid out for a page header rather than a card footer
 * (adds a distinct Apply link when application_url differs from official_url, which the
 * card's compact layout has no room for). */
export function OpportunityActions({
  opportunityId,
  officialUrl,
  applicationUrl,
  initialStatus,
}: {
  opportunityId: string;
  officialUrl: string | null;
  applicationUrl: string | null;
  initialStatus: SavedOpportunityStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function updateStatus(next: SavedOpportunityStatus, notInterestedReason?: string) {
    setStatus(next);
    startTransition(async () => {
      await setOpportunityStatus({ opportunityId, status: next, notInterestedReason });
    });
  }

  if (status === "not_interested") {
    return (
      <Button variant="outline" size="sm" onClick={() => updateStatus("saved")} disabled={isPending}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Marked not interested — undo"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {officialUrl ? (
        <Button variant="outline" size="sm" render={<a href={officialUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
          Official page <ExternalLink className="size-3.5" />
        </Button>
      ) : null}
      {applicationUrl && applicationUrl !== officialUrl ? (
        <Button size="sm" render={<a href={applicationUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
          Apply <ExternalLink className="size-3.5" />
        </Button>
      ) : null}
      <Button variant={status === "saved" ? "secondary" : "outline"} size="sm" onClick={() => updateStatus("saved")} disabled={isPending}>
        <Bookmark className="size-3.5" /> {status === "saved" ? "Saved" : "Save"}
      </Button>
      <Button variant={status === "applied" ? "secondary" : "outline"} size="sm" onClick={() => updateStatus("applied")} disabled={isPending}>
        {status === "applied" ? "Applied" : "Mark applied"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground" aria-label="Not interested">
          <X className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {NOT_INTERESTED_REASONS.map((reason) => (
            <DropdownMenuItem key={reason.value} onClick={() => updateStatus("not_interested", reason.value)}>
              {reason.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
