import { GraduationCap, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadUniversityBrowsePage } from "@/lib/universities/browse-page";
import { getSupersededUniversityIds, loadSupersessionMap } from "@/lib/universities/canonical";
import { EmptyState } from "@/components/proxola/empty-state";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

const RESULT_CAP = 20;

/**
 * B3c (2026-09-04) — the full university catalog, not just the child's own targets
 * (UniversitiesSection, features/parent/parent-panel-view.tsx, shows only those). Reuses
 * loadUniversityBrowsePage as-is, not a new query: read it in full first and confirmed it
 * carries no per-student personalization at all (no userId param, no match/save-status
 * join — that's a separate query the student page runs on its own), so there is nothing
 * here that could leak the child's data through it.
 *
 * Detail is an inline `<details>` expansion, not a link to /universities/[id] — that page
 * computes and WRITES an admission outlook keyed to whoever is viewing it, and renders a
 * save button and an admin form that don't apply to a parent. Linking there would write
 * garbage under the parent's own account. A real parent-safe detail page is its own
 * separate, undecided piece of work (CEO, 2026-09-04) — not silently rolled into this one.
 *
 * Read-only by construction, matching ParentPanelView's own rule: the search form below is
 * a plain GET, no server action anywhere in this file.
 */
export async function UniversityCatalogBrowser({
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
  const page = Math.max(1, Number(searchParams.page) || 1);

  const supabase = await createClient();
  const supersessionMap = await loadSupersessionMap(supabase);
  const supersededIds = getSupersededUniversityIds(supersessionMap);

  const { universities, total } = await loadUniversityBrowsePage(
    supabase,
    { q, scopedCountries: null, type: null, sort: "ranking", cost: [], size: [], rank: null, detailedOnly: false, page },
    supersededIds,
    {}
  );

  const shown = universities.slice(0, RESULT_CAP);

  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--card), transparent 20%)" }}
    >
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <GraduationCap className="size-4" style={{ color: "var(--role-accent)" }} />
        {tr ? "Üniversite kataloğu" : "University catalog"}
      </h2>

      <form action={basePath} method="GET" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={tr ? "Üniversite adı veya ülke ara..." : "Search by university name or country..."}
          className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          style={{ borderColor: "var(--role-surface-border)" }}
        />
        <button type="submit" className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--role-surface-border)" }}>
          {tr ? "Ara" : "Search"}
        </button>
      </form>

      {shown.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={tr ? "Eşleşen üniversite bulunamadı" : "No universities found"}
          description={tr ? "Farklı bir arama deneyin." : "Try a different search."}
        />
      ) : (
        <ul className="space-y-1">
          {shown.map((u) => (
            <li key={u.id} className="border-b border-[var(--role-surface-border)] py-2 last:border-0">
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-foreground">{u.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{[u.city, u.country].filter(Boolean).join(", ")}</span>
                </summary>
                <div className="mt-2 space-y-1 pl-1 text-sm text-muted-foreground">
                  {u.institution_type ? (
                    <p>
                      {tr ? "Tür" : "Type"}: {u.institution_type}
                    </p>
                  ) : null}
                  {u.website_url ? (
                    <a
                      href={u.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: "var(--role-accent)" }}
                    >
                      {tr ? "Web sitesi" : "Website"} <ExternalLink className="size-3" />
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
            ? `${formatNumber(total)} üniversiteden ilk ${shown.length} tanesi gösteriliyor. Daraltmak için arayın.`
            : `Showing ${shown.length} of ${formatNumber(total)} universities. Search to narrow further.`}
        </p>
      ) : null}
    </section>
  );
}
