import { notFound } from "next/navigation";
import { ExternalLink, MapPin, Wallet, Calendar, Users2 } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import {
  insufficientVerificationReason,
  isOpportunitySufficientlyVerified,
  resolveStoredEligibility,
  selectivityLabel,
  cycleStatusLabel,
} from "@/lib/opportunities/lifecycle";
import { matchTierKey } from "@/lib/opportunities/matching";
import { categoryLabel } from "@/lib/opportunities/labels";
import { OpportunityStandingBadge } from "@/features/opportunities/standing-badge";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { SourceBadge } from "@/components/oryn/source-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { NextMove } from "@/components/oryn/next-move";
import { OpportunityActions } from "@/features/opportunities/opportunity-actions";
import { formatMoney } from "@/lib/i18n/format";
import { urgencyLabel } from "@/components/oryn/deadline-badge";
import { FIXTURE_OPPORTUNITY_DETAIL, FIXTURE_OPPORTUNITY_MATCH, FIXTURE_OPPORTUNITY_SOURCES, FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";
import type { Locale } from "@/lib/i18n/config";
import type { ConfidenceLevel } from "@/components/oryn/confidence-indicator";

/**
 * Design-preview mirror of app/(app)/opportunities/[id]/page.tsx (2026-09-03) — the visual
 * QA pass couldn't reach this route at all (no fixture existed, no QA credentials
 * configured), and it's exactly where the cost caveat and eligibility-notes sections this
 * pass was asked to check actually live. Real Server Component queries `requireUser()`
 * and hits Supabase directly, neither of which a dev-only preview can do, so this
 * reproduces the same derivation logic against fixture data instead of calling the real
 * page — same approach the `counselor` preview already takes for the advisor pipeline.
 *
 * Mirrors, does not import, the real page's JSX: known, accepted drift risk if that page's
 * markup changes without this one being updated — flagged here rather than left implicit,
 * same as this file's sibling previews.
 *
 * i18n note: the real page pulls copy through next-intl (`getTranslations`); this preview
 * is a plain synchronous component (matching every other file in this directory) and
 * hardcodes the English strings instead of threading a translator through — visual review
 * only, not a locale check.
 */

const t = (key: string, values?: Record<string, string | number>): string => {
  const table: Record<string, string> = {
    orynsTake: "Oryn's take",
    fit: "Fit",
    selectivity: "Selectivity",
    urgency: "Urgency",
    cantConfirmPrefix: "Oryn can't confirm eligibility: ",
    deadlineLabel: "Deadline",
    currencyNotRecorded: " (currency not recorded)",
    financialAidAvailableSuffix: " · financial aid available",
    financialAidAvailable: "Financial aid available",
    agesRange: `Ages ${values?.min ?? ""}–${values?.max ?? ""}`,
    any: "any",
    gradesSuffix: ` · Grades: ${values?.grades ?? ""}`,
    whatYoullNeed: "What you'll need",
    eligibilityNotesHeading: "Eligibility notes",
    citizenshipLabel: `Citizenship: ${values?.text ?? ""}`,
    residencyLabel: `Residency: ${values?.text ?? ""}`,
    sourcesHeading: "Sources",
    visitOfficialPage: "Visit official page",
  };
  return table[key] ?? key;
};
const tTier = (key: string) => ({ exceptional: "Exceptional match", strong: "Strong match", worth_a_look: "Worth a look", low: "Low match" })[key] ?? key;
const tCard = (key: string, values?: Record<string, string | number>) =>
  ({ eligibilityUnknown: "Eligibility unknown", currentCycleLabelPrefix: `Current cycle: ${values?.label ?? ""}` })[key] ?? key;

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function fitLabel(score: number): string {
  return tTier(matchTierKey(score));
}

const TAKE_SENTENCES: Record<string, string> = {
  addresses_a_current_gap:
    "It targets an area where your profile currently has the least supporting evidence, so the same effort here moves your profile further than it would elsewhere.",
  matches_your_interests:
    "It sits in a field you've told Oryn you're pursuing, which makes it easier to sustain and more coherent alongside the rest of your record.",
};

export default function OpportunityDetailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const locale: Locale = "en";
  const opportunity = FIXTURE_OPPORTUNITY_DETAIL;
  const match = FIXTURE_OPPORTUNITY_MATCH;

  const eligibility = resolveStoredEligibility(opportunity, { eligible: match.eligible, notes: match.eligibility_notes });
  const needsVerification = !isOpportunitySufficientlyVerified(opportunity) && (!eligibility || (eligibility.eligible && !eligibility.notActionable));
  const daysUntilDeadline = opportunity.deadline ? differenceInCalendarDays(new Date(opportunity.deadline), new Date()) : null;
  const takeReasons = (match.reason_codes as string[]).map((code) => TAKE_SENTENCES[code]).filter((s): s is string => Boolean(s));
  const canGiveTake = Boolean(match) && eligibility.eligible && !needsVerification && takeReasons.length > 0;

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="max-w-3xl space-y-10">
        <PageHeader
          eyebrow={categoryLabel(opportunity.category, locale)}
          title={opportunity.title}
          description={opportunity.organization}
          action={
            <OpportunityActions
              opportunityId={opportunity.id}
              officialUrl={opportunity.official_url}
              applicationUrl={opportunity.application_url}
              initialStatus={null}
            />
          }
        />

        {canGiveTake ? (
          <NextMove
            surface
            locale={locale}
            eyebrow={t("orynsTake")}
            headline={fitLabel(match.match_score)}
            why={
              <div className="space-y-2.5">
                {takeReasons.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            }
            facts={[
              { term: t("fit"), value: fitLabel(match.match_score) },
              ...(selectivityLabel(opportunity.selectivity_tier, locale) ? [{ term: t("selectivity"), value: selectivityLabel(opportunity.selectivity_tier, locale)! }] : []),
              ...(daysUntilDeadline !== null && daysUntilDeadline >= 0 ? [{ term: t("urgency"), value: urgencyLabel(daysUntilDeadline, locale) }] : []),
            ]}
            footnote={eligibility.notes ? <><span className="font-medium text-ink-1">{t("cantConfirmPrefix")}</span>{eligibility.notes}</> : undefined}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {selectivityLabel(opportunity.selectivity_tier, locale) ? <StatusBadge label={selectivityLabel(opportunity.selectivity_tier, locale)!} tone="neutral" /> : null}
          <StatusBadge label={cycleStatusLabel(opportunity.cycle_status, locale)} tone="info" />
          <StatusBadge label={categoryLabel(opportunity.category, locale)} tone="brand" />
          <OpportunityStandingBadge eligible={eligibility.eligible} notActionable={eligibility.notActionable} needsVerification={needsVerification} locale={locale} />
          {eligibility.eligible && eligibility.notes ? <StatusBadge label={tCard("eligibilityUnknown")} tone="warning" /> : null}
        </div>

        {eligibility.notes && !canGiveTake ? <p className="rounded-lg bg-surface-tint px-4 py-3 text-sm leading-relaxed text-ink-2">{eligibility.notes}</p> : null}
        {needsVerification ? <p className="rounded-lg bg-surface-tint px-4 py-3 text-sm leading-relaxed text-ink-2">{insufficientVerificationReason(locale)}</p> : null}

        {opportunity.description ? <p className="text-muted-foreground">{opportunity.description}</p> : null}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {opportunity.deadline ? (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <span>
                {t("deadlineLabel")} <span className="font-medium">{opportunity.deadline}</span>
                {opportunity.current_cycle_label ? ` (${opportunity.current_cycle_label})` : ""}
              </span>
            </div>
          ) : null}
          {opportunity.country || opportunity.location_mode ? (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span>{[opportunity.country, opportunity.location_mode].filter(Boolean).join(" · ")}</span>
            </div>
          ) : null}
          {/* The cost caveat, oryn-a7's own named area — a real non-zero figure, currency
              deliberately unrecorded (opportunities has no currency column), plus the
              financial-aid suffix rendering alongside a real amount rather than only next
              to Free/$0. */}
          {opportunity.cost != null ? (
            <div className="flex items-center gap-2">
              <Wallet className="size-4 shrink-0 text-muted-foreground" />
              <span>
                {formatMoney(opportunity.cost, null)}
                <span className="text-muted-foreground">{t("currencyNotRecorded")}</span>
                {opportunity.financial_aid_available ? t("financialAidAvailableSuffix") : ""}
              </span>
            </div>
          ) : null}
          {opportunity.minimum_age != null || opportunity.maximum_age != null ? (
            <div className="flex items-center gap-2">
              <Users2 className="size-4 shrink-0 text-muted-foreground" />
              <span>{t("agesRange", { min: opportunity.minimum_age ?? t("any"), max: opportunity.maximum_age ?? t("any") })}</span>
            </div>
          ) : null}
        </div>

        {opportunity.application_requirements.length > 0 ? (
          <div className="space-y-2">
            <SectionHeader title={t("whatYoullNeed")} />
            <ul className="flex flex-wrap gap-1.5">
              {opportunity.application_requirements.map((req) => (
                <li key={req} className="rounded-full border px-3 py-1 text-xs">
                  {humanize(req)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Eligibility notes, the other area oryn-a7 named — a real residency restriction,
            not a placeholder sentence. */}
        {opportunity.citizenship_restrictions || opportunity.residency_restrictions ? (
          <div className="space-y-1 text-sm">
            <SectionHeader title={t("eligibilityNotesHeading")} />
            {opportunity.citizenship_restrictions ? <p className="text-muted-foreground">{t("citizenshipLabel", { text: opportunity.citizenship_restrictions })}</p> : null}
            {opportunity.residency_restrictions ? <p className="text-muted-foreground">{t("residencyLabel", { text: opportunity.residency_restrictions })}</p> : null}
          </div>
        ) : null}

        {opportunity.fields.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {opportunity.fields.map((field) => (
              <span key={field} className="rounded-full bg-brand-primary-subtle px-3 py-1 text-xs text-brand-primary-strong">
                {field}
              </span>
            ))}
          </div>
        ) : null}

        {FIXTURE_OPPORTUNITY_SOURCES.length > 0 ? (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("sourcesHeading")}</p>
            <div className="space-y-2">
              {FIXTURE_OPPORTUNITY_SOURCES.map((source) => (
                <SourceBadge
                  key={source.id}
                  sourceName={source.source_domain}
                  checkedAt={source.retrieved_at}
                  url={source.source_url}
                  confidence={source.confidence as ConfidenceLevel}
                  locale={locale}
                  sourceLabel="Source"
                  checkedLabel={(time) => `Checked ${time}`}
                  viewSourceLabel="View source"
                />
              ))}
            </div>
          </div>
        ) : null}

        {opportunity.official_url ? (
          <a href={opportunity.official_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline">
            {t("visitOfficialPage")} <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </PreviewShell>
  );
}
