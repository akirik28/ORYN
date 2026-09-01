import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass, TriangleAlert } from "lucide-react";
import { SectionHeader } from "@/components/oryn/section-header";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { InsightCard } from "@/components/oryn/insight-card";
import { EmptyState } from "@/components/oryn/empty-state";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/config";
import type { CounselorRecommendation, CounselorResult } from "@/lib/counselor";

/** Same TS2589-adjacent workaround as every other file in this i18n effort that passes a
 * next-intl translator across a function boundary (see app/(app)/universities/[id]/page.tsx's
 * own `Translator` alias) — the real type's `key` is a strict per-namespace literal union,
 * which can't be assigned to a plain `(key: string) => string` parameter without this. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * One recommendation, argued rather than listed. UI-V3 § 14 asks the counselor to show its
 * reasoning structure, so `why` — the evidence the deterministic pipeline actually
 * attached — is given its own labelled block rather than being greyed-out subtext under
 * the title. A left rail, not an individual bordered box, so a group of these still reads
 * as one ranked argument rather than several identical panels — the group itself is now
 * boxed one level up (2026-08-30, explicit founder direction: every block on this page
 * should sit in a visible frame), so the rail is doing that same "these belong together"
 * job inside a card instead of on bare background.
 */
function RecommendationCard({
  recommendation,
  index,
  locale,
  t,
}: {
  recommendation: CounselorRecommendation;
  index: number;
  locale: Locale;
  /** Scoped to advisor.priorities. */
  t: Translator;
}) {
  const unknownEligibility = recommendation.eligibility.verdict === "unknown";
  return (
    <li className="relative py-5 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-px before:rounded-full before:bg-border before:content-['']">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-baseline gap-2.5 text-balance">
          <span aria-hidden="true" className="shrink-0 text-xs text-ink-4 tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <span className="font-medium text-ink-1">{recommendation.title}</span>
        </p>
        {recommendation.deadline ? <DeadlineBadge date={recommendation.deadline.date} className="shrink-0" locale={locale} /> : null}
      </div>

      {recommendation.why.length > 0 ? (
        <div className="mt-3.5">
          <Eyebrow rule={false} locale={locale}>{t("whyThis")}</Eyebrow>
          <ul className="mt-2 max-w-2xl space-y-1.5 text-sm leading-relaxed text-ink-2">
            {recommendation.why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-ink-3">
        {t("impactEffort", { impact: t(`level.${recommendation.impact}`), effort: t(`level.${recommendation.effort}`) })}
      </p>

      {unknownEligibility && recommendation.warnings[0] ? (
        <p className="mt-2.5">
          {/* wrap: this caveat is a sentence, not a status word — as a nowrap pill it ran
              off the right edge of a phone screen and was clipped by the shell. */}
          <StatusBadge label={recommendation.warnings[0]} tone="warning" icon={TriangleAlert} wrap />
        </p>
      ) : null}

      <div className="mt-4">
        <Button variant="outline" size="sm" render={<Link href={recommendation.nextAction.href} />} nativeButton={false}>
          {recommendation.nextAction.label}
        </Button>
      </div>
    </li>
  );
}

/**
 * Counselor Core Phase L — "Your priorities" panel on the Advisor page
 * (docs/counselor-core-plan.md §12). Purely presentational: every fact shown here already
 * came from the deterministic pipeline (lib/counselor/pipeline.ts) with real evidence
 * attached — no scores, no internal breakdown, no invented copy.
 */
export async function CounselorPriorities({ result }: { result: CounselorResult }) {
  const locale = await resolveLocale();
  const t = (await getTranslations("advisor.priorities")) as Translator;
  const doItems = result.recommendations.filter((r) => r.recommendationClass === "do");
  const considerItems = result.recommendations.filter((r) => r.recommendationClass === "consider");
  const avoidItem = result.recommendations.find((r) => r.recommendationClass === "avoid_for_now");

  if (!result.profileReadiness.sufficientForJudgment) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Compass}
          title={t("needsMoreInfoTitle")}
          description={t("needsMoreInfoDescription", { percent: result.profileReadiness.completenessPercent })}
          action={
            <Button size="sm" render={<Link href="/profile" />} nativeButton={false}>
              {t("completeProfile")}
            </Button>
          }
        />
        {doItems.length > 0 ? (
          <div className="glass-card-fast rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
            <ul>
              {doItems.map((r, i) => (
                <RecommendationCard key={r.id} recommendation={r} index={i + 1} locale={locale} t={t} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (result.recommendations.length === 0) {
    return <EmptyState icon={Compass} title={t("noRecommendationsTitle")} description={t("noRecommendationsDescription")} />;
  }

  return (
    <div className="space-y-6">
      {doItems.length > 0 ? (
        <section className="glass-card space-y-3 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
          <SectionHeader title={t("yourPriorities")} />
          <ul>
            {doItems.map((r, i) => (
              <RecommendationCard key={r.id} recommendation={r} index={i + 1} locale={locale} t={t} />
            ))}
          </ul>
        </section>
      ) : null}

      {avoidItem ? (
        <div className="glass-card-offset rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
          <InsightCard variant="avoid" eyebrow={t("oneThingNotToDo")} title={avoidItem.title} locale={locale}>
            {avoidItem.why[0]}
          </InsightCard>
        </div>
      ) : null}

      {considerItems.length > 0 ? (
        <section className="glass-card-offset2 space-y-3 rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
          <SectionHeader title={t("worthConsidering")} />
          <ul>
            {considerItems.map((r, i) => (
              <RecommendationCard key={r.id} recommendation={r} index={i + 1} locale={locale} t={t} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
