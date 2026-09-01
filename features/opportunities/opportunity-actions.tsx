"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Bookmark, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import { useNotInterestedReasons } from "./opportunity-card";
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
  const t = useTranslations("opportunities.actions");
  const tCard = useTranslations("opportunities.card");
  const tCommon = useTranslations("common");
  const reasons = useNotInterestedReasons();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function updateStatus(next: SavedOpportunityStatus, notInterestedReason?: string) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await setOpportunityStatus({ opportunityId, status: next, notInterestedReason });
      if (result.error) {
        // Roll back — otherwise a failed write leaves the button showing a status that
        // was never actually saved, with no indication anything went wrong.
        setStatus(previous);
        toast.error(result.error);
      }
    });
  }

  if (status === "not_interested") {
    return (
      <Button variant="outline" size="sm" onClick={() => updateStatus("saved")} disabled={isPending}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : t("markedNotInterestedUndo")}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {officialUrl ? (
        <Button variant="outline" size="sm" render={<a href={officialUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
          {t("officialPage")} <ExternalLink className="size-3.5" />
        </Button>
      ) : null}
      {applicationUrl && applicationUrl !== officialUrl ? (
        <Button size="sm" render={<a href={applicationUrl} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
          {t("apply")} <ExternalLink className="size-3.5" />
        </Button>
      ) : null}
      <Button variant={status === "saved" ? "secondary" : "outline"} size="sm" onClick={() => updateStatus("saved")} disabled={isPending}>
        <Bookmark className="size-3.5" /> {status === "saved" ? tCard("saved") : tCommon("save")}
      </Button>
      <Button variant={status === "applied" ? "secondary" : "outline"} size="sm" onClick={() => updateStatus("applied")} disabled={isPending}>
        {status === "applied" ? tCard("applied") : t("markApplied")}
      </Button>
      {/* render={<Button .../>}: no padding class at all here previously — an ~16px hit
          area, the raw icon's own size, well under the app's ~40px+ touch-target
          convention. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" />}
          nativeButton={true}
          aria-label={tCard("notInterestedAriaLabel")}
        >
          <X className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {reasons.map((reason) => (
            <DropdownMenuItem key={reason.value} onClick={() => updateStatus("not_interested", reason.value)}>
              {reason.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
