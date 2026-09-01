import Link from "next/link";
import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Compass, FileText, Landmark, Minus, TrendingUp } from "lucide-react";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { SectionHeader } from "@/components/oryn/section-header";
import { InsightCard } from "@/components/oryn/insight-card";
import { NextMove } from "@/components/oryn/next-move";
import { EmptyState } from "@/components/oryn/empty-state";
import { ErrorState } from "@/components/oryn/error-state";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { ButtonLink } from "@/components/ui/button-link";
import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { CounselorWeekFallback } from "@/features/dashboard/counselor-week-fallback";
import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { ProfileSignal } from "@/features/dashboard/profile-signal";
import { OutlookBadge } from "@/features/universities/outlook-badge";
import { computeDashboardHeroState } from "@/lib/scoring/dashboard-hero";
import { signalCoverage, type DimensionSignal } from "@/lib/scoring/signal";
import { describeProfileChange, type ProfileChange } from "@/lib/scoring/change";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import type { getUpcomingDeadlines, DeadlineSource } from "@/lib/deadlines/upcoming";
import type { WeeklyPlanWithActions } from "@/lib/plan/persist";
import type { CounselorRecommendation } from "@/lib/counselor";
import type { ProfileDimension } from "@/types/database";

const DEADLINE_SOURCE_ICONS: Record<DeadlineSource, typeof FileText> = {
  application: FileText,
  opportunity: Compass,
  university: Landmark,
};

export interface DashboardViewProps {
  displayName: string;
  greeting: string;
  /** The student's resolved locale (lib/i18n/locale.ts). Drives the hero's own copy and
   *  Profile dimensions directly (both still the older inline `tr ? … : …` pattern, from
   *  before this file's own next-intl namespace existed) — the rest of this file's static
   *  copy (This week, Due soon, One thing not to do, University outlook, Opportunities)
   *  now reads from the `dashboard` catalog namespace via `getTranslations`, which resolves
   *  the request-scoped locale itself rather than needing this prop threaded to it. Both
   *  mechanisms trace back to the same lib/i18n/locale.ts resolution, so they can't disagree
   *  — kept as two patterns in one file rather than a forced rewrite of the working hero
   *  code, per the project's own catalogs-for-request-tree-copy convention. */
  locale?: Locale;
  biggestGap: { dimension: ProfileDimension; score: number } | null;
  /** Per-dimension movement since the last snapshot. Replaced the single aggregate delta —
   * see lib/scoring/change.ts for why a mean of nine dimensions isn't something to act on. */
  profileChange: ProfileChange;
  /** Qualitative per-dimension read (lib/scoring/signal.ts). Never rendered as percentages. */
  profileSignal: DimensionSignal[];
  weeklyPlan: WeeklyPlanWithActions | null;
  planError: "not_configured" | "failed" | null;
  /** Counselor Core's deterministic "do" candidates (B4) — rendered in place of the AI
   * weekly plan whenever that plan is empty/unavailable, so "This week" always has a real,
   * useful answer without requiring an AI call. See features/dashboard/counselor-week-fallback.tsx. */
  counselorThisWeek: CounselorRecommendation[];
  avoidRecommendation: { title: string; reason: string } | null;
  upcomingDeadlines: Awaited<ReturnType<typeof getUpcomingDeadlines>>;
  targetUniversities: Awaited<ReturnType<typeof getTargetUniversitiesWithDetails>>;
  opportunityPreview: { title: string; matchScore: number; deadline: string | null }[];
  /** False only when refreshOpportunityMatches skipped its write this render (the admin
   * client wasn't configured) -- never for "genuinely zero matches," which is its own,
   * non-stale outcome. AGENTS.md Phase 45 / Rule 4: never let a page imply this preview
   * is current when it might not be. */
  opportunityMatchesRefreshed: boolean;
}

