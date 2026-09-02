"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
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
import { placeholderTint } from "@/lib/ui/placeholder-tint";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { MediaImage } from "@/components/oryn/media-image";
import { OpportunityStandingBadge } from "./standing-badge";
import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import { selectivityLabel, cycleStatusLabel } from "@/lib/opportunities/lifecycle";
import { matchTierKey } from "@/lib/opportunities/matching";
import type { Locale } from "@/lib/i18n/config";
import type { Opportunity, SavedOpportunityStatus } from "@/types/database";

/** Same TS-generic workaround as app/(app)/universities/[id]/page.tsx's own `Translator`
 * alias — a next-intl translator scoped to one namespace can't be passed to a plain function
 * expecting `(key: string) => string` (the key type is a strict literal union, not `string`,
 * and function parameters are contravariant), so tierFor takes this narrower shape instead. */
type Translator = (key: string) => string;

/** Shared by opportunity-actions.tsx (the detail page's action row) — a hook rather than a
 * static export, now that the labels need a translator; the values themselves (persisted in
 * saved_opportunities.not_interested_reason) are unchanged. */
export function useNotInterestedReasons(): { value: string; label: string }[] {
  const t = useTranslations("opportunities.reasons");
  return [
    { value: "not_interested_topic", label: t("notInterestedTopic") },
    { value: "too_expensive", label: t("tooExpensive") },
    { value: "no_time", label: t("noTime") },
    { value: "location", label: t("location") },
    { value: "too_competitive", label: t("tooCompetitive") },
    { value: "already_applied", label: t("alreadyApplied") },
    { value: "other", label: t("other") },
  ];
}

/** "match" register — Browse's own recommendation framing. The detail page's fitLabel
 * (same lib/opportunities/matching.ts matchTierKey thresholds, not just coincidentally
 * matching numbers) deliberately uses "fit" instead ("Oryn's take" is a first-person verdict,
 * not a ranked-list tag) — see that file's own comment. Middle two tiers share their English
 * text between the two files, but that's this codebase's actual wording, not a shortcut. */
function tierFor(score: number, t: Translator): { label: string; tone: StatusTone } {
  const key = matchTierKey(score);
  const tone: StatusTone = key === "exceptional" || key === "strong" ? "brand" : "neutral";
  return { label: t(key), tone };
}

/**
 * The student-facing reason, as a sentence rather than three concatenated fragments.
 * UI-V3 § 19 puts "why Oryn recommends it" above the opportunity's own identity, so this
 * needs to read as counsel, not as a tag list.
 *
 * Kept local (not moved to lib/opportunities/) rather than routed through the message
 * catalog — it's generated prose built from reason codes via conditional joining, the same
 * shape as lib/counselor/copy.ts's sentence-builders, just living in a Client Component
 * because reason codes only ever reach the client already resolved. `.toLocaleUpperCase("tr")`
 * on the Turkish branch, not `.toUpperCase()` — plain `.toUpperCase()` on a lowercase "i"
 * produces the dotless "I", not Turkish's dotted "İ" (this file's fragments can start with
 * "ilgi", so the bug is reachable, not theoretical).
 */
function reasonSentence(reasonCodes: string[], locale: Locale): string | null {
  // limited_opportunity_information/limited_profile_information only ever appear alone
  // (lib/opportunities/persist-matches.ts's buildReasonCodes gates them behind "nothing
  // else applied") -- they're a caveat about why there's nothing stronger to say, not a
  // clause that reads naturally comma-joined with a real reason, so they're handled as
  // their own full sentence before the joined-fragments shape below.
  if (reasonCodes.includes("limited_opportunity_information")) {
    return locale === "tr"
      ? "Oryn'ın bu fırsatın odak alanları hakkında henüz yeterli bilgisi yok."
      : "Oryn doesn't have enough information about this opportunity's focus areas yet.";
  }
  if (reasonCodes.includes("limited_profile_information")) {
    return locale === "tr"
      ? "İlgi alanlarını eklersen Oryn bu eşleşmeyi daha net açıklayabilir."
      : "Add your interests to your profile for Oryn to explain this match more specifically.";
  }

  const parts: string[] =
    locale === "tr"
      ? [
          reasonCodes.includes("addresses_a_current_gap") ? "profilindeki bir boşluğu kapatıyor" : null,
          reasonCodes.includes("matches_your_interests") ? "ilgi alanlarınla örtüşüyor" : null,
          reasonCodes.includes("shares_your_interest") ? "belirttiğin ilgi alanlarından biriyle örtüşüyor" : null,
          reasonCodes.includes("near_you") ? "kendi ülkende gerçekleşiyor" : null,
          // A caveat, not a boost — joined into the same sentence rather than a separate
          // callout, so it can't be missed the way a second, easy-to-skip line could be.
          // section 62 explainability: a penalty needs the same visibility a boost gets.
          reasonCodes.includes("similar_to_dismissed") ? "önceden ilgilenmediğini belirttiğin bir fırsata benziyor" : null,
        ].filter((p): p is string => p !== null)
      : [
          reasonCodes.includes("addresses_a_current_gap") ? "it addresses a current gap in your profile" : null,
          reasonCodes.includes("matches_your_interests") ? "it matches your interests" : null,
          reasonCodes.includes("shares_your_interest") ? "it shares one of your stated interests" : null,
          reasonCodes.includes("near_you") ? "it's based in your country" : null,
          reasonCodes.includes("similar_to_dismissed") ? "it resembles something you previously marked not interested in" : null,
        ].filter((p): p is string => p !== null);
  if (parts.length === 0) return null;
  const joined =
    parts.length === 1
      ? parts[0]
      : locale === "tr"
        ? `${parts.slice(0, -1).join(", ")} ve ${parts[parts.length - 1]}`
        : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  const capitalized = locale === "tr" ? joined.charAt(0).toLocaleUpperCase("tr") + joined.slice(1) : joined.charAt(0).toUpperCase() + joined.slice(1);
  return `${capitalized}.`;
}

