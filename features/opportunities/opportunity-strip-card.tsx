import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Compass } from "lucide-react";
import { placeholderTint } from "@/lib/ui/placeholder-tint";
import { StatusBadge } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { MediaImage } from "@/components/oryn/media-image";
import { selectivityLabel, cycleStatusLabel, CYCLE_STATUSES_WORTH_A_DESCRIPTOR } from "@/lib/opportunities/lifecycle";
import { matchTierKey, type MatchTier } from "@/lib/opportunities/matching";
import { categoryGlyph } from "@/lib/opportunities/category-glyph";
import type { Locale } from "@/lib/i18n/config";
import type { HomeStripOpportunity } from "@/lib/opportunities/home-strip";

type Translator = (key: string) => string;

const TIER_TONE: Record<MatchTier, "brand" | "neutral"> = {
  exceptional: "brand",
  strong: "brand",
  worthALook: "neutral",
  lowPriority: "neutral",
};

/**
 * The rotating home strip's own card — deliberately narrower in scope than the full
 * features/opportunities/OpportunityCard: no save/apply/dismiss actions (this is a teaser,
 * not Browse — the whole card is one link to the real thing), no reason sentence (see
 * lib/opportunities/home-strip.ts's own comment on why), no description paragraph. What it
 * keeps from that card is the two things that make the honesty guarantee real: the same
 * category-glyph/tint placeholder chain when there's no image, and the same
 * canClaimMatch-gated split between "Oryn vouches for this match" and "eligibility not
 * checked yet" — a caveat badge, not silence, exactly like Browse.
 *
 * A plain server component — no client interactivity lives here (the whole card is a
 * `<Link>`), so unlike the plan-page marquee's cards this needs no "use client" and no
 * per-card translation fetch; `t`/`tTier` are fetched once by the caller and threaded down,
 * the same split app/(app)/dashboard/page.tsx's own tTier already establishes one file over.
 */
export function OpportunityStripCard({
  opportunity,
  locale,
  t,
  tTier,
}: {
  opportunity: HomeStripOpportunity;
  locale: Locale;
  t: Translator;
  tTier: Translator;
}) {
  // eligible is always true for anything reaching this card (getHomeOpportunityStrip's own
  // SQL filter) and needsVerification can't occur here either (same function's comment) —
  // eligibilityNotes is the one and only thing that can withhold the confident-match claim
  // on this surface.
  const canClaimMatch = opportunity.eligibilityNotes === null;
  const tierKey = matchTierKey(opportunity.matchScore);

  const daysUntilDeadline = opportunity.deadline ? differenceInCalendarDays(new Date(opportunity.deadline), new Date()) : null;
  // Selectivity + cycle-label only, not the full descriptor set OpportunityCard shows
  // (languages of instruction dropped) — a compact card in a 5-wide strip has room for two
  // short facts beside the deadline badge, not the whole row Browse can afford.
  const descriptors = [
    selectivityLabel(opportunity.selectivityTier, locale) ?? null,
    !opportunity.deadline && opportunity.cycleStatus && CYCLE_STATUSES_WORTH_A_DESCRIPTOR.has(opportunity.cycleStatus)
      ? cycleStatusLabel(opportunity.cycleStatus, locale)
      : null,
  ].filter((d): d is string => d !== null);

  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="glass-card-fast group/strip flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl ring-1 ring-border/70 transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-80"
      style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(14px)" }}
    >
      {opportunity.imageUrl ? (
        <MediaImage
          className="aspect-[16/9] w-full"
          tintKey={opportunity.id}
          src={opportunity.imageUrl}
          alt={`${opportunity.title}${opportunity.organization ? ` — ${opportunity.organization}` : ""}`}
          icon={Compass}
          sizes="320px"
        />
      ) : (
        // Same honest placeholder chain as OpportunityCard — see that component's own doc
        // comment for why this is a category glyph over a tint wash, never a stock photo.
        <div
          aria-hidden="true"
          data-tint={placeholderTint(opportunity.id)}
          className="@container relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden border-b border-white/50 bg-[linear-gradient(135deg,var(--tint-from)_0%,var(--tint-to)_100%)]"
        >
          {(() => {
            const CategoryGlyph = categoryGlyph(opportunity.category);
            return <CategoryGlyph aria-hidden="true" strokeWidth={1} className="absolute inset-0 m-auto size-[28cqw] text-ink-1/[0.14]" />;
          })()}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {canClaimMatch ? (
          <Eyebrow tone={TIER_TONE[tierKey]} locale={locale}>
            {tTier(tierKey)}
          </Eyebrow>
        ) : (
          // Never silence: an eligibility-unverified match still shows, just without the
          // confident tier claim riding along with it — same rule OpportunityStandingBadge
          // encodes for Browse, reused here via the identical badge rather than a second copy.
          <StatusBadge label={t("eligibilityUnknown")} tone="warning" />
        )}

        <h3 className="line-clamp-2 text-balance font-medium leading-snug group-hover/strip:underline">{opportunity.title}</h3>
        {opportunity.organization ? <p className="line-clamp-1 text-sm text-ink-3">{opportunity.organization}</p> : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-2 text-xs text-ink-3">
          {descriptors.map((d, i) => (
            <span key={d} className="flex items-center gap-2.5">
              {i > 0 ? (
                <span aria-hidden="true" className="text-ink-4">
                  ·
                </span>
              ) : null}
              {d}
            </span>
          ))}
          {opportunity.deadline && daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14 ? (
            <DeadlineBadge date={opportunity.deadline} locale={locale} />
          ) : null}
        </div>
      </div>
    </Link>
  );
}
