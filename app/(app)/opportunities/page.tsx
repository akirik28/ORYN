import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { browseOpportunities, getOpportunityFacets } from "@/lib/opportunities/browse";
import { OpportunityCard } from "@/features/opportunities/opportunity-card";
import { OpportunityFilterRail } from "@/features/opportunities/opportunity-filter-rail";
import { OpportunityMapHero } from "@/features/opportunities/opportunity-map-hero";
import { OpportunityCountryPills } from "@/features/opportunities/opportunity-country-pills";
import { OpportunityDetailPanel } from "@/features/opportunities/opportunity-detail-panel";
import { OpportunityMobileFilterSheet } from "@/features/opportunities/opportunity-mobile-filter-sheet";
import { OpportunityMobileViewToggle } from "@/features/opportunities/opportunity-mobile-view-toggle";
import { OpportunityMobileSelectedSheet } from "@/features/opportunities/opportunity-mobile-selected-sheet";
import { integrationStatus } from "@/lib/env";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import type { Opportunity, OpportunityCategory } from "@/types/database";

export const metadata = { title: "Opportunities" };

const TAB = "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast)";
const TAB_ACTIVE = "bg-brand-primary text-primary-foreground";
const TAB_INACTIVE = "text-muted-foreground hover:bg-muted hover:text-foreground";

function pageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return `/opportunities?${next.toString()}`;
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    category?: string;
    country?: string;
    remote?: string;
    free?: string;
    saved?: string;
    cycle?: string;
    page?: string;
    selected?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireUser();
  const userId = session.userId!;
  const isBrowse = params.view === "browse";

  await refreshOpportunityMatches(userId);
  const supabase = await createClient();

  const tabParams = new URLSearchParams();
  if (params.q) tabParams.set("q", params.q);
  if (params.category) tabParams.set("category", params.category);
  if (params.country) tabParams.set("country", params.country);
  if (params.remote) tabParams.set("remote", params.remote);
  if (params.free) tabParams.set("free", params.free);
  if (params.saved) tabParams.set("saved", params.saved);
  if (params.cycle) tabParams.set("cycle", params.cycle);

  return (
    <div className="space-y-6">
      <PageHeader title="Opportunities" description="Personalized matches — highest-value first." />

      <div className="inline-flex gap-1 rounded-xl border bg-card p-1">
        <Link href="/opportunities" className={cn(TAB, !isBrowse ? TAB_ACTIVE : TAB_INACTIVE)}>
          For you
        </Link>
        <Link
          href={`/opportunities?${new URLSearchParams({ view: "browse", ...Object.fromEntries(tabParams) }).toString()}`}
          className={cn(TAB, isBrowse ? TAB_ACTIVE : TAB_INACTIVE)}
        >
          Browse all
        </Link>
      </div>

      {isBrowse ? (
        <BrowseAllView supabase={supabase} userId={userId} params={params} />
      ) : (
        <ForYouView supabase={supabase} userId={userId} tavilyConfigured={integrationStatus.tavily} />
      )}
    </div>
  );
}

async function ForYouView({
  supabase,
  userId,
  tavilyConfigured,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  tavilyConfigured: boolean;
}) {
  const [matchesRes, savedRes] = await Promise.all([
    supabase
      .from("opportunity_matches")
      .select("*")
      .eq("user_id", userId)
      .eq("eligible", true)
      .order("match_score", { ascending: false })
      .limit(30),
    supabase.from("saved_opportunities").select("opportunity_id, status").eq("user_id", userId),
  ]);

  const matches = matchesRes.data ?? [];
  const opportunityIds = matches.map((m) => m.opportunity_id);
  const { data: opportunities } = opportunityIds.length
    ? await supabase.from("opportunities").select("*").in("id", opportunityIds)
    : { data: [] };

  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));
  const statusById = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  const cards = matches
    .map((match) => ({ match, opportunity: opportunityById.get(match.opportunity_id) }))
    .filter((c) => c.opportunity);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="No matches yet"
        description={
          tavilyConfigured
            ? "Opportunities are discovered on a schedule. Check back soon, or complete more of your profile so Oryn knows what to look for."
            : "Opportunity discovery isn't configured yet in this environment (needs TAVILY_API_KEY). See API_SETUP.md."
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map(({ match, opportunity }) => (
        <OpportunityCard
          key={match.opportunity_id}
          opportunity={opportunity!}
          matchScore={match.match_score}
          reasonCodes={match.reason_codes as string[]}
          eligible={match.eligible}
          eligibilityNotes={match.eligibility_notes}
          initialStatus={statusById.get(match.opportunity_id) ?? null}
        />
      ))}
    </div>
  );
}

