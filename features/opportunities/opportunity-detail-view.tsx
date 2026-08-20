import { differenceInCalendarDays } from "date-fns";
import { Calendar, Clock, DollarSign, MapPin, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { SourceBadge } from "@/components/oryn/source-badge";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DeadlineBadge } from "@/components/oryn/deadline-badge";
import { InsightCard } from "@/components/oryn/insight-card";
import { OpportunityActions } from "@/features/opportunities/opportunity-actions";
import { CATEGORY_ICON, humanizeCategory } from "@/lib/opportunities/category-visuals";
import { tierFor } from "@/lib/opportunities/match-tier";
import { formatCurrency, formatDate, formatDuration, parseDbDate } from "@/lib/i18n/format";
import type { ConfidenceLevel } from "@/components/oryn/confidence-indicator";
import type { Opportunity, OpportunityMatch, OpportunitySource, SavedOpportunityStatus } from "@/types/database";

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const SELECTIVITY_LABEL: Partial<Record<Opportunity["selectivity_tier"], string>> = {
  extremely_selective: "Extremely selective",
  highly_selective: "Highly selective",
  selective: "Selective",
  competitive_award: "Competitive award",
  open_enrollment: "Open enrollment",
};

const CYCLE_STATUS_BADGE: Partial<Record<Opportunity["cycle_status"], { label: string; tone: StatusTone }>> = {
  upcoming: { label: "Opens soon", tone: "info" },
  closed: { label: "Closed for this cycle", tone: "neutral" },
  date_not_announced: { label: "Next dates not announced", tone: "neutral" },
  historical: { label: "Historical — not currently running", tone: "warning" },
  discontinued: { label: "Discontinued", tone: "error" },
  unverified: { label: "Verification pending", tone: "warning" },
};

// Only the states worth interrupting a student for — "unverified" (the common default for
// a freshly-ingested record) deliberately stays silent rather than badging most opportunities
// with a discouraging label, same convention `selectivity_tier: "unknown"` and
// `cycle_status: "open"` already use elsewhere on this page. Never invent a "Verified" badge
// for a state that isn't actually `verified_current` — that is the one honest claim.
const VERIFICATION_BADGE: Partial<Record<Opportunity["verification_state"], { label: string; tone: StatusTone }>> = {
  verified_current: { label: "Verified", tone: "success" },
  verified_historical: { label: "Verified for a past cycle", tone: "neutral" },
  verified_derived: { label: "Derived from other verified data", tone: "neutral" },
  conflicting: { label: "Conflicting information found", tone: "warning" },
};

/**
 * Presentational — every field is read directly from already-fetched rows, no data fetching
 * of its own, so `app/(app)/opportunities/[id]/page.tsx` stays a thin fetch-and-render layer
 * (mirrors `features/dashboard/dashboard-view.tsx`'s split) and this can be mounted with
 * fixture data in `app/(dev-preview)/design-preview` for real visual QA without a live
 * Supabase session.
 *
 * Every section is conditional on real data being present — a sparse record loses sections
 * rather than rendering them with placeholder/invented content (AGENTS.md Rule 4).
 */
