import Link from "next/link";
import { X, Calendar, MapPin, DollarSign, Clock } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/oryn/status-badge";
import { OpportunityActions } from "./opportunity-actions";
import { CATEGORY_ICON, humanizeCategory } from "@/lib/opportunities/category-visuals";
import { formatCurrency } from "@/lib/i18n/format";

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

/**
 * The right-column in-context preview — deliberately a smaller field set than the full
 * detail route (app/(app)/opportunities/[id]/page.tsx), which stays the place for sources,
 * requirements, and every eligibility note. Only real, currently-populated fields render;
 * a missing one is simply absent, never an empty label ("Duration: —"). No image anywhere
 * in the schema (audited) — the category icon-band is the honest visual identity instead of
 * a placeholder pretending to stand in for a photo.
 */
export async function OpportunityDetailPanel({ opportunityId, closeHref }: { opportunityId: string; closeHref: string }) {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", opportunityId).single();
  if (!opportunity) return null;

  const [matchRes, savedRes] = await Promise.all([
    supabase.from("opportunity_matches").select("*").eq("user_id", userId).eq("opportunity_id", opportunityId).maybeSingle(),
    supabase.from("saved_opportunities").select("status").eq("user_id", userId).eq("opportunity_id", opportunityId).maybeSingle(),
  ]);
  const match = matchRes.data;
  const Icon = CATEGORY_ICON[opportunity.category];

  const duration =
    opportunity.start_date && opportunity.end_date
      ? `${opportunity.start_date} – ${opportunity.end_date}`
      : opportunity.start_date
        ? `Starts ${opportunity.start_date}`
        : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary-subtle to-brand-primary-soft">
          <Icon className="size-5 text-brand-primary-strong" />
        </div>
        <Link
          href={closeHref}
          scroll={false}
          className="rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Close preview"
        >
          <X className="size-4" />
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <h2 className="font-heading text-lg leading-snug font-medium text-balance">{opportunity.title}</h2>
          {opportunity.organization ? <p className="text-sm text-muted-foreground">{opportunity.organization}</p> : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <StatusBadge label={humanizeCategory(opportunity.category)} tone="brand" />
          {SELECTIVITY_LABEL[opportunity.selectivity_tier] ? <StatusBadge label={SELECTIVITY_LABEL[opportunity.selectivity_tier]!} tone="neutral" /> : null}
          {CYCLE_STATUS_LABEL[opportunity.cycle_status] ? <StatusBadge label={CYCLE_STATUS_LABEL[opportunity.cycle_status]!} tone="info" /> : null}
          {match && !match.eligible ? <StatusBadge label="Not eligible for you" tone="neutral" /> : null}
          {match && match.eligible && match.eligibility_notes ? <StatusBadge label="Eligibility unknown" tone="warning" /> : null}
        </div>

        <dl className="space-y-2 text-sm">
          {opportunity.deadline ? (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <span>
                Deadline <span className="font-medium">{opportunity.deadline}</span>
              </span>
            </div>
          ) : null}
          {duration ? (
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span>{duration}</span>
            </div>
          ) : null}
          {opportunity.country || opportunity.location_mode ? (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span>{[opportunity.country, opportunity.location_mode ? humanizeCategory(opportunity.location_mode) : null].filter(Boolean).join(" · ")}</span>
            </div>
          ) : null}
          {opportunity.cost != null ? (
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 shrink-0 text-muted-foreground" />
              <span>
                {formatCurrency(opportunity.cost)}
                {opportunity.financial_aid_available ? " · Financial aid available" : ""}
              </span>
            </div>
          ) : null}
        </dl>

        {match && match.eligibility_notes ? (
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{match.eligibility_notes}</p>
        ) : null}

        {opportunity.description ? <p className="text-sm text-muted-foreground">{opportunity.description}</p> : null}
      </div>

      <div className="space-y-2 border-t p-4">
        <OpportunityActions
          opportunityId={opportunity.id}
          officialUrl={opportunity.official_url}
          applicationUrl={opportunity.application_url}
          initialStatus={savedRes.data?.status ?? null}
        />
        <Link href={`/opportunities/${opportunity.id}`} className="block text-center text-sm text-brand-primary hover:underline">
          Full details
        </Link>
      </div>
    </div>
  );
}