async function BrowseAllView({
  supabase,
  userId,
  params,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  params: {
    q?: string;
    category?: string;
    country?: string;
    remote?: string;
    free?: string;
    saved?: string;
    cycle?: string;
    page?: string;
    selected?: string;
  };
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const filters = {
    q: params.q,
    category: params.category as OpportunityCategory | undefined,
    country: params.country,
    remoteOnly: params.remote === "1",
    freeOnly: params.free === "1",
    savedOnly: params.saved === "1",
    cycleStatus: params.cycle as Opportunity["cycle_status"] | undefined,
  };

  const [facets, { rows, total, pageSize, countryCounts }, savedRes] = await Promise.all([
    getOpportunityFacets(supabase),
    browseOpportunities(supabase, userId, filters, page),
    supabase.from("saved_opportunities").select("opportunity_id, status").eq("user_id", userId),
  ]);
  const statusById = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Every param except `page` and `selected` — the two the map/list/panel each own their
  // own copy of below, so selecting a country or an opportunity never silently drops a
  // page number (or vice versa) that a plain shared object would let one interaction stomp.
  const linkParams = new URLSearchParams({ view: "browse" });
  if (params.q) linkParams.set("q", params.q);
  if (params.category) linkParams.set("category", params.category);
  if (params.country) linkParams.set("country", params.country);
  if (params.remote) linkParams.set("remote", params.remote);
  if (params.free) linkParams.set("free", params.free);
  if (params.saved) linkParams.set("saved", params.saved);
  if (params.cycle) linkParams.set("cycle", params.cycle);

  function selectedHref(opportunityId: string): string {
    const p = new URLSearchParams(linkParams);
    if (params.selected === opportunityId) p.delete("selected");
    else p.set("selected", opportunityId);
    return `/opportunities?${p.toString()}`;
  }

  const hasAnyFilter = Boolean(
    params.q || params.category || params.country || params.remote || params.free || params.saved || params.cycle
  );
  const currentFilters = {
    q: params.q,
    category: params.category,
    country: params.country,
    remoteOnly: params.remote === "1",
    freeOnly: params.free === "1",
    savedOnly: params.saved === "1",
    cycleStatus: params.cycle,
  };

  // Computed once and placed in more than one spot below (desktop sidebar + mobile sheet) —
  // this is a plain resolved React element at that point, not a re-invoked component, so
  // reusing it doesn't mean OpportunityDetailPanel's own data fetch runs twice.
  const detailPanel = params.selected ? (
    <OpportunityDetailPanel opportunityId={params.selected} closeHref={pageHref(linkParams, page)} />
  ) : null;

  const resultsList =
    rows.length > 0 ? (
      <>
        <p className="text-xs text-muted-foreground">
          {total} opportunit{total === 1 ? "y" : "ies"} match{total === 1 ? "es" : ""}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ opportunity, matchScore, eligible, eligibilityNotes, reasonCodes }) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              matchScore={matchScore}
              reasonCodes={reasonCodes}
              eligible={eligible}
              eligibilityNotes={eligibilityNotes}
              initialStatus={statusById.get(opportunity.id) ?? null}
              detailHref={selectedHref(opportunity.id)}
              selected={params.selected === opportunity.id}
            />
          ))}
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={pageHref(linkParams, page - 1)} className="text-brand-primary hover:underline">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(linkParams, page + 1)} className="text-brand-primary hover:underline">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </>
    ) : (
      <EmptyState
        icon={Compass}
        title={`No opportunities found${params.q ? ` matching "${params.q}"` : ""}`}
        description="Try a different search, or clear a filter — Oryn's opportunity catalog grows over time."
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <p className="text-sm text-muted-foreground">
          {total} result{total === 1 ? "" : "s"}
        </p>
        <OpportunityMobileFilterSheet hasActive={hasAnyFilter}>
          <OpportunityFilterRail facets={facets} current={currentFilters} />
        </OpportunityMobileFilterSheet>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="hidden md:block lg:w-64 lg:shrink-0">
          <OpportunityFilterRail facets={facets} current={currentFilters} />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="hidden space-y-4 md:block">
            <OpportunityMapHero countryCounts={countryCounts} filterParams={linkParams} />
            <OpportunityCountryPills countryCounts={countryCounts} selected={params.country ?? null} filterParams={linkParams} />
            {resultsList}
          </div>

          <OpportunityMobileViewToggle
            countryCounts={countryCounts}
            filterParamsString={linkParams.toString()}
            selectedCountry={params.country ?? null}
            selectedId={params.selected ?? null}
            rows={rows.map((r) => ({
              opportunity: r.opportunity,
              matchScore: r.matchScore,
              eligible: r.eligible,
              eligibilityNotes: r.eligibilityNotes,
              reasonCodes: r.reasonCodes,
              savedStatus: statusById.get(r.opportunity.id) ?? null,
            }))}
          />
        </div>

        {detailPanel ? (
          <aside className="hidden overflow-hidden rounded-2xl border bg-card lg:block lg:sticky lg:top-6 lg:w-96 lg:shrink-0 lg:self-start">
            {detailPanel}
          </aside>
        ) : null}
      </div>

      {detailPanel ? <OpportunityMobileSelectedSheet>{detailPanel}</OpportunityMobileSelectedSheet> : null}
    </div>
  );
}
