import { notFound } from "next/navigation";
import type { Metadata } from "next";
// Wallet, not DollarSign: the icon sits beside a figure whose currency is not recorded, so a
// dollar glyph asserts the same thing the "$" prefix used to.
import { ExternalLink, MapPin, Wallet, Calendar, Users2 } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { INSUFFICIENT_VERIFICATION_REASON, isOpportunitySufficientlyVerified, resolveStoredEligibility } from "@/lib/opportunities/lifecycle";
import { OpportunityStandingBadge } from "@/features/opportunities/standing-badge";
import { PageHeader } from "@/components/oryn/page-header";
import { ErrorState } from "@/components/oryn/error-state";
import { SectionHeader } from "@/components/oryn/section-header";
import { SourceBadge } from "@/components/oryn/source-badge";
import { StatusBadge } from "@/components/oryn/status-badge";
import { OpportunityActions } from "@/features/opportunities/opportunity-actions";
import { formatMoney } from "@/lib/i18n/format";
import type { ConfidenceLevel } from "@/components/oryn/confidence-indicator";

// Was a static "Opportunity" title on every one of these pages — technically present, but
// no more useful than a missing one for telling tabs/history apart. Public/global data
// (opportunities aren't user-owned), so a plain lightweight query is fine here, same as
// the university detail page.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: opportunity } = await supabase.from("opportunities").select("title").eq("id", id).single();
  return { title: opportunity?.title ?? "Opportunity" };
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const SELECTIVITY_LABEL: Partial<Record<string, string>> = {
  extremely_selective: "Extremely selective",
  highly_selective: "Highly selective",
  selective: "Selective",
  competitive_award: "Competitive award",
  open_enrollment: "Open enrollment",
};

