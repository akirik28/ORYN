import { Compass, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/proxola/empty-state";
import { DeadlineBadge } from "@/components/proxola/deadline-badge";
import { categoryLabel } from "@/lib/opportunities/labels";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

const RESULT_CAP = 20;

/**
 * B3c (2026-09-04) — the full opportunity catalog, not just the child's own matches
 * (OpportunitiesSection, features/parent/parent-panel-view.tsx, shows only those).
 * Deliberately NOT lib/opportunities/browse.ts's browseOpportunities — read that function
 * in full before writing this one: it joins the passed userId's own opportunity_matches
 * row per opportunity (match score, eligibility, reason codes), which only means something
 * for a real student profile. Calling it with the parent's own id would render nonsense
 * (every row "0% match, ineligible"); calling it with the child's id would compute the
 * child's personalized match data through a path that isn't the whitelisted
 * get_parent_child_* RPCs CEO named as the one route child-specific info is allowed to
 * travel through. This is therefore its own, smaller query: plain active catalog rows, no
 * per-user join at all, on purpose.
 *
 * Read-only by construction, matching ParentPanelView's own rule: the search form below is
 * a plain GET, no server action anywhere in this file.
 */
export async function OpportunityCatalogBrowser({
  searchParams,
  basePath,
  locale,
}: {
  searchParams: { q?: string; page?: string };
  basePath: string;
  locale: Locale;
}) {
  const tr = locale === "tr";
  const q = searchParams.q?.trim() || null;

  const supabase = await createClient();
  let query = supabase.from("opportunities").select("*", { count: "exact" }).eq("status", "active");
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, count } = await query.order("deadline", { ascending: true, nullsFirst: false }).limit(RESULT_CAP);

  const shown = data ?? [];
  const total = count ?? shown.length;

  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--card), transparent 20%)" }}
    >
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <Compass className="size-4" style={{ color: "var(--role-accent)" }} />
        {tr ? "Fırsat kataloğu" : "Opportunity catalog"}
      </h2>

      <form action={basePath} method="GET" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={tr ? "Fırsat adı ara..." : "Search by title..."}
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          style={{ borderColor: "var(--role-surface-border)" }}
        />
        <button type="submit" className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--role-surface-border)" }}>
          {tr ? "Ara" : "Search"}
        </button>
      </form>

      {shown.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={tr ? "Eşleşen fırsat bulunamadı" : "No opportunities found"}
          description={tr ? "Farklı bir arama deneyin." : "Try a different search."}
        />
      ) : (
        <ul className="space-y-1">
          {shown.map((o) => (
            <li key={o.id} className="border-b border-[var(--role-surface-border)] py-2 last:border-0">
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-foreground">{o.title}</span>
                  {o.deadline ? <DeadlineBadge date={o.deadline} locale={locale} /> : null}
                </summary>
                <div className="mt-2 space-y-1 pl-1 text-sm text-muted-foreground">
                  {o.organization ? <p>{o.organization}</p> : null}
                  <p>{categoryLabel(o.category, locale)}</p>
                  {o.official_url ? (
                    <a
                      href={o.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: "var(--role-accent)" }}
                    >
                      {tr ? "Resmi sayfa" : "Official page"} <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {total > shown.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {tr
            ? `${formatNumber(total)} fırsattan ilk ${shown.length} tanesi gösteriliyor. Daraltmak için arayın.`
            : `Showing ${shown.length} of ${formatNumber(total)} opportunities. Search to narrow further.`}
        </p>
      ) : null}
    </section>
  );
}