// glass-card chrome shared by every panel below the hero — literal source values
// (App.tsx `HomeScreen`, 2026-08-30 export): translucent white over the page's ambient
// tint, 22px blur, 20px radius. Kept as inline style rather than a Tailwind class because
// the blur/opacity pair doesn't have a clean utility equivalent at these exact values.
const glassCard: CSSProperties = {
  background: "rgba(255,255,255,0.42)",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.65)",
};

export async function DashboardView({
  displayName,
  greeting,
  locale = DEFAULT_LOCALE,
  biggestGap,
  profileChange,
  profileSignal,
  weeklyPlan,
  planError,
  counselorThisWeek,
  avoidRecommendation,
  upcomingDeadlines,
  targetUniversities,
  opportunityPreview,
  opportunityMatchesRefreshed,
}: DashboardViewProps) {
  const t = await getTranslations("dashboard");
  const hasAiPlan = Boolean(weeklyPlan && weeklyPlan.actions.length > 0);
  const usingCounselorFallback = !hasAiPlan && counselorThisWeek.length > 0;
  // See lib/scoring/dashboard-hero.ts for why this needs three states, not two — a rich
  // profile whose literal weakest dimension happens to be unassessed used to render the
  // same "nothing recorded" copy as a genuinely empty profile (live Gate 2 finding,
  // 2026-08-24, docs/handoffs/gate2-ai-counselor-report-2026-08-24.md §18).
  const heroState = computeDashboardHeroState(profileSignal, biggestGap, locale);
  // Read once here rather than inside the hero branch: the `rich_unclaimable` copy has to
  // say how many areas are still unevidenced, and that count is the difference between a
  // hedge the student can act on and one that just sounds evasive.
  const coverage = signalCoverage(profileSignal);
  const changeSentence = describeProfileChange(profileChange, locale);
  const tr = locale === "tr";

  return (
    <div>
      {/* Dark hero (Figma source App.tsx `HomeScreen`) — scoped `.dark` so NextMove's
          ink-token text resolves light-on-dark automatically, same mechanism as the
          landing page. The real three-state hero copy/logic is untouched; only its
          container is new. Contained within the page's own measure (rounded card) rather
          than the source's full viewport bleed — the shared (app) layout's content column
          already has its own horizontal padding, and breaking out of it here would need to
          change that column for every other page too. */}
      {/* Three nested paddings stack up here — the shell's column, this card, and the glass
          panel inside it. At the desktop values that left ~240px of measure on a 375px
          phone, so each one steps down below `sm` (founder report, 2026-08-31). */}
      <div
        className="relative overflow-hidden rounded-[28px] px-4 py-8 sm:px-6 sm:py-11 md:px-10 md:py-14"
        style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-20 size-[300px] rounded-full"
          style={{ background: "rgba(61,53,232,0.12)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-10 size-[200px] rounded-full"
          style={{ background: "rgba(107,100,240,0.08)" }}
        />
        {/* text-foreground here, not just `dark`: NextMove's headline has no color class of
            its own (it inherits), so without re-establishing the base color at this scope
            it kept the light-mode ink color cascaded down from body — dark ink on a dark
            purple card, nearly unreadable. Same fix as the landing page's dark wrapper. */}
        <div className="dark relative mx-auto max-w-[860px] text-foreground">
          <p lang={locale} className="text-sm text-white/60">
            {greeting}, {displayName}.
          </p>
          <div
            className="mt-6 rounded-[20px] p-5 sm:p-7 md:p-8"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(12px)" }}
          >
            {heroState.kind === "claimable" ? (
              <NextMove
                size="hero"
                as="h1"
                locale={locale}
                eyebrow={tr ? "Sıradaki adımın" : "Your next move"}
                headline={
                  tr ? (
                    <span lang="tr">Şu an en belirgin boşluğun: {heroState.gapLabel}.</span>
                  ) : (
                    <>Your clearest gap right now is {heroState.gapLabel!.toLowerCase()}.</>
                  )
                }
                why={
                  tr ? (
                    <span lang="tr">
                      Oryn seni diğer öğrencilerle değil, kendi alanlarınla kıyaslar. Kaydettiğin her şey arasında en
                      az kanıta sahip olan alan burası — yani aynı sürede harcanan emeğin profilini en çok
                      değiştireceği yer de burası.
                    </span>
                  ) : (
                    <>
                      Oryn compares your dimensions against each other, not against other students. Across
                      everything you&apos;ve recorded, this is the area with the least supporting evidence — so
                      it&apos;s where the same hours of work change your profile most.
                    </>
                  )
                }
                evidence={heroState.evidence}
                action={
                  tr ? (
                    <span lang="tr" className="contents">
                      <ButtonLink href="/advisor">
                        Bunun için bir plan oluştur <ArrowRight className="size-4" />
                      </ButtonLink>
                      <ButtonLink href="/profile" variant="outline">
                        Tüm tabloyu gör
                      </ButtonLink>
                    </span>
                  ) : (
                    <>
                      <ButtonLink href="/advisor">
                        Build a plan for this <ArrowRight className="size-4" />
                      </ButtonLink>
                      <ButtonLink href="/profile" variant="outline">
                        See the full picture
                      </ButtonLink>
                    </>
                  )
                }
              />
            ) : heroState.kind === "rich_unclaimable" ? (
              /* This state does NOT mean "your profile is balanced", and it must never say
                 so. `computeDashboardHeroState` reaches it when the profile has real signal
                 but the *lowest-scoring* dimension is one Oryn has not assessed — which is
                 exactly what this file's own test calls it ("rich profile whose weakest
                 dimension is unassessed"). On the real call path it can mean nothing else:
                 `app/(app)/dashboard/page.tsx` builds `profileSignal` and `biggestGap` from
                 the same `scores` rows, and `rankDimensionGaps` sorts ascending, so a
                 profile with every dimension assessed always names its weakest one and
                 lands in `claimable` instead.

                 The previous copy — "none of them is clearly behind the rest, that's a good
                 sign" — described a balanced profile, a situation that cannot produce this
                 state. On a real account it sat directly above a signal panel reading
                 Awards 100 / Leadership "Nothing yet" and a weekly plan reading
                 "leadership, research, entrepreneurship and community impact are all near
                 zero", while the Counselor page reported those same gaps correctly. Three
                 surfaces, one set of scores, and Home was the one contradicting the others
                 (founder account, 2026-08-31).

                 What is true here is narrower and more useful: Oryn cannot rank a gap it
                 has no evidence for, so the honest move is to say which areas are missing
                 and send the student to fill them in — not to reassure. */
              // Turkish here is not a translation exercise — see the block comment above:
              // this copy exists specifically to admit a limit rather than claim balance,
              // and a Turkish version that reads more confident than the English would undo
              // the entire point of the fix that comment documents. "can't name...yet" is
              // carried by "henüz...söyleyemiyor" (not-yet-able-to-say) — the same admission
              // of a present limitation, not a softened or confident restatement.
              <NextMove
                size="hero"
                as="h1"
                locale={locale}
                eyebrow={tr ? "Şu anki durumun" : "Where you stand"}
                headline={tr ? "Oryn henüz en belirgin boşluğunu söyleyemiyor." : "Oryn can't name your clearest gap yet."}
                why={
                  coverage.awaitingEvidence > 0 ? (
                    tr ? (
                      <span lang="tr">
                        Şu an en zayıf görünen alan, Oryn&apos;ın karar verecek kadar kanıta sahip olmadığı bir alan —
                        bu yüzden onu boşluğun olarak göstermek tahmin olurdu. {coverage.total} alandan{" "}
                        {coverage.awaitingEvidence} tanesi bu durumda; birini bile doldurmak bunu gerçek bir cevaba
                        dönüştürür.
                      </span>
                    ) : (
                      <>
                        The area that currently looks weakest is one Oryn has too little evidence to judge,
                        so ranking it as your gap would be guessing.{" "}
                        {coverage.awaitingEvidence} of {coverage.total} areas are in that position — filling
                        even one of them in is what turns this into a real answer.
                      </>
                    )
                  ) : tr ? (
                    <span lang="tr">
                      Oryn alanlarını birbiriyle kıyaslar; şu anda en zayıf olanı, boşluğun diye adlandıracak kadar
                      güvenle konumlandıramıyor.
                    </span>
                  ) : (
                    <>
                      Oryn compares your dimensions against each other, and right now it can&apos;t place
                      the weakest one confidently enough to name it as your gap.
                    </>
                  )
                }
                evidence={heroState.evidence}
                action={
                  tr ? (
                    <span lang="tr" className="contents">
                      <ButtonLink href="/profile">
                        Eksikleri ekle <ArrowRight className="size-4" />
                      </ButtonLink>
                      <ButtonLink href="/advisor" variant="outline">
                        Danışmanınla konuş
                      </ButtonLink>
                    </span>
                  ) : (
                    <>
                      <ButtonLink href="/profile">
                        Add what&apos;s missing <ArrowRight className="size-4" />
                      </ButtonLink>
                      <ButtonLink href="/advisor" variant="outline">
                        Talk to your counselor
                      </ButtonLink>
                    </>
                  )
                }
              />
            ) : (
              <NextMove
                size="hero"
                as="h1"
                locale={locale}
                eyebrow={tr ? "Başlarken" : "Getting started"}
                headline={
                  tr ? "Oryn'a neler yaptığını anlat, o da sana sırada ne olduğunu söylesin." : "Tell Oryn what you've done, and it will tell you what to do next."
                }
                why={
                  tr
                    ? "Oryn, profilinin nerede en zayıf olduğunu bulmak için derslerini, aktivitelerini, projelerini ve ödüllerini okur. Şu anda arkasında durabileceği bir şey söylemesi için yeterli kayıt yok — bu Oryn'ın bilgisindeki bir eksiklik, senin hakkında bir yargı değil."
                    : "Oryn reads your courses, activities, projects and awards to find where your profile is thinnest. Right now there isn't enough recorded for it to say anything it could stand behind — that's a gap in what Oryn knows, not a judgement about you."
                }
                action={
                  <ButtonLink href="/profile">
                    {tr ? "Yolculuğuna başla" : "Start your journey"} <ArrowRight className="size-4" />
                  </ButtonLink>
                }
              />
            )}
            {changeSentence ? (
              <p
                className={`mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-sm ${
                  profileChange.improved.length > 0 ? "text-[#A0F0C0]" : "text-white/50"
                }`}
              >
                {profileChange.improved.length > 0 ? (
                  <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Minus className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span lang={locale}>{changeSentence}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Light content — glass-card panels over the shared shell's AmbientBlobs
          ((app)/layout.tsx now renders these once for every page, not per-page). */}
      <div className="relative z-[1] -mx-4 px-4 pt-10 pb-4 md:-mx-8 md:px-8">
        <div className="mx-auto max-w-[860px] space-y-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
            <section style={glassCard} className="glass-card min-w-0 p-6 md:p-7">
              <SectionHeader
                title={t("focusThisWeek")}
                description={
                  weeklyPlan?.plan.summary ??
                  (usingCounselorFallback ? t("counselorFallbackDescription") : undefined)
                }
              />
              <div className="mt-6">
                {hasAiPlan ? (
                  <WeeklyFocus actions={weeklyPlan!.actions} />
                ) : usingCounselorFallback ? (
                  <CounselorWeekFallback actions={counselorThisWeek} locale={locale} />
                ) : (
                  <EmptyState
                    icon={Compass}
                    title={
                      planError === "not_configured"
                        ? t("planNotConfiguredTitle")
                        : planError === "failed"
                          ? t("planFailedTitle")
                          : t("noPlanTitle")
                    }
                    description={
                      planError === "not_configured"
                        ? t("planNotConfiguredDescription")
                        : planError === "failed"
                          ? t("planFailedDescription")
                          : t("noPlanDescription")
                    }
                    action={
                      planError !== "not_configured" ? (
                        <GeneratePlanButton label={t("generateMyPlan")} pendingLabel={t("thinking")} hasExistingPlan={false} />
                      ) : undefined
                    }
                  />
                )}
              </div>
            </section>

            <aside className="min-w-0 space-y-8">
              <section style={glassCard} className="glass-card-offset p-6">
                {/* showScores=true: the source's Home shows numeric bars, and this component
                    already supports a quiet numeric footnote beside the qualitative read for
                    exactly this case (see features/dashboard/profile-signal.tsx) — the word
                    stays primary, the score is real data, not fabricated to match source. */}
                <ProfileSignal
                  signal={profileSignal}
                  showScores
                  heading={tr ? "Profil boyutları" : "Profile dimensions"}
                  locale={locale}
                />
              </section>

              {upcomingDeadlines.length > 0 ? (
                <section style={glassCard} className="glass-card-fast p-6" aria-label={t("dueSoon")}>
                  <Eyebrow locale={locale}>{t("dueSoon")}</Eyebrow>
                  <ul className="mt-5 space-y-0">
                    {upcomingDeadlines.map((deadline) => {
                      const SourceIcon = DEADLINE_SOURCE_ICONS[deadline.source];
                      return (
                        <li key={deadline.id} className="border-b border-border/60 last:border-0">
                          <Link
                            href={deadline.href}
                            className="group flex items-start justify-between gap-3 py-3 transition-colors hover:text-brand-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          >
                            <span className="flex min-w-0 items-start gap-2.5">
                              <SourceIcon className="mt-0.5 size-3.5 shrink-0 text-ink-4" aria-hidden="true" />
                              <span className="min-w-0 text-sm leading-snug text-ink-2 group-hover:text-brand-primary">
                                {deadline.title}
                              </span>
                            </span>
                            <DeadlineBadge date={deadline.date} locale={locale} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </aside>
          </div>

          {avoidRecommendation ? (
            <InsightCard variant="avoid" eyebrow={t("oneThingNotToDo")} title={avoidRecommendation.title} locale={locale}>
              {avoidRecommendation.reason}
            </InsightCard>
          ) : null}

          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            <section style={glassCard} className="glass-card-offset2 p-6">
              <SectionHeader
                title={t("universityOutlook")}
                action={
                  <Link href="/universities" className="text-sm text-brand-primary underline-offset-4 hover:underline">
                    {t("explore")}
                  </Link>
                }
              />
              {targetUniversities.length > 0 ? (
                <ul className="mt-5">
                  {targetUniversities.map((target) => (
                    <li
                      key={target.id}
                      className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
                    >
                      <span className="min-w-0 truncate text-sm text-ink-2">
                        {target.university?.name ?? t("unknownUniversity")}
                      </span>
                      <OutlookBadge outlook={target.outlook} locale={locale} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-2">
                  {t("noTargetUniversitiesPrefix")}{" "}
                  <Link href="/universities" className="text-brand-primary underline-offset-4 hover:underline">
                    {t("exploreUniversities")}
                  </Link>{" "}
                  {t("noTargetUniversitiesSuffix")}
                </p>
              )}
            </section>

            <section style={glassCard} className="glass-card p-6">
              <SectionHeader
                title={t("opportunities")}
                action={
                  <Link href="/opportunities" className="text-sm text-brand-primary underline-offset-4 hover:underline">
                    {t("browse")}
                  </Link>
                }
              />
              {!opportunityMatchesRefreshed ? (
                <div className="mt-5">
                  <ErrorState description={t("couldntRefreshMatches")} />
                </div>
              ) : null}
              {opportunityPreview.length > 0 ? (
                <ul className="mt-5">
                  {opportunityPreview.map((opp) => (
                    <li key={opp.title} className="border-b border-border/60 py-3 last:border-0">
                      <p className="text-sm leading-snug text-ink-2">{opp.title}</p>
                      <p className="mt-1.5 flex items-center gap-3">
                        <span className="text-xs text-ink-3 tabular-nums">{t("matchPercent", { score: opp.matchScore })}</span>
                        {opp.deadline ? <DeadlineBadge date={opp.deadline} locale={locale} /> : null}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-2">{t("noOpportunityMatches")}</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
