import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { placeholderTint } from "@/lib/ui/placeholder-tint";
import { StatusBadge } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { MediaImage } from "@/components/oryn/media-image";
import { selectivityLabel, cycleStatusLabel, CYCLE_STATUSES_WORTH_A_DESCRIPTOR } from "@/lib/opportunities/lifecycle";
import { categoryGlyph } from "@/lib/opportunities/category-glyph";
import type { Locale } from "@/lib/i18n/config";
import type { HomeStripOpportunity } from "@/lib/opportunities/home-strip";

type Translator = (key: string) => string;

/**
 * The rotating home strip's own card — deliberately narrower in scope than the full
 * features/opportunities/OpportunityCard: no save/apply/dismiss actions (this is a teaser,
 * not Browse — the whole card is one link to the real thing), no reason sentence (see
 * lib/opportunities/home-strip.ts's own comment on why), no description paragraph.
 *
 * **No match-tier label ("Exceptional match" etc.), on purpose — not an oversight.**
 * docs/homepage-strip-top5-quality-2026-09-03.md measured the real matching chain against
 * three personas and found the tier label doesn't distinguish a genuinely strong match from
 * a confidently-wrong one: a 14-year-old with a near-empty profile got the identical
 * "Exceptional match" label, at the identical score, that a genuinely well-matched profile
 * got, on a #1 slot whose own description asked for "largely independent work." Removing
 * the label from the app's most-visible, unrequested surface is the correct scope for
 * tonight; fixing the ranker itself is a separate, larger problem. See
 * lib/opportunities/home-strip.ts's own comment on the same decision from the data side.
 *
 * What DOES still show — the one thing that makes the honesty guarantee real — is the
 * eligibility caveat: a warning badge whenever `eligibilityNotes` is non-null, exactly like
 * Browse's own OpportunityCard does and the OLD homepage preview (dashboard-view.tsx, this
 * card's direct predecessor, per the same doc above) never did at all.
 *
 * A plain server component — no client interactivity lives here (the whole card is a
 * `<Link>`), so unlike the plan-page marquee's cards this needs no "use client" and no
 * per-card translation fetch; `t` is fetched once by the caller and threaded down.
 */
/**
 * Load-failure fallback is a `monogram`, not `icon={Compass}` as Browse's OpportunityCard
 * passes — 2026-09-03, a real crash on /dashboard for a logged-in user:
 * "Functions cannot be passed directly to Client Components ... render: function Compass".
 *
 * MediaImage is a "use client" component and this card is deliberately a Server Component
 * (see the header above for why), so a Lucide icon — a function — cannot cross that prop
 * boundary. Browse gets away with the identical line only because its card is itself
 * "use client". Copying a correct pattern into a server context is what broke it, and the
 * line looks the same in both files.
 *
 * Not fixed by adding "use client" here: this card also receives `t`/`tTier` as props from
 * a server parent, which are functions too — that trade one boundary crash for another.
 *
 * The no-image branch below renders its category glyph as JSX, which crosses nothing and
 * was always correct; only this image branch was passing a component as a prop.
 */
export function OpportunityStripCard({
  opportunity,
  locale,
  t,
}: {
  opportunity: HomeStripOpportunity;
  locale: Locale;
  t: Translator;
}) {
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
          monogram={opportunity.organization}
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
        {/* No confident-match claim to gate here anymore (see this file's own header) —
            only ever a caveat, never a substitute claim in its place. Silence is the
            correct, honest state when there's nothing uncertain to flag. */}
        {opportunity.eligibilityNotes ? <StatusBadge label={t("eligibilityUnknown")} tone="warning" /> : null}

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
