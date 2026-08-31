import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { browseOpportunities, getOpportunityFacets } from "@/lib/opportunities/browse";
import { isOpportunityActionable, isOpportunitySufficientlyVerified } from "@/lib/opportunities/lifecycle";
import { OpportunityCard } from "@/features/opportunities/opportunity-card";
import { OpportunityBrowseGrid } from "@/features/opportunities/opportunity-browse-grid";
import { OpportunityFilterBar } from "@/features/opportunities/opportunity-filter-bar";
import { integrationStatus } from "@/lib/env";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { ErrorState } from "@/components/oryn/error-state";
import type { Opportunity, OpportunityCategory } from "@/types/database";

export const metadata = { title: "Opportunities" };

const TAB =
  "border-b-2 pb-2 text-sm transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
const TAB_ACTIVE = "border-brand-primary font-medium text-ink-1";
const TAB_INACTIVE = "border-transparent text-ink-3 hover:text-ink-1";

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
    cycle?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireUser();
  const userId = session.userId!;
  const isBrowse = params.view === "browse";

  const { refreshed: matchesRefreshed } = await refreshOpportunityMatches(userId);
  const supabase = await createClient();

  const tabParams = new URLSearchParams();
  if (params.q) tabParams.set("q", params.q);
  if (params.category) tabParams.set("category", params.category);
  if (params.country) tabParams.set("country", params.country);
  if (params.remote) tabParams.set("remote", params.remote);
  if (params.free) tabParams.set("free", params.free);
  if (params.cycle) tabParams.set("cycle", params.cycle);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunities"
        title="Chosen for where you are now."
        description="Ranked by what each one could add to your profile — not by prestige or popularity."
      />

      {!matchesRefreshed ? (
        <ErrorState description="We couldn't refresh your matches just now. Match scores and eligibility below are your last known result, not necessarily current." />
      ) : null}

      <div className="flex gap-6 border-b border-border">
        <Link href="/opportunities" aria-current={!isBrowse ? "page" : undefined} className={cn(TAB, !isBrowse ? TAB_ACTIVE : TAB_INACTIVE)}>
          For you
        </Link>
        <Link
          href={`/opportunities?${new URLSearchParams({ view: "browse", ...Object.fromEntries(tabParams) }).toString()}`}
          aria-current={isBrowse ? "page" : undefined}
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
    ? await supabase.from("opportunities").select("*").in("id", opportunityIds).eq("status", "active")
    : { data: [] };

  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));
  const statusById = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  // Defense in depth (lib/opportunities/lifecycle.ts): a match row upserted before its
  // opportunity's cycle closed persists in opportunity_matches until refreshOpportunityMatches
  // runs again, so "For you" must not trust match freshness alone — re-check the opportunity
  // itself, not just whether a match row exists for it.
  const cards = matches
    .map((match) => ({ match, opportunity: opportunityById.get(match.opportunity_id) }))
    .filter((c): c is { match: (typeof matches)[number]; opportunity: NonNullable<typeof c.opportunity> } =>
      Boolean(c.opportunity && isOpportunityActionable(c.opportunity))
    )
    // Same demotion Browse applies: a row Oryn can't vouch for sorts below every row it can,
    // whatever its score. The DB already ordered by match_score, so this is a stable partition
    // on top of that ordering rather than a re-sort.
    .sort(
      (a, b) => Number(!isOpportunitySufficientlyVerified(a.opportunity)) - Number(!isOpportunitySufficientlyVerified(b.opportunity))
    );

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

  // "For you" is a curated slice, but it still shows the whole card, so it labels rather
  // than hides — an unverified row keeps its place and loses its match tier. The
  // counselor's ranked top-3 is the surface that excludes; see lib/counselor/eligibility.ts
  // for why the two differ.
  const renderCard = (
    { match, opportunity }: (typeof cards)[number],
    featured: boolean,
  ) => (
    <OpportunityCard
      key={match.opportunity_id}
      opportunity={opportunity!}
      matchScore={match.match_score}
      reasonCodes={match.reason_codes as string[]}
      eligible={match.eligible}
      eligibilityNotes={match.eligibility_notes}
      needsVerification={!isOpportunitySufficientlyVerified(opportunity!)}
      initialStatus={statusById.get(match.opportunity_id) ?? null}
      featured={featured}
    />
  );

  // The lead is only promoted when Oryn can actually vouch for it. Cards are already
  // partitioned verified-first above, so if the top row still isn't verifiable there is
  // nothing here worth making dominant — fall back to an even grid rather than giving a
  // caveated row the largest treatment on the page.
  const [lead, ...rest] = cards;
  const leadIsVouchable = lead && isOpportunitySufficientlyVerified(lead.opportunity!) && lead.match.eligible;

  return (
    <div className="space-y-10">
      {leadIsVouchable ? (
        <section>
          <SectionHeader title="Best next move" description="The single opportunity that would add most to your profile right now." />
          <div className="mt-4">{renderCard(lead, true)}</div>
        </section>
      ) : null}

      {(leadIsVouchable ? rest : cards).length > 0 ? (
        <section>
          {leadIsVouchable ? <SectionHeader title="Also worth your time" className="mb-4" /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            {(leadIsVouchable ? rest : cards).map((card) => renderCard(card, false))}
          </div>
        </section>
      ) : null}
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
    cycle?: string;
    page?: string;
  };
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const filters = {
    q: params.q,
    category: params.category as OpportunityCategory | undefined,
    country: params.country,
    remoteOnly: params.remote === "1",
    freeOnly: params.free === "1",
    cycleStatus: params.cycle as Opportunity["cycle_status"] | undefined,
  };

  const [facets, { rows, total, pageSize }, savedRes] = await Promise.all([
    getOpportunityFacets(supabase),
    browseOpportunities(supabase, userId, filters, page),
    supabase.from("saved_opportunities").select("opportunity_id, status").eq("user_id", userId),
  ]);
  const statusById = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  return (
    <div className="space-y-6">
      <OpportunityFilterBar
        facets={facets}
        current={{
          q: params.q,
          category: params.category,
          country: params.country,
          remoteOnly: params.remote === "1",
          freeOnly: params.free === "1",
          cycleStatus: params.cycle,
        }}
      />

      {rows.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            {total} opportunit{total === 1 ? "y" : "ies"} match{total === 1 ? "es" : ""}
          </p>
          {/* Page 1 is still server-rendered; the grid appends subsequent pages as the
              student scrolls, replacing the old "Page N of M" pager (founder direction,
              2026-08-30). */}
          <OpportunityBrowseGrid
            key={JSON.stringify(filters)}
            initialRows={rows}
            initialStatuses={Object.fromEntries(statusById)}
            filters={filters}
            initialHasMore={page * pageSize < total}
          />
        </>
      ) : (
        <EmptyState
          icon={Compass}
          title={`No opportunities found${params.q ? ` matching "${params.q}"` : ""}`}
          description="Try a different search, or clear a filter — Oryn's opportunity catalog grows over time."
        />
      )}
    </div>
  );
}