export function OpportunityDetailView({
  opportunity,
  match,
  savedStatus,
  sources,
}: {
  opportunity: Opportunity;
  match: OpportunityMatch | null;
  savedStatus: SavedOpportunityStatus | null;
  sources: OpportunitySource[];
}) {
  const CategoryIcon = CATEGORY_ICON[opportunity.category];
  const tier = match ? tierFor(match.match_score) : null;
  const reasonCodes = (match?.reason_codes as string[] | null) ?? [];
  const daysUntilDeadline = opportunity.deadline ? differenceInCalendarDays(parseDbDate(opportunity.deadline), new Date()) : null;
  const showDeadlineUrgency = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14;
  const duration = formatDuration(opportunity.start_date, opportunity.end_date);
  const format = opportunity.location_mode ? humanize(opportunity.location_mode) : opportunity.remote_allowed ? "Remote / online" : null;
  const verificationBadge = VERIFICATION_BADGE[opportunity.verification_state];

  const hasAgeOrGrade = opportunity.minimum_age != null || opportunity.maximum_age != null || opportunity.eligible_grades.length > 0;
  const hasCitizenship = opportunity.eligible_citizenships.length > 0 || Boolean(opportunity.citizenship_restrictions);
  const hasResidency = opportunity.eligible_countries.length > 0 || Boolean(opportunity.residency_restrictions);
  const hasEligibilitySection = hasAgeOrGrade || hasCitizenship || hasResidency || opportunity.application_requirements.length > 0;
  const hasProgramSection = Boolean(opportunity.description) || opportunity.fields.length > 0;
  const hasTrustSection = sources.length > 0 || Boolean(opportunity.source_url);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Hero — the one rounded-3xl element on this page (design-system.md: "at most one
          per screen, a signal not a size utility"). No image field exists anywhere in the
          opportunity/organizer schema (audited against opportunities, opportunity_sources,
          canonical_entities) — the category icon-on-gradient band is the honest fallback,
          same tier university-card.tsx falls through to when it has no photo or logo. */}
      <section className="overflow-hidden rounded-3xl border bg-card">
        <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-brand-primary-subtle to-brand-primary-soft md:h-44">
          <CategoryIcon className="size-12 text-brand-primary-strong/50 md:size-14" aria-hidden />
        </div>
        <div className="space-y-5 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {tier && match?.eligible !== false ? <StatusBadge label={tier.label} tone={tier.tone} icon={Sparkles} /> : null}
            {match && !match.eligible ? <StatusBadge label="Not eligible for you" tone="neutral" /> : null}
            {match && match.eligible && match.eligibility_notes ? <StatusBadge label="Eligibility unknown" tone="warning" /> : null}
            <StatusBadge label={humanizeCategory(opportunity.category)} tone="brand" />
            {SELECTIVITY_LABEL[opportunity.selectivity_tier] ? <StatusBadge label={SELECTIVITY_LABEL[opportunity.selectivity_tier]!} tone="neutral" /> : null}
            {CYCLE_STATUS_BADGE[opportunity.cycle_status] ? (
              <StatusBadge label={CYCLE_STATUS_BADGE[opportunity.cycle_status]!.label} tone={CYCLE_STATUS_BADGE[opportunity.cycle_status]!.tone} />
            ) : null}
            {showDeadlineUrgency ? <DeadlineBadge date={opportunity.deadline!} /> : null}
          </div>

          <PageHeader title={opportunity.title} description={opportunity.organization} />

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {opportunity.deadline ? (
              <div className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  Deadline: <span className="font-medium">{formatDate(opportunity.deadline)}</span>
                  {opportunity.current_cycle_label ? ` (${opportunity.current_cycle_label})` : ""}
                </span>
              </div>
            ) : null}
            {duration ? (
              <div className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <span>{duration}</span>
              </div>
            ) : null}
            {opportunity.country || format ? (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span>{[opportunity.country, format].filter(Boolean).join(" · ")}</span>
              </div>
            ) : null}
            {opportunity.cost != null ? (
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {opportunity.cost === 0 ? "Free" : formatCurrency(opportunity.cost)}
                  {opportunity.financial_aid_available ? " · Financial aid available" : ""}
                </span>
              </div>
            ) : opportunity.financial_aid_available ? (
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 shrink-0 text-muted-foreground" />
                <span>Financial aid available</span>
              </div>
            ) : null}
            {hasAgeOrGrade ? (
              <div className="flex items-center gap-2">
                <Users2 className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {opportunity.minimum_age != null || opportunity.maximum_age != null
                    ? `Ages ${opportunity.minimum_age ?? "any"}–${opportunity.maximum_age ?? "any"}`
                    : null}
                  {opportunity.eligible_grades.length > 0 ? ` · Grades ${opportunity.eligible_grades.join(", ")}` : ""}
                </span>
              </div>
            ) : null}
          </div>

          <OpportunityActions
            opportunityId={opportunity.id}
            officialUrl={opportunity.official_url}
            applicationUrl={opportunity.application_url}
            initialStatus={savedStatus}
          />
        </div>
      </section>

      {match && match.eligible && match.eligibility_notes ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{match.eligibility_notes}</p>
      ) : null}

      {/* Why Oryn surfaced this — only the reasons the deterministic matcher actually
          computed (lib/opportunities/matching.ts's buildReasonCodes), never a bare score
          or an invented "% fit". Silent when nothing matched or the student isn't eligible —
          a reason list for something they can't apply to would read as a mixed signal. */}
      {tier && match?.eligible && reasonCodes.length > 0 ? (
        <InsightCard variant="neutral" eyebrow="Why Oryn surfaced this" title={tier.label}>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {reasonCodes.includes("matches_your_interests") ? <li>• Matches your interests</li> : null}
            {reasonCodes.includes("addresses_a_current_gap") ? <li>• Addresses a current gap in your profile</li> : null}
            {reasonCodes.includes("near_you") ? <li>• Based in your country</li> : null}
          </ul>
        </InsightCard>
      ) : null}

      {hasProgramSection ? (
        <div className="space-y-3">
          <SectionHeader title="About this program" />
          {opportunity.description ? <p className="text-muted-foreground">{opportunity.description}</p> : null}
          {opportunity.fields.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {opportunity.fields.map((field) => (
                <span key={field} className="rounded-full bg-brand-primary-subtle px-3 py-1 text-xs text-brand-primary-strong">
                  {field}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasEligibilitySection ? (
        <div className="space-y-4">
          <SectionHeader title="Eligibility" />
          <dl className="grid gap-4 sm:grid-cols-2">
            {hasAgeOrGrade ? (
              <div className="space-y-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Age / grade</dt>
                <dd className="text-sm">
                  {opportunity.minimum_age != null || opportunity.maximum_age != null
                    ? `Ages ${opportunity.minimum_age ?? "any"}–${opportunity.maximum_age ?? "any"}`
                    : null}
                  {opportunity.eligible_grades.length > 0 ? `${opportunity.minimum_age != null ? " · " : ""}Grades ${opportunity.eligible_grades.join(", ")}` : ""}
                </dd>
              </div>
            ) : null}
            {hasCitizenship ? (
              <div className="space-y-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Citizenship</dt>
                <dd className="text-sm">
                  {opportunity.eligible_citizenships.length > 0 ? opportunity.eligible_citizenships.join(", ") : opportunity.citizenship_restrictions}
                </dd>
              </div>
            ) : null}
            {hasResidency ? (
              <div className="space-y-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Residency</dt>
                <dd className="text-sm">
                  {opportunity.eligible_countries.length > 0 ? opportunity.eligible_countries.join(", ") : opportunity.residency_restrictions}
                </dd>
              </div>
            ) : null}
            {opportunity.application_requirements.length > 0 ? (
              <div className="space-y-1.5 sm:col-span-2">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">To apply, you&apos;ll need</dt>
                <dd>
                  <ul className="flex flex-wrap gap-1.5">
                    {opportunity.application_requirements.map((req) => (
                      <li key={req} className="rounded-full border px-3 py-1 text-xs">
                        {humanize(req)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {hasTrustSection ? (
        <div className="space-y-3 border-t pt-6">
          <div className="flex items-center gap-2">
            <SectionHeader title="Source & verification" className="flex-1" />
            {verificationBadge ? <StatusBadge label={verificationBadge.label} tone={verificationBadge.tone} icon={ShieldCheck} /> : null}
          </div>
          <div className="space-y-2">
            {sources.length > 0
              ? sources.map((source) => (
                  <SourceBadge
                    key={source.id}
                    sourceName={source.source_domain ?? source.source_url}
                    checkedAt={source.retrieved_at}
                    url={source.source_url}
                    confidence={source.confidence as ConfidenceLevel}
                  />
                ))
              : opportunity.source_url && (
                  <SourceBadge
                    sourceName={opportunity.source ?? "Official source"}
                    checkedAt={opportunity.last_verified_at}
                    url={opportunity.source_url}
                    confidence={opportunity.source_confidence as ConfidenceLevel}
                  />
                )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