const CYCLE_STATUS_LABEL: Partial<Record<string, string>> = {
  open: "Open now",
  upcoming: "Opens soon",
  closed: "Closed for this cycle",
  date_not_announced: "Next dates not announced",
  historical: "Historical — not currently running",
  discontinued: "Discontinued",
  unverified: "Verification pending",
};

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", id).single();
  if (!opportunity) notFound();

  const { refreshed: matchRefreshed } = await refreshOpportunityMatches(userId);
  const [matchRes, savedRes, sourcesRes] = await Promise.all([
    supabase.from("opportunity_matches").select("*").eq("user_id", userId).eq("opportunity_id", id).maybeSingle(),
    supabase.from("saved_opportunities").select("status").eq("user_id", userId).eq("opportunity_id", id).maybeSingle(),
    supabase.from("opportunity_sources").select("*").eq("opportunity_id", id).order("retrieved_at", { ascending: false }),
  ]);

  const match = matchRes.data;

  // Same read-time lifecycle gate Browse applies (lib/opportunities/browse.ts), for the same
  // reason: this row's `eligible` was computed at some earlier moment and is never deleted
  // when the opportunity's cycle closes or its deadline passes, so trusting it verbatim badges
  // a long-closed opportunity as a live match. Reusing resolveStoredEligibility rather than
  // re-deriving the rule here keeps this page from becoming a third copy that can drift.
  const eligibility = match ? resolveStoredEligibility(opportunity, { eligible: match.eligible, notes: match.eligibility_notes }) : null;

  // The third lifecycle gate. This page never hides an opportunity (it's reachable by id by
  // design), so the freshness rule only ever labels here — and only when the row is otherwise
  // fine, so a closed cycle keeps its own more specific explanation rather than being described
  // as merely unverified. Not a closure claim and not an eligibility claim: see
  // isOpportunitySufficientlyVerified.
  const needsVerification =
    !isOpportunitySufficientlyVerified(opportunity) && (!eligibility || (eligibility.eligible && !eligibility.notActionable));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={opportunity.title}
        description={opportunity.organization}
        action={
          <OpportunityActions
            opportunityId={opportunity.id}
            officialUrl={opportunity.official_url}
            applicationUrl={opportunity.application_url}
            initialStatus={savedRes.data?.status ?? null}
          />
        }
      />

      {!matchRefreshed ? (
        <ErrorState description="We couldn't refresh your match for this opportunity just now. The eligibility and match details below are your last known result, not necessarily current." />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {SELECTIVITY_LABEL[opportunity.selectivity_tier] ? <StatusBadge label={SELECTIVITY_LABEL[opportunity.selectivity_tier]!} tone="neutral" /> : null}
        {CYCLE_STATUS_LABEL[opportunity.cycle_status] ? <StatusBadge label={CYCLE_STATUS_LABEL[opportunity.cycle_status]!} tone="info" /> : null}
        <StatusBadge label={humanize(opportunity.category)} tone="brand" />
        {/* One shared component with Browse's card (features/opportunities/standing-badge.tsx):
            it keeps "not open" (about the opportunity), "not eligible" (about the student) and
            "needs verification" (about Oryn's data) from ever being described in each other's
            words, in one place rather than two that drift. */}
        <OpportunityStandingBadge
          eligible={eligibility?.eligible ?? true}
          notActionable={eligibility?.notActionable ?? false}
          needsVerification={needsVerification}
        />
        {eligibility && eligibility.eligible && eligibility.notes ? <StatusBadge label="Eligibility unknown" tone="warning" /> : null}
      </div>

      {eligibility?.notes ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{eligibility.notes}</p>
      ) : null}
      {needsVerification ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{INSUFFICIENT_VERIFICATION_REASON}</p>
      ) : null}

      {opportunity.description ? <p className="text-muted-foreground">{opportunity.description}</p> : null}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {opportunity.deadline ? (
          <div className="flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-muted-foreground" />
            <span>
              Deadline: <span className="font-medium">{opportunity.deadline}</span>
              {opportunity.current_cycle_label ? ` (${opportunity.current_cycle_label})` : ""}
            </span>
          </div>
        ) : null}
        {opportunity.country || opportunity.location_mode ? (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span>{[opportunity.country, opportunity.location_mode ? humanize(opportunity.location_mode) : null].filter(Boolean).join(" · ")}</span>
          </div>
        ) : null}
        {opportunity.cost != null ? (
          <div className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <span>
              {/* null currency, not a guess: `opportunities` has no currency column, and live
                  rows hold GBP/EUR/CHF/TRY in this field. See lib/i18n/format.ts. */}
              {formatMoney(opportunity.cost, null)}
              <span className="text-muted-foreground"> · currency not recorded, check the official page</span>
              {opportunity.financial_aid_available ? " · Financial aid available" : ""}
            </span>
          </div>
        ) : opportunity.financial_aid_available ? (
          <div className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <span>Financial aid available</span>
          </div>
        ) : null}
        {opportunity.minimum_age != null || opportunity.maximum_age != null || opportunity.eligible_grades.length > 0 ? (
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

      {opportunity.application_requirements.length > 0 ? (
        <div className="space-y-2">
          <SectionHeader title="What you'll need to apply" />
          <ul className="flex flex-wrap gap-1.5">
            {opportunity.application_requirements.map((req) => (
              <li key={req} className="rounded-full border px-3 py-1 text-xs">
                {humanize(req)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {opportunity.citizenship_restrictions || opportunity.residency_restrictions ? (
        <div className="space-y-1 text-sm">
          <SectionHeader title="Eligibility notes" />
          {opportunity.citizenship_restrictions ? <p className="text-muted-foreground">Citizenship: {opportunity.citizenship_restrictions}</p> : null}
          {opportunity.residency_restrictions ? <p className="text-muted-foreground">Residency: {opportunity.residency_restrictions}</p> : null}
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

      {sourcesRes.data && sourcesRes.data.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Sources</p>
          <div className="space-y-2">
            {sourcesRes.data.map((source) => (
              <SourceBadge
                key={source.id}
                sourceName={source.source_domain ?? source.source_url}
                checkedAt={source.retrieved_at}
                url={source.source_url}
                confidence={source.confidence as ConfidenceLevel}
              />
            ))}
          </div>
        </div>
      ) : opportunity.source_url ? (
        <div className="border-t pt-4">
          <SourceBadge
            sourceName={opportunity.source ?? "Official source"}
            checkedAt={opportunity.last_verified_at}
            url={opportunity.source_url}
            confidence={opportunity.source_confidence as ConfidenceLevel}
          />
        </div>
      ) : null}

      {opportunity.official_url ? (
        <a
          href={opportunity.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline"
        >
          Visit official page <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
