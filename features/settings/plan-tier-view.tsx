"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { registerUltraInterestAction } from "@/app/(app)/settings/actions";
import { TIER_COMPARISON_ROWS } from "@/lib/tier/comparison";
import type { PlanTier } from "@/types/database";

/**
 * The plan page. Two hard constraints from the assignment, both load-bearing on this
 * component's shape, not just its copy:
 *
 * 1. **No buy button.** There is no payments integration (migration 0089's own header),
 *    so nothing here can look like a checkout. The only interactive control is
 *    `registerUltraInterestAction` — a plain analytics event, gated behind its own honest
 *    copy (`interestDescription`), never dressed up as an upgrade flow. An Ultra student
 *    sees no call to action at all: they have nothing to register interest in.
 * 2. **No invented capabilities.** The comparison table is driven entirely by
 *    `TIER_COMPARISON_ROWS` (lib/tier/comparison.ts) plus matching catalog entries —
 *    this component has no hardcoded row content, and each `sameByDesign` row (currently
 *    two: the weekly plan's 3-action cap, the research generator's 3-idea cap) renders as
 *    one shared value rather than two coincidentally-matching ones, so "kept equal on
 *    purpose" reads as a decision, not an unfinished row.
 *
 * **2026-09-02, price added.** The founder set 399.99 TL/month with a first-week-free
 * trial; both facts live in `interestDescription` itself, right beside the existing "not
 * available to buy yet" disclosure — not a separate price element, and no code change here.
 * A concrete price next to a button that can't take money is the fake-button case unless
 * the state is said plainly in the same breath, which the existing copy already did; this
 * pass extends that one string rather than adding a second voice next to it, same
 * discipline as the essay-outline note earlier the same night. No urgency language on the
 * trial (no countdown, no "limited time") — the sameByDesign rows below aren't the only
 * place this product deliberately stays calm instead of pushing.
 *
 * Every real account is standard-tier right now (migration 0089 unapplied — confirmed live
 * against `information_schema.columns`, not assumed from the migration file) and there is
 * currently no in-product way to become Ultra at all. Silence about that would read as
 * either broken or a tease, so the page description says so plainly up top rather than
 * making a curious student scroll to the interest card to learn it.
 *
 * Only two tiers are rendered because `PlanTier` only has two values — there is no
 * "unknown/unreadable" state here on purpose. `resolvePlanTier` (lib/tier/plan-tier.ts)
 * already explains why on the read path: `select("*")` on a table missing `plan_tier`
 * omits the field rather than erroring, so an unapplied migration is indistinguishable
 * from a genuine standard-tier row, by design — there is no third state to build a UI for.
 *
 * `tier-glow-sm` (app/globals.css's Ultra section) is applied to the current-plan badge
 * unconditionally — it only renders as anything but a no-op once `[data-tier="ultra"]` is
 * set on `<html>`, which `features/app-shell/ultra-ambient.tsx` already does for the
 * current student's own real tier. No per-page tier check needed for the CSS to be correct.
 *
 * **2026-09-02, urgent fix, live on the founder's own screen: `tier-grad-text` removed from
 * both "Ultra" labels (the current-plan `CardTitle` and the table's own column header).**
 * That class paints the flame gradient (amber → orange → red) through transparent glyphs —
 * fine choice when this page's background was lavender, unreadable once the Ultra page
 * ground itself turned amber (`docs/hardcoded-color-sweep-2026-09-02.md`'s page-ground
 * work, landed after this file was first written): amber text on an amber ground. The
 * column header is worse than the card title — a 2xl heading has enough mass to half-survive,
 * a table header does not, and "ultra yazısı gözükmüyor" was reported against exactly that
 * cell. Both are now plain text, matching `standardName`'s own already-safe treatment
 * exactly, rather than a new custom color computed against one specific ground — the
 * general lesson (oryn-60's original warning, oryn-4e's contrast method): a gradient tuned
 * against one background doesn't stay safe once the background it sits on changes
 * underneath it, and the safe pattern is flame on decoration, never on the thing carrying
 * meaning — a plan name and a column header are both meaning. The Ultra *badge* two lines
 * below (`tier-glow-sm` on a plain `variant="secondary"` background, not gradient-filled
 * text) is unaffected and stays as the page's one remaining Ultra-tier visual cue here.
 */
export function PlanTierView({ tier }: { tier: PlanTier }) {
  const t = useTranslations("settings.plan");
  const [interestRegistered, setInterestRegistered] = useState(false);
  const [isPending, startTransition] = useTransition();

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
    <div className="max-w-xl space-y-8">
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

      <div className="space-y-3">
        <h2 className="font-semibold">{t("comparisonTitle")}</h2>
        {/* whitespace-normal on every cell, overriding Table's own shadcn default
            (whitespace-nowrap, meant for short data values): this table's standard/ultra
            columns hold full sentences, and nowrap forced them onto one line each, clipped
            at the card's own max-w-xl edge rather than wrapped -- reported live alongside
            the tier-grad-text bug above, same urgent pass. */}
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
                  <TableCell className="whitespace-normal text-muted-foreground">{t(`comparison.${row.id}.standard`)}</TableCell>
                  <TableCell className="whitespace-normal">{t(`comparison.${row.id}.ultra`)}</TableCell>
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
