import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/proxola/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { OpportunityStripCard } from "@/features/opportunities/opportunity-strip-card";
import { shouldAnimateStrip, type HomeStripOpportunity } from "@/lib/opportunities/home-strip";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/** Same TS-generic workaround as features/opportunities/opportunity-card.tsx's own
 * `Translator` alias (that file's own comment has the full reasoning) — each file defines
 * this locally rather than importing one shared alias, matching that file and
 * dashboard-view.tsx, both of which already do the same. */
type Translator = (key: string) => string;

/**
 * The home page's rotating "best 5 opportunities" strip (founder dispatch 2026-09-03).
 * Framed as the highest-confidence surface in the app, which is exactly why it carries no
 * match-tier claim at all — see OpportunityStripCard's own header and lib/opportunities/
 * home-strip.ts's for docs/homepage-strip-top5-quality-2026-09-03.md's measurement of why a
 * confident tier label isn't currently a claim this surface can back up. What every card
 * still does is surface a real eligibility caveat when one exists, never silence.
 *
 * **Motion mechanism, identical to features/settings/ultra-feature-marquee.tsx**: a doubled
 * card row, translated by exactly -50% via `@keyframes opportunity-strip-scroll`
 * (app/globals.css), paused on hover/focus, reduced-motion turns the animation off AND hides
 * the duplicate copy (motion-reduce:hidden) so a reduced-motion viewer sees one static row,
 * not two overlapping ones. `tabIndex={0}` + `role="region"` on the viewport make it
 * keyboard-reachable so `:focus-within` can actually fire for a keyboard user, matching that
 * component's own WCAG 2.2.2 reasoning. **This does not steal focus** — `tabIndex={0}` only
 * makes the region reachable via a normal Tab press in document order; nothing here calls
 * `.focus()` or sets `autoFocus` on mount, so the strip never pulls keyboard focus away from
 * wherever the page already had it (explicit constraint, this dispatch).
 *
 * **Thin-state handling — the brand-new-student case named as the highest-priority part of
 * this build.** Below MIN_CARDS_TO_ANIMATE (lib/opportunities/home-strip.ts), looping motion
 * on one or two cards would read as broken/jittery rather than alive (nothing to loop INTO),
 * so this renders a plain static row instead of the animated track — same cards, same
 * OpportunityStripCard, just no `@keyframes`, no doubling, no infinite scroll. Zero cards
 * renders EmptyState instead of an empty rotating shell, matching the product's own
 * "no bare 'no records found'" convention (components/proxola/empty-state.tsx) — a brand-new
 * account with nothing recorded yet gets a real explanation and a way out, not a blank strip
 * quietly doing nothing.
 *
 * **The sponsored-slot seam, stated concretely per this dispatch's own requirement (not
 * built, not styled — deliberately no code for it below).** This component has zero opinion
 * about where an `HomeStripOpportunity` came from; it only renders whatever order
 * `opportunities` arrives in. A future sponsored slot is therefore entirely a caller-side
 * concern: (1) widen this file's `opportunities` prop to a union
 * (`{ kind: "opportunity"; data: HomeStripOpportunity } | { kind: "sponsored"; data: ... }`),
 * (2) give `OpportunityStripCard` a sibling `SponsoredStripCard` (same `w-72 sm:w-80`
 * footprint, so track-width math for the -50% loop keeps working unmodified), (3) the
 * `.map()` below becomes a switch on `kind`, and (4) the position rule (e.g. "always index 2
 * of 5," or "one sponsored card per N organic ones") lives in whatever server-side code
 * assembles the array before it reaches this component — never inside the rotation mechanism
 * itself. No part of the animation, pause, or reduced-motion handling changes for any of this.
 */
export async function OpportunityStrip({ opportunities, locale = DEFAULT_LOCALE }: { opportunities: HomeStripOpportunity[]; locale?: Locale }) {
  const t = (await getTranslations({ locale, namespace: "opportunities.card" })) as Translator;
  const tDash = await getTranslations({ locale, namespace: "dashboard" });

  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title={tDash("homeStripEmptyTitle")}
        description={tDash("homeStripEmptyDescription")}
        action={<ButtonLink href="/profile">{tDash("homeStripEmptyAction")}</ButtonLink>}
      />
    );
  }

  const cards = opportunities.map((opportunity) => (
    <OpportunityStripCard key={opportunity.id} opportunity={opportunity} locale={locale} t={t} />
  ));

  if (!shouldAnimateStrip(opportunities.length)) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-1">
        {cards}
      </div>
    );
  }

  return (
    <div
      className="opportunity-strip-viewport overflow-hidden"
      tabIndex={0}
      role="region"
      aria-label={tDash("homeStripAriaLabel")}
    >
      <div className="opportunity-strip-track flex w-max gap-4">
        <div className="flex gap-4">{cards}</div>
        {/* Seamless-loop duplicate — hidden, not merely unanimated, under reduced motion.
            See this file's own header for why (a reduced-motion viewer must see ONE static
            row, not two motionless copies side by side).

            `inert`, not just `aria-hidden`: unlike the plan-page marquee's cards (plain divs,
            nothing focusable inside), OpportunityStripCard's root IS a real `<a>` — aria-hidden
            alone does not remove a focusable descendant from Tab order, so without `inert` a
            keyboard user tabbing through would land on five invisible-in-purpose duplicate
            links between the real ones. `inert` removes the whole subtree from both the
            accessibility tree and Tab order in one attribute (React 19 supports it as a plain
            boolean prop) — found live via DOM inspection, not assumed from the marquee's own
            precedent, which never had to solve this because it has no links in its cards. */}
        <div className="flex gap-4 motion-reduce:hidden" aria-hidden="true" inert>
          {opportunities.map((opportunity) => (
            <OpportunityStripCard key={`loop-${opportunity.id}`} opportunity={opportunity} locale={locale} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
