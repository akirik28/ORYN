"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Zap, MessagesSquare, Flame, Palette } from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { registerUltraInterestAction } from "@/app/(app)/settings/actions";
import { TIER_COMPARISON_ROWS } from "@/lib/tier/comparison";
import { formatNumber, formatTokenCount } from "@/lib/i18n/format";
import { UltraFeatureMarquee, type UltraFeatureCardData } from "@/features/settings/ultra-feature-marquee";
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
 * table's own column header) — 2026-09-02 fix, still holds: that gradient reads unreadable
 * against this page's own amber ground, and the safe pattern is flame on decoration, never
 * on the thing carrying meaning. Both stay plain text, matching `standardName`'s own
 * already-safe treatment.
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
    <div className="max-w-3xl space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <CardHeader>
          <CardDescription>{t("currentPlanLabel")}</CardDescription>
          <CardTitle className="text-2xl">{tier === "ultra" ? t("ultraName") : t("standardName")}</CardTitle>
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

      <div className="space-y-3">
        <h2 className="font-semibold">{t("comparisonTitle")}</h2>
        {/* whitespace-normal on every cell, overriding Table's own shadcn default
            (whitespace-nowrap, meant for short data values): this table's standard/ultra
            columns hold full sentences, and nowrap forced them onto one line each, clipped
            at the card's own edge rather than wrapped -- reported live alongside the
            tier-grad-text bug documented above, same urgent pass. */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-normal">{t("comparisonFeatureColumn")}</TableHead>
              <TableHead className="whitespace-normal">{t("standardName")}</TableHead>
              <TableHead className="whitespace-normal">{t("ultraName")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIER_COMPARISON_ROWS.map((row) =>
              row.kind === "sameByDesign" ? (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-normal font-medium">{t(`comparison.${row.id}.label`)}</TableCell>
                  <TableCell colSpan={2} className="whitespace-normal text-muted-foreground italic">
                    {t(`comparison.${row.id}.same`)}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-normal font-medium">{t(`comparison.${row.id}.label`)}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {t(`comparison.${row.id}.standard`, comparisonValues(row.id, "standard"))}
                  </TableCell>
                  <TableCell className="whitespace-normal">{t(`comparison.${row.id}.ultra`, comparisonValues(row.id, "ultra"))}</TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
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
  );
}
