"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Sparkles, Zap, MessagesSquare, Flame, Palette } from "lucide-react";
import { PageHeader } from "@/components/proxola/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registerUltraInterestAction } from "@/app/(app)/settings/actions";
import { TIER_COMPARISON_ROWS } from "@/lib/tier/comparison";
import { formatNumber, formatTokenCount } from "@/lib/i18n/format";
import { UltraFeatureMarquee, type UltraFeatureCardData } from "@/features/settings/ultra-feature-marquee";
import { PlanGroundGlow } from "@/features/settings/plan-ground-glow";
import type { PlanTier } from "@/types/database";

const CARD_ICONS: Record<UltraFeatureCardData["id"], typeof Zap> = {
  aiAllowance: Zap,
  replyCeiling: MessagesSquare,
  replyDepth: Flame,
  visualTheme: Palette,
};

/**
 * The plan page. Two hard constraints from the assignment, both load-bearing on this
 * component's shape, not just its copy:
 *
 * 1. **No buy button.** There is no payments integration (migration 0089's own header),
 *    so nothing here can look like a checkout. The only interactive control is
 *    `registerUltraInterestAction` — a plain analytics event, gated behind its own honest
 *    copy (`interestDescription`), never dressed up as an upgrade flow. An Ultra student
 *    sees no call to action at all: they have nothing to register interest in.
 * 2. **No invented capabilities.** The comparison table (and, as of this pass, the
 *    marquee cards above it) is driven entirely by `TIER_COMPARISON_ROWS`
 *    (lib/tier/comparison.ts) plus matching catalog entries — this component has no
 *    hardcoded row content, and each `sameByDesign` row (currently two: the weekly plan's
 *    3-action cap, the research generator's 3-idea cap) renders as one shared value rather
 *    than two coincidentally-matching ones, so "kept equal on purpose" reads as a decision,
 *    not an unfinished row.
 *
 * **2026-09-03, founder-directed redesign ("bu kısım çok çok kötü ya" — this reads as a
 * spreadsheet), relayed via oryn-45, content verified in parallel by oryn-a4
 * (`docs/ultra-feature-inventory-2026-09-03.md`).** What changed and why, beyond the visual
 * shape:
 *
 * - **Two new comparison rows, `aiAllowance`/`replyCeiling`, both from the Ultra
 *   tier-economics build that shipped the same day** — see lib/tier/comparison.ts's own
 *   header for why they're two axes, not one restated, and why the underlying dollar
 *   ceilings aren't a third row (the token number is the honest translation of them).
 * - **Every number on this page is a prop, computed server-side
 *   (app/(app)/settings/plan/page.tsx) from the exact constants that enforce it** —
 *   `MONTHLY_AI_TOKEN_LIMIT` (lib/ai/token-limits.ts) and `ADVISOR_MAX_TOKENS_ULTRA`/
 *   `_STANDARD` (lib/ai/advisor-chat.ts). Formatted client-side here
 *   (`formatTokenCount`/`formatNumber`, lib/i18n/format.ts — plain `Intl` wrappers, no
 *   server-only dependency) rather than passed pre-formatted, so this component owns
 *   exactly one representation of "how these numbers look," not two. A marketing page
 *   whose figures could drift from what the product actually enforces is worse than an
 *   ugly one — the founder's own instruction for this pass, stated directly.
 * - **The marquee cards intentionally carry only the four `differs` rows, never the two
 *   `sameByDesign` ones.** Decided explicitly, not defaulted: a row of "here's what's
 *   better" cards is the wrong vehicle for "deliberately identical" — putting
 *   weeklyPlanFocus/researchIdeaFocus there would either read as a fifth/sixth advantage
 *   (false) or need its own visually-distinct "this is a boundary, not a win" treatment
 *   fighting the marquee's entire point. The table keeps the exact "kept equal on purpose"
 *   framing (a shared cell spanning both columns) it already had, unchanged — cards show
 *   what's better, the table shows the complete picture including what's intentionally the
 *   same, division of labor rather than a dropped distinction.
 * - **"Ultra isn't open for signups yet" moved out of the page's lead sentence, into the
 *   interest card where the CTA it explains actually lives** — decided explicitly (oryn-a4
 *   flagged this needed a real decision, not a default): the founder's own instruction was
 *   "the one job of the page is to show how much a student gets," and opening with a
 *   limitation before showing a single benefit worked against that. The fact itself is
 *   unchanged and still stated plainly — `interestDescription` still says outright it isn't
 *   purchasable yet — just relocated to where a reader who's already seen the value
 *   naturally reaches it, not the very first thing on the page.
 *
 * Every real account is standard-tier by default and there is currently no in-product way
 * to become Ultra by paying — the interest card two constraints up says so.
 *
 * Only two tiers are rendered because `PlanTier` only has two values — there is no
 * "unknown/unreadable" state here on purpose. `resolvePlanTier` (lib/tier/plan-tier.ts)
 * already explains why on the read path: `select("*")` on a table missing `plan_tier`
 * omits the field rather than erroring, so an unapplied migration is indistinguishable
 * from a genuine standard-tier row, by design — there is no third state to build a UI for.
 *
 * `tier-glow-sm` (app/globals.css's Ultra section) is applied to the current-plan badge
 * unconditionally — it only renders as anything but a no-op once `[data-tier="ultra"]` is
 * set on an ancestor, which either `features/app-shell/ultra-ambient.tsx` (the real,
 * page-level tier) or this component's own marquee wrapper (a local, always-on scope —
 * see UltraFeatureMarquee's own header) already does. No per-page tier check needed for
 * the CSS to be correct.
 *
 * `tier-grad-text` (the flame-gradient-through-transparent-glyphs treatment) is
 * deliberately NOT used on either "Ultra" label (the current-plan `CardTitle` or the
 * comparison cards' own value labels) — 2026-09-02 fix, still holds: that gradient reads
 * unreadable against this page's own amber ground, and the safe pattern is flame on
 * decoration, never on the thing carrying meaning. Both stay plain text, matching
 * `standardName`'s own already-safe treatment.
 *
 * **2026-09-04, founder-directed, relayed live: "alt kısım hala excel gibi... o yukardaki
 * başlık kısmı var ya ultra yazan oraya mavi logo ekle ok koy kırmızı logoyu koy" (the
 * bottom still reads as a spreadsheet; put the logo in the header, blue for Standard, red
 * for Ultra).** Two changes:
 *
 * - **The current-plan header card now carries the mark** — `logo-mark.png` (blue) at
 *   Standard, `logo-mark-flame.png` (the flame colourway) at Ultra, switched on the real
 *   `tier` prop, not a decorative `data-tier` scope — this is the one place on the page
 *   that should actually reflect the viewer's own plan, everything else here is "what
 *   Ultra looks like" shown to everyone regardless of their real tier.
 * - **The comparison table is now cards.** The four `differs` rows each get
 *   `.plan-ultra-card` (the same flame-top-bar-plus-glow treatment the marquee cards
 *   already use, same `data-tier="ultra"` local-scope reasoning — decorative, not the real
 *   tier, since the point is showing every viewer what differs) with Standard's value
 *   stacked above Ultra's inside one card, rather than two table columns. **The two
 *   `sameByDesign` rows deliberately do NOT get that treatment** — no flame bar, no glow,
 *   a plain dashed-border card with one shared line of italic text, visually continuous
 *   with the table's old `colSpan={2}` "kept equal on purpose" cell rather than styled to
 *   look like a smaller version of a differs card. The founder's own words on why this
 *   matters: "Herkes için ilk 3 öncelik, bilinçli olarak küçük tutuluyor" — a card style
 *   that made these look like an Ultra advantage would misrepresent the one thing this
 *   table exists to state honestly. No color system changed to build either card style —
 *   both reuse existing tokens (`--tier-accent-strong`, `--tier-grad-*`, `--tier-glow` via
 *   `.plan-ultra-card`, plain `border`/`text-muted-foreground` for the same-by-design
 *   cards), per the explicit instruction not to restyle the page's own palette.
 *
 * **2026-09-04, later the same night, founder direct: "bir de arka planı böyle loş yeşil
 * yapalım" — a dim green ground for this page.** Confirmed with the founder before
 * building: scoped to this page only, no shared surface touched (`.plan-page-ground`,
 * app/globals.css — its own header comment has the full reasoning and the measured
 * contrast numbers). Mounted here, not in app/(app)/layout.tsx, specifically so it can
 * only ever paint behind this one component. Full-bleed rather than sized to the
 * `max-w-3xl` column below it, so it reads as the page's own ground rather than a boxed
 * panel; the actual content is lifted to `z-10` in a sibling div so nothing here changes
 * which elements the content itself sits among.
 *
 * It was `position: fixed` until the founder reported "sol bar gözükmüyor" — fixed means
 * the VIEWPORT, so it painted over the sidebar, which is a sticky sibling of the content
 * column carrying no z-index of its own. Now `absolute`, anchored to the layout's own
 * `<main class="relative">`. "Full-bleed" here means the content column, not the screen.
 *
 * **2026-09-04, later the same night, founder direct (relayed via oryn-45): "yeşil çok çok
 * koyu, arkada açık yeşil olmalı, loş ışık tarzı, ve hareket etsin yine beyazlarla"** —
 * lighter, a dim-light quality specifically, and motion with white. `PlanGroundGlow`
 * (features/settings/plan-ground-glow.tsx) is the motion — its own header comment has the
 * full reasoning for which existing Ultra animation it reuses and why. Mounted as a plain
 * child of this same `.plan-page-ground` div rather than a second positioned layer of its
 * own, so it inherits the div's positioning discipline (`absolute`, not `fixed`) instead of
 * making a second containing-block decision that could reopen the sidebar-covering trap.
 */