// cycle_status is about whether *this* cycle is taking applications right now — distinct
// from whether the opportunity is worth knowing about at all. Only the states a student
// needs a heads-up about become a plain-text descriptor; "open" is the unremarkable default
// and stays quiet — achieved here by simply not calling cycleStatusLabel for it, same effect
// as the old local map not having an "open" key. (The old map's per-status `tone` field was
// dead code — descriptors render as plain text, never a StatusBadge — so it isn't carried
// forward; nothing here ever read it.)
const CYCLE_STATUSES_WORTH_A_DESCRIPTOR = new Set<Opportunity["cycle_status"]>(["upcoming", "closed", "date_not_announced", "historical", "discontinued", "unverified"]);

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
 * **On imagery.** `opportunities.image_url` exists as of migration 0066 but no row is
 * populated yet — acquisition is a separate task. Stock photography stays banned by the
 * brief: a decorative photo standing in for evidence breaches Rule 4.
 *
 * The media band therefore always renders, but as an explicit, honest placeholder until a
 * real image lands ("No image yet", founder-directed 2026-08-30) rather than a stock shot
 * or a meaningless monogram. An earlier revision hid the band entirely when unpopulated;
 * that was reverted because it made the card layout change shape per-row once partial data
 * lands. `imageUrl` overrides the placeholder the moment a row has one.
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
  const t = useTranslations("opportunities.card");
  const tTier = useTranslations("opportunities.matchTier") as Translator;
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const reasons = useNotInterestedReasons();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const tier = tierFor(matchScore, tTier);
  const reason = reasonSentence(reasonCodes, locale);
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

  // Language sits with the other factual descriptors, not with the caveats: which language
  // a programme runs in is a property of the opportunity, not a warning about the match.
  // Empty array means "not known" (migration 0066) — stays silent rather than implying
  // English by omission, which matters for a product whose users apply across languages.
  // Defensive read: the column arrives with migration 0066, and a database that has not
  // caught up yet returns the row without the key at all rather than as an empty array.
  // Treating that as "not known" keeps a schema lag showing one missing descriptor instead
  // of throwing and taking the whole Opportunities route down with an error boundary.
  const languages = opportunity.languages_of_instruction ?? [];
  const languageLabel = languages.length > 0 ? t("taughtInPrefix", { languages: languages.join(" & ") }) : null;

  const descriptors = [
    selectivityLabel(opportunity.selectivity_tier, locale) ?? null,
    languageLabel,
    CYCLE_STATUSES_WORTH_A_DESCRIPTOR.has(opportunity.cycle_status) ? cycleStatusLabel(opportunity.cycle_status, locale) : null,
  ].filter((d): d is string => d !== null);

  return (
    // glass-card-fast: Figma-source card chrome (App.tsx `OpportunityCard`) — translucency
    // + aurora glow. The stock-photo media band that source always shows is deliberately
    // not added here: this card's own imageUrl/MediaImage system exists specifically
    // because fabricated imagery was tried and rejected (see the doc comment above) —
    // that decision stands over the source screen's literal Unsplash placeholders.
    <article
      className={cn(
        "glass-card-fast group/opp flex flex-col overflow-hidden rounded-2xl ring-1 transition-colors duration-(--duration-fast)",
        canClaimMatch && matchScore >= 80 ? "ring-brand-primary-border" : "ring-border/70",
      )}
      style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(14px)" }}
    >
      {(imageUrl ?? opportunity.image_url) ? (
        <MediaImage
          className={cn("w-full", featured ? "aspect-[21/8]" : "aspect-[16/7]")}
          tintKey={opportunity.id}
          src={imageUrl ?? opportunity.image_url}
          alt={`${opportunity.title}${opportunity.organization ? ` — ${opportunity.organization}` : ""}`}
          icon={Compass}
          sizes={featured ? "(min-width: 768px) 880px, 100vw" : "(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"}
        />
      ) : (
        /* Honest placeholder, not a stock photo — see the doc comment above. It says what
           it is rather than impersonating an image that failed to load. */
        <div
          aria-hidden="true"
          data-tint={placeholderTint(opportunity.id)}
          className={cn(
            "flex w-full items-center justify-center gap-2 border-b border-white/50 text-xs text-ink-4",
            // Each card starts from its own colour (app/globals.css's [data-tint] block).
            // Previously one fixed three-stop gradient, identical on every card, which made a
            // grid of un-imaged opportunities read as a single repeated non-thing.
            "bg-[linear-gradient(135deg,var(--tint-from)_0%,var(--tint-to)_100%)]",
            featured ? "aspect-[21/8]" : "aspect-[16/7]",
          )}
        >
          <Compass className="size-4" />
          {t("noImageYet")}
        </div>
      )}

      <div className={cn("flex flex-1 flex-col gap-3", featured ? "p-6 md:p-8" : "p-5")}>
        {/* Why first (§ 19): the student's relationship to the opportunity outranks the
            opportunity's own metadata. */}
        {/* Found live 2026-09-02: 165 eligible, verified matches share zero interest overlap,
            don't address any weak dimension, and aren't nearby -- buildReasonCodes
            (lib/opportunities/persist-matches.ts) deliberately leaves these with an empty
            reason_codes array rather than inventing a sentence to cover a matcher gap (see
            that function's own comment). Before this fix, the branch below this comment used
            to show the confident tier label alone whenever canClaimMatch was true, regardless
            of whether `reason` existed -- which is exactly spec Phase 12's forbidden "opaque
            AI score": a tier claim with nothing behind it. Since the reason-codes-coverage
            fix, `reason === null` for an eligible, verified match happens if and only if the
            match is genuinely zero-overlap (every other eligible case now gets at least one
            code) -- so the two-way branch below is now the complete, correct set: a real
            reason, or nothing. The card still renders normally otherwise (title, facts,
            deadline, actions); only this claim disappears, same treatment an unverified row
            already gets. Not a badge explaining why -- OpportunityStandingBadge has nothing
            to say about a row that IS eligible and IS verified, so silence is the honest
            state, not a gap to fill with new copy. */}
        {canClaimMatch && reason ? (
          <div>
            <Eyebrow tone="brand" locale={locale}>{tier.label}</Eyebrow>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{reason}</p>
          </div>
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
              locale={locale}
              ineligibleLabel={t("ineligibleLabel")}
            />
            {/* Eligible-but-unverified is not the same claim as eligible-and-confirmed — a
                restriction exists but Oryn is missing the fact needed to check it (see
                computeEligibility's unknownNotes). Never silently badge that as a plain match. */}
            {eligible && eligibilityNotes ? <StatusBadge label={t("eligibilityUnknown")} tone="warning" /> : null}
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
              <DeadlineBadge date={opportunity.deadline} locale={locale} />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {opportunity.official_url ? (
            <Button variant="outline" size="sm" render={<a href={opportunity.official_url} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
              {t("view")} <ExternalLink className="size-3.5" />
            </Button>
          ) : null}
          <Button
            variant={status === "saved" ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateStatus("saved")}
            disabled={isPending}
          >
            <Bookmark className="size-3.5" /> {status === "saved" ? t("saved") : tCommon("save")}
          </Button>
          <Button
            variant={status === "applied" ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateStatus("applied")}
            disabled={isPending}
          >
            {t("applied")}
          </Button>
          {/* render={<Button .../>}: a bare styled <button> here (p-1 padding, ~24px hit
              area) sat well under the app's ~40px+ touch-target convention, in a dense
              card row otherwise built from real Button components. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" className="ml-auto text-ink-4 hover:text-ink-1" />}
              nativeButton={true}
              aria-label={t("notInterestedAriaLabel")}
            >
              <X className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {reasons.map((reasonOption) => (
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
