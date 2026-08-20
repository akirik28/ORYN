"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { ExternalLink, Bookmark, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import type { Opportunity, SavedOpportunityStatus } from "@/types/database";

export const NOT_INTERESTED_REASONS = [
  { value: "not_interested_topic", label: "Not interested in this topic" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "no_time", label: "No time" },
  { value: "location", label: "Location doesn't work" },
  { value: "too_competitive", label: "Too competitive" },
  { value: "already_applied", label: "Already applied" },
  { value: "other", label: "Other" },
];

function tierFor(score: number): { label: string; tone: StatusTone; cardClassName: string } {
  if (score >= 80) return { label: "Exceptional match", tone: "brand", cardClassName: "border-brand-primary bg-brand-primary-subtle" };
  if (score >= 60) return { label: "Strong match", tone: "brand", cardClassName: "border-brand-primary-border" };
  if (score >= 40) return { label: "Worth a look", tone: "neutral", cardClassName: "border-border" };
  return { label: "Low priority", tone: "neutral", cardClassName: "border-border opacity-70" };
}

// Factual selectivity is a separate signal from ORYN's match score above — RSI and an
// open-enrollment summer course should never read the same just because both matched a
// student's interests. Only render a badge for tiers that are actually informative;
// "unknown" stays silent rather than implying "not selective".
const SELECTIVITY_LABEL: Partial<Record<Opportunity["selectivity_tier"], string>> = {
  extremely_selective: "Extremely selective",
  highly_selective: "Highly selective",
  selective: "Selective",
  competitive_award: "Competitive award",
  open_enrollment: "Open enrollment",
};

// cycle_status is about whether *this* cycle is taking applications right now — distinct
// from whether the opportunity is worth knowing about at all. Only the states a student
// needs a heads-up about get a badge; "open" is the unremarkable default and stays quiet.
const CYCLE_STATUS_BADGE: Partial<Record<Opportunity["cycle_status"], { label: string; tone: StatusTone }>> = {
  upcoming: { label: "Opens soon", tone: "info" },
  closed: { label: "Closed for this cycle", tone: "neutral" },
  date_not_announced: { label: "Next dates not announced", tone: "neutral" },
  historical: { label: "Historical — not currently running", tone: "warning" },
  discontinued: { label: "Discontinued", tone: "error" },
  unverified: { label: "Verification pending", tone: "warning" },
};

export function OpportunityCard({
  opportunity,
  matchScore,
  reasonCodes,
  initialStatus,
  eligible = true,
  eligibilityNotes = null,
}: {
  opportunity: Opportunity;
  matchScore: number;
  reasonCodes: string[];
  initialStatus: SavedOpportunityStatus | null;
  /** Browse mode (unlike "For you", which pre-filters to eligible-only) can surface an
   * opportunity this student doesn't qualify for — a Discover surface shouldn't silently
   * narrow what's visible. Shown as a plain factual note, not a warning: not qualifying
   * today isn't a defect in the opportunity. */
  eligible?: boolean;
  eligibilityNotes?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const tier = tierFor(matchScore);

  const daysUntilDeadline = opportunity.deadline
    ? differenceInCalendarDays(new Date(opportunity.deadline), new Date())
    : null;

  function updateStatus(next: SavedOpportunityStatus, notInterestedReason?: string) {
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await setOpportunityStatus({ opportunityId: opportunity.id, status: next, notInterestedReason });
      if (result.error) {
        // Roll back — a failed write shouldn't leave the card showing (or hiding, for
        // "not interested") a status that was never actually saved.
        setStatus(previous);
        toast.error(result.error);
      }
    });
  }

  if (status === "not_interested") return null;

  return (
    <div className={cn("space-y-3 rounded-xl border p-5 transition-colors duration-(--duration-fast)", tier.cardClassName)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {eligible ? (
              <StatusBadge label={tier.label} tone={tier.tone} icon={Sparkles} />
            ) : (
              <StatusBadge label="Not eligible" tone="neutral" />
            )}
            {/* Eligible-but-unverified is not the same claim as eligible-and-confirmed — a
                restriction exists but Oryn is missing the fact needed to check it (see
                computeEligibility's unknownNotes). Never silently badge that as a plain
                match. */}
            {eligible && eligibilityNotes ? <StatusBadge label="Eligibility unknown" tone="warning" /> : null}
            {SELECTIVITY_LABEL[opportunity.selectivity_tier] ? (
              <StatusBadge label={SELECTIVITY_LABEL[opportunity.selectivity_tier]!} tone="neutral" />
            ) : null}
            {CYCLE_STATUS_BADGE[opportunity.cycle_status] ? (
              <StatusBadge label={CYCLE_STATUS_BADGE[opportunity.cycle_status]!.label} tone={CYCLE_STATUS_BADGE[opportunity.cycle_status]!.tone} />
            ) : null}
            {opportunity.deadline && daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14 ? (
              <DeadlineBadge date={opportunity.deadline} />
            ) : null}
          </div>
          <h3 className="font-semibold leading-snug">
            <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
              {opportunity.title}
            </Link>
          </h3>
          {opportunity.organization ? <p className="text-sm text-muted-foreground">{opportunity.organization}</p> : null}
        </div>
      </div>

      {opportunity.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{opportunity.description}</p> : null}

      {eligibilityNotes ? <p className="text-xs text-muted-foreground">{eligibilityNotes}</p> : null}

      {reasonCodes.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {reasonCodes.includes("matches_your_interests") ? "Matches your interests. " : ""}
          {reasonCodes.includes("addresses_a_current_gap") ? "Addresses a current gap in your profile. " : ""}
          {reasonCodes.includes("near_you") ? "Based in your country." : ""}
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