export function PlanTierView({
  tier,
  ultraTokenLimit,
  standardTokenLimit,
  ultraMaxTokens,
  standardMaxTokens,
}: {
  tier: PlanTier;
  ultraTokenLimit: number;
  standardTokenLimit: number;
  ultraMaxTokens: number;
  standardMaxTokens: number;
}) {
  const t = useTranslations("settings.plan");
  const [interestRegistered, setInterestRegistered] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formattedUltraLimit = formatTokenCount(ultraTokenLimit);
  const formattedStandardLimit = formatTokenCount(standardTokenLimit);
  const formattedUltraMaxTokens = formatNumber(ultraMaxTokens);
  const formattedStandardMaxTokens = formatNumber(standardMaxTokens);

  const differsRows = useMemo(() => TIER_COMPARISON_ROWS.filter((row) => row.kind === "differs"), []);
  const sameByDesignRows = useMemo(() => TIER_COMPARISON_ROWS.filter((row) => row.kind === "sameByDesign"), []);
  const marqueeCards: UltraFeatureCardData[] = differsRows.map((row) => ({
    id: row.id,
    icon: CARD_ICONS[row.id],
    stat: row.id === "aiAllowance" ? formattedUltraLimit : row.id === "replyCeiling" ? formattedUltraMaxTokens : undefined,
  }));

  function comparisonValues(id: string, column: "standard" | "ultra"): Record<string, string> {
    if (id === "aiAllowance") return { limit: column === "ultra" ? formattedUltraLimit : formattedStandardLimit };
    if (id === "replyCeiling") return { maxTokens: column === "ultra" ? formattedUltraMaxTokens : formattedStandardMaxTokens };
    return {};
  }

  function registerInterest() {
    startTransition(async () => {
      await registerUltraInterestAction();
      // Local confirmation only, not persisted — a second visit (or a page reload right
      // after) shows the button again rather than remembering the click forever. A stated,
      // deliberate limitation for this "skin only" pass, not an oversight: persisting it
      // honestly would mean reading `product_events` back, which needs the admin client
      // (lib/analytics/log.ts's own comment — no RLS policy for the regular client), a real
      // addition beyond what a lightweight interest signal needs tonight.
      setInterestRegistered(true);
    });
  }

  return (
    <>
      <div aria-hidden="true" className="plan-page-ground">
        <PlanGroundGlow />
      </div>
      <div className="relative z-10 max-w-3xl space-y-8">
        <PageHeader className="dark [&_h1]:text-foreground" title={t("title")} description={t("description")} />

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Image
              src={tier === "ultra" ? "/brand/logo-mark-flame.png" : "/brand/logo-mark.png"}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0"
              priority
            />
            <div>
              <CardDescription>{t("currentPlanLabel")}</CardDescription>
              <CardTitle className="text-2xl">{tier === "ultra" ? t("ultraName") : t("standardName")}</CardTitle>
            </div>
          </CardHeader>
          {tier === "ultra" ? (
            <CardContent>
              <Badge variant="secondary" className="tier-glow-sm gap-1">
                <Sparkles className="size-3" /> {t("ultraBadge")}
              </Badge>
            </CardContent>
          ) : null}
        </Card>

        <UltraFeatureMarquee cards={marqueeCards} />

        <div className="space-y-4">
          <h2 className="dark font-semibold text-foreground">{t("comparisonTitle")}</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {differsRows.map((row) => {
              const Icon = CARD_ICONS[row.id];
              return (
                <div key={row.id} data-tier="ultra" className="plan-ultra-card rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4" style={{ color: "var(--tier-accent-strong)" }} aria-hidden="true" />
                    <p className="text-sm font-medium">{t(`comparison.${row.id}.label`)}</p>
                  </div>
                  <dl className="mt-3 space-y-2.5">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">{t("standardName")}</dt>
                      <dd className="text-sm text-muted-foreground">
                        {t(`comparison.${row.id}.standard`, comparisonValues(row.id, "standard"))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium" style={{ color: "var(--tier-accent-strong)" }}>
                        {t("ultraName")}
                      </dt>
                      <dd className="text-sm">{t(`comparison.${row.id}.ultra`, comparisonValues(row.id, "ultra"))}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          {/* Deliberately not .plan-ultra-card: no flame bar, no glow, a plain dashed border.
              These two rows are the product stating a boundary on purpose (see this
              component's own header comment), and the visual language has to say "not a
              difference" as clearly as the differs cards above say "this is."

              `dark` here (2026-09-04, the green-ground pass) exists purely so this box's
              already-plain colors (border-foreground/20, text-muted-foreground) resolve
              against the same dim-green ground the differs cards sit on -- not to make
              these rows look like anything new. The label <p> gets an explicit
              text-foreground for the same reason PageHeader's own <h1> needed one: with no
              color class of its own it would otherwise inherit the page's light-theme
              foreground from a distant ancestor instead of picking up this local .dark
              scope's value. */}
          <div className="dark space-y-2">
            {sameByDesignRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-dashed border-foreground/20 p-4">
                <p className="text-sm font-medium text-foreground">{t(`comparison.${row.id}.label`)}</p>
                <p className="mt-1 text-sm text-muted-foreground italic">{t(`comparison.${row.id}.same`)}</p>
              </div>
            ))}
          </div>
        </div>

        {tier === "standard" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("interestTitle")}</CardTitle>
              <CardDescription>{t("interestDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {interestRegistered ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {t("interestConfirmed")}
                </p>
              ) : (
                <Button onClick={registerInterest} disabled={isPending}>
                  {t("interestButton")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
