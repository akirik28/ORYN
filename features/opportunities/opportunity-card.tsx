"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { ExternalLink, Bookmark, X, Compass } from "lucide-react";
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
import { Eyebrow } from "@/components/oryn/eyebrow";
import { MediaImage } from "@/components/oryn/media-image";
import { OpportunityStandingBadge } from "./standing-badge";
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

function tierFor(score: number): { label: string; tone: StatusTone } {
  if (score >= 80) return { label: "Exceptional match", tone: "brand" };
  if (score >= 60) return { label: "Strong match", tone: "brand" };
  if (score >= 40) return { label: "Worth a look", tone: "neutral" };
  return { label: "Low priority", tone: "neutral" };
}

/**
 * The student-facing reason, as a sentence rather than three concatenated fragments.
 * UI-V3 § 19 puts "why Oryn recommends it" above the opportunity's own identity, so this
 * needs to read as counsel, not as a tag list.
 */
function reasonSentence(reasonCodes: string[]): string | null {
  const parts: string[] = [];
  if (reasonCodes.includes("addresses_a_current_gap")) parts.push("it addresses a current gap in your profile");
  if (reasonCodes.includes("matches_your_interests")) parts.push("it matches your interests");
  if (reasonCodes.includes("near_you")) parts.push("it's based in your country");
  if (parts.length === 0) return null;
  const joined =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

// Factual selectivity is a separate signal from ORYN's match score — RSI and an
// open-enrollment summer course should never read the same just because both matched a
// student's interests. Only render for tiers that are actually informative; "unknown"
// stays silent rather than implying "not selective".
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

/**
 * UI-V3 § 19 inverts this card's old hierarchy. It used to open with up to six badges —
 * match tier, standing, eligibility, selectivity, cycle, deadline — so a wall of pills
 * arrived before the student learned what the opportunity even was. Now the reason comes
 * first, then identity, then facts.
 *
 * The badges themselves all survive, because each one encodes something Oryn is or isn't
 * willing to claim. They're split by role rather than thinned out:
 *
 * - **Caveats** (unverified, not eligible, eligibility unknown) stay directly under the
 *   title. They qualify the recommendation, so they have to travel with it.
 * - **Descriptors** (selectivity, cycle status, deadline) drop to a quiet metadata row.
 *   They're facts about the opportunity, not warnings about the match.
 *
 * **On imagery.** `opportunities` has no image column and no acquisition pipeline
 * (universities have both), so there is no honest picture to show. Stock photography is
 * banned by the brief for exactly this reason, and it would also breach Rule 4 —
 * decoration standing in for evidence.
 *
 * A monogram placeholder was tried and removed: with *zero* rows having imagery, every
 * card rendered an identical ~250px empty tinted band, which is worse than no image —
 * dead space on every card, and monograms cut from arbitrary organizer strings were
 * meaningless anyway ("Middle East Technical University" → "MI"). So the media band
 * renders only when a real source exists. It is wired and ready: pass `imageUrl` once the
 * data lands and every card picks it up, with `MediaImage`'s designed fallback covering a
 * broken load. See docs/design-system.md § Known data dependencies.
 */
export function OpportunityCard({
  opportunity,
  matchScore,
  reasonCodes,
  initialStatus,
  eligible = true,
  eligibilityNotes = null,
  notActionable = false,
  needsVerification = false,
  featured = false,
  imageUrl = null,
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
  /** Set when `eligible` is false purely because this cycle is closed or its deadline has
   * passed — true of everyone, not of this student. Keeps the card from telling a 16-year-old
   * they don't qualify for something nobody can currently apply to. Defaults false, so the
   * "For you" call site (which pre-filters to actionable) is unaffected. */
  notActionable?: boolean;
  /** Set when Oryn has no evidence either way — no deadline on file and no record of ever
   * verifying it (lib/opportunities/lifecycle.ts). Suppresses the match tier and shows a
   * "Needs verification" caveat instead. Neither a closure claim nor an eligibility claim. */
  needsVerification?: boolean;
  /** The single lead recommendation on a surface. Wider image, larger title — UI-V3 § 13
   *  asks for one visually dominant personalized opportunity rather than an equal grid. */
  featured?: boolean;
  /** A verified image of this programme. No source populates it yet — see the note above. */
  imageUrl?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const tier = tierFor(matchScore);
  const reason = reasonSentence(reasonCodes);
  // The confidence tier is a claim Oryn can only make about a row it can vouch for.
  const canClaimMatch = eligible && !needsVerification;

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

  const descriptors = [
    SELECTIVITY_LABEL[opportunity.selectivity_tier] ?? null,
    CYCLE_STATUS_BADGE[opportunity.cycle_status]?.label ?? null,
  ].filter((d): d is string => d !== null);

  return (
    <article
      className={cn(
        "group/opp flex flex-col overflow-hidden rounded-2xl bg-surface-panel ring-1 transition-colors duration-(--duration-fast)",
        canClaimMatch && matchScore >= 80 ? "ring-brand-primary-border" : "ring-border/70",
      )}
    >
      {imageUrl ? (
        <MediaImage
          className={cn("w-full", featured ? "aspect-[21/8]" : "aspect-[16/7]")}
          src={imageUrl}
          alt={`${opportunity.title}${opportunity.organization ? ` — ${opportunity.organization}` : ""}`}
          icon={Compass}
          sizes={featured ? "(min-width: 768px) 880px, 100vw" : "(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"}
        />
      ) : null}

      <div className={cn("flex flex-1 flex-col gap-3", featured ? "p-6 md:p-8" : "p-5")}>
        {/* Why first (§ 19): the student's relationship to the opportunity outranks the
            opportunity's own metadata. */}
        {canClaimMatch && reason ? (
          <div>
            <Eyebrow tone="brand">{tier.label}</Eyebrow>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{reason}</p>
          </div>
        ) : canClaimMatch ? (
          <Eyebrow tone={tier.tone === "brand" ? "brand" : "neutral"}>{tier.label}</Eyebrow>
        ) : null}

        <div>
          <h3
            className={cn(
              "leading-snug text-balance",
              featured ? "font-display text-2xl tracking-[-0.01em] md:text-3xl" : "font-medium",
            )}
          >
            <Link
              href={`/opportunities/${opportunity.id}`}
              className="hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {opportunity.title}
            </Link>
          </h3>
          {opportunity.organization ? (
            <p className={cn("text-ink-3", featured ? "mt-2 text-base" : "mt-1 text-sm")}>{opportunity.organization}</p>
          ) : null}
        </div>

        {/* Caveats travel with the claim they qualify. */}
        {!canClaimMatch || eligibilityNotes ? (
          <div className="flex flex-wrap items-center gap-2">
            <OpportunityStandingBadge
              eligible={eligible}
              notActionable={notActionable}
              needsVerification={needsVerification}
              ineligibleLabel="Not eligible"
            />
            {/* Eligible-but-unverified is not the same claim as eligible-and-confirmed — a
                restriction exists but Oryn is missing the fact needed to check it (see
                computeEligibility's unknownNotes). Never silently badge that as a plain match. */}
            {eligible && eligibilityNotes ? <StatusBadge label="Eligibility unknown" tone="warning" /> : null}
          </div>
        ) : null}

        {opportunity.description ? (
          <p className={cn("leading-relaxed text-ink-2", featured ? "line-clamp-3 max-w-2xl" : "line-clamp-2 text-sm")}>
            {opportunity.description}
          </p>
        ) : null}

        {eligibilityNotes ? <p className="text-xs text-ink-3">{eligibilityNotes}</p> : null}

        {/* Descriptors: facts about the opportunity, not warnings about the match. */}
        {descriptors.length > 0 || opportunity.deadline ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-1 text-xs text-ink-3">
            {descriptors.map((d, i) => (
              <span key={d} className="flex items-center gap-2.5">
                {i > 0 ? <span aria-hidden="true" className="text-ink-4">·</span> : null}
                {d}
              </span>
            ))}
            {opportunity.deadline && daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14 ? (
              <DeadlineBadge date={opportunity.deadline} />
            ) : null}
          </div>
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
            onClick={() => updateStatus("saved")}
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
            <DropdownMenuTrigger
              aria-label="Not interested"
              className="ml-auto rounded-md p-1 text-ink-4 transition-colors hover:text-ink-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {NOT_INTERESTED_REASONS.map((reasonOption) => (
                <DropdownMenuItem key={reasonOption.value} onClick={() => updateStatus("not_interested", reasonOption.value)}>
                  {reasonOption.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
