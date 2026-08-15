"use client";

import { useState, useTransition } from "react";
import { differenceInCalendarDays } from "date-fns";
import { ExternalLink, Bookmark, X, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import type { Opportunity, SavedOpportunityStatus } from "@/types/database";

const NOT_INTERESTED_REASONS = [
  { value: "not_interested_topic", label: "Not interested in this topic" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "no_time", label: "No time" },
  { value: "location", label: "Location doesn't work" },
  { value: "too_competitive", label: "Too competitive" },
  { value: "already_applied", label: "Already applied" },
  { value: "other", label: "Other" },
];

function tierFor(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "Exceptional match", className: "border-primary bg-primary/10" };
  if (score >= 60) return { label: "Strong match", className: "border-primary/40 bg-primary/5" };
  if (score >= 40) return { label: "Worth a look", className: "border-border" };
  return { label: "Low priority", className: "border-border opacity-70" };
}

export function OpportunityCard({
  opportunity,
  matchScore,
  reasonCodes,
  initialStatus,
}: {
  opportunity: Opportunity;
  matchScore: number;
  reasonCodes: string[];
  initialStatus: SavedOpportunityStatus | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const tier = tierFor(matchScore);

  const daysUntilDeadline = opportunity.deadline
    ? differenceInCalendarDays(new Date(opportunity.deadline), new Date())
    : null;

  function updateStatus(next: SavedOpportunityStatus, notInterestedReason?: string) {
    setStatus(next);
    startTransition(async () => {
      await setOpportunityStatus({ opportunityId: opportunity.id, status: next, notInterestedReason });
    });
  }

  if (status === "not_interested") return null;

  return (
    <div className={cn("space-y-3 rounded-xl border p-5 transition-colors", tier.className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Sparkles className="size-3" /> {tier.label}
            </Badge>
            {daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14 ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                {daysUntilDeadline === 0 ? "Due today" : `${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"} left`}
              </Badge>
            ) : null}
          </div>
          <h3 className="font-semibold leading-snug">{opportunity.title}</h3>
          {opportunity.organization ? <p className="text-sm text-muted-foreground">{opportunity.organization}</p> : null}
        </div>
      </div>

      {opportunity.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{opportunity.description}</p> : null}

      {reasonCodes.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {reasonCodes.includes("matches_your_interests") ? "Matches your interests. " : ""}
          {reasonCodes.includes("addresses_a_current_gap") ? "Addresses a current gap in your profile." : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {opportunity.official_url ? (
          <Button variant="outline" size="sm" render={<a href={opportunity.official_url} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
            View <ExternalLink className="size-3.5" />
          </Button>
        ) : null}
        <Button
          variant={status === "saved" ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateStatus(status === "saved" ? "saved" : "saved")}
          disabled={isPending}
        >
          <Bookmark className="size-3.5" /> {status === "saved" ? "Saved" : "Save"}
        </Button>
        <Button
          variant={status === "applied" ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateStatus("applied")}
          disabled={isPending}
        >
          Applied
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto text-muted-foreground hover:text-foreground">
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
    </div>
  );
}
