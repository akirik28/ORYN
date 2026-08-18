/**
 * Explorer filter definitions (P0E) and the pure narrowing logic behind them — deliberately
 * factored out of app/(app)/universities/page.tsx so this part is unit-testable the way the
 * rest of this codebase tests DB-adjacent logic (see alias-search.ts's rankUniversities):
 * pure functions with every dependency passed in, no Supabase client, no closure state.
 */

export interface RangeBucket<V extends string> {
  value: V;
  label: string;
  min: number;
  max: number | null;
}

// Quick preset ranges, not a slider — matches the founder's own "quick ranges" language and
// keeps every filter a plain, pre-built <Link> (no client-side range-picker state to wire up),
// consistent with how country/region navigation already works on this page.
export type CostBucketValue = "under10k" | "10-25k" | "25-50k" | "50k-plus";
export const COST_BUCKETS: RangeBucket<CostBucketValue>[] = [
  { value: "under10k", label: "Under $10,000", min: 0, max: 9999 },
  { value: "10-25k", label: "$10,000 – $25,000", min: 10000, max: 24999 },
  { value: "25-50k", label: "$25,000 – $50,000", min: 25000, max: 49999 },
  { value: "50k-plus", label: "$50,000+", min: 50000, max: null },
];

export type SizeBucketValue = "under5k" | "5-15k" | "15-30k" | "30k-plus";
export const SIZE_BUCKETS: RangeBucket<SizeBucketValue>[] = [
  { value: "under5k", label: "Under 5,000 students", min: 0, max: 4999 },
  { value: "5-15k", label: "5,000 – 15,000 students", min: 5000, max: 14999 },
  { value: "15-30k", label: "15,000 – 30,000 students", min: 15000, max: 29999 },
  { value: "30k-plus", label: "30,000+ students", min: 30000, max: null },
];

export type InstitutionTypeFilter = "public" | "private";
export const TYPE_OPTIONS: { value: InstitutionTypeFilter; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export const RANK_TIERS = ["10", "25", "50", "100", "250", "500"] as const;
export type RankTierValue = (typeof RANK_TIERS)[number];
export const RANK_OPTIONS = RANK_TIERS.map((t) => ({ value: t, label: `Top ${t}` }));

// Deliberately not offered as filters this pass, and not silently missing — documented here so
// the gap is a decision, not an oversight: admission_rate (128/1019, ~13%) and application_system
// (77/1019, ~8%) coverage are too thin for a filter to feel like real signal rather than mostly
// "everyone is Unavailable." research_topics_top5 exists (923/1019) but is free text (OpenAlex
// phrasing) — a real filter needs a small controlled taxonomy over it first (Economics/CS/Medicine/
// etc.), not hundreds of raw filter options; that taxonomy is a separate build, not a quick add here.

export interface RangeFilterRow {
  id: string;
  student_size: number | null;
}

export interface RangeFilters {
  // Arrays, not a single value: cost and size are multi-select (OR within the category, still
  // AND against every other filter) so a student can span adjacent buckets — e.g. select both
  // "$10,000 – $25,000" and "$25,000 – $50,000" to effectively get "$10k-$50k". A first version
  // of this filter only allowed one bucket active at a time; live feedback ("10 ile 50 arasını
  // yapamıyorum" — can't do between 10 and 50) is exactly the gap a single-select preset always
  // has no matter how the boundaries are drawn. rank stays single-select deliberately: QS tiers
  // are already cumulative ("Top 50" is a superset of "Top 10"), so multi-selecting two tiers
  // can't express anything a single selection of the wider one doesn't already cover.
  size?: SizeBucketValue[];
  cost?: CostBucketValue[];
  rank?: RankTierValue | null;
}

export interface RangeFilterResult<T> {
  matched: T[];
  /** Rows dropped from the size filter for having NO student_size at all — undefined when
   * the size filter isn't active. Kept separate from "matched" so a caller can tell "excluded
   * because it didn't fit the range" from "excluded because we don't know." */
  sizeUnknown?: number;
  /** Same distinction for the cost filter, keyed against `data.costMap`. */
  costUnknown?: number;
}

/**
 * Applies size/cost/rank narrowing in-memory, tracking how many rows were dropped for having
 * NO data at all (as opposed to verified data outside the range) — the distinction the
 * founder's own filter spec requires: "67 additional universities excluded because tuition
 * data is unavailable" must be an honest, separate number from ordinary filtering, never
 * silently folded into it.
 *
 * cost/rank are checked against pre-fetched maps rather than a `.in("id", [...])` DB filter
 * because that filter has a real, verified server-side size limit: a live test against this
 * project showed `.in()` starting to fail (Bad Request / connection reset) somewhere around
 * 400-700 uuids, well under the ~1019 universities a "World" scope can produce — a rank filter
 * alone ("Top 500") can already exceed that on its own. The caller fetches the full column
 * once (paginated) and this function does the narrowing against that map instead.
 */
export function applyRangeFilters<T extends RangeFilterRow>(
  rows: T[],
  filters: RangeFilters,
  data: { costMap?: Map<string, number>; qsRankMap?: Map<string, number> } = {}
): RangeFilterResult<T> {
  let stage = rows;

  let sizeUnknown: number | undefined;
  if (filters.size && filters.size.length > 0) {
    const buckets = SIZE_BUCKETS.filter((b) => filters.size!.includes(b.value));
    sizeUnknown = stage.filter((r) => r.student_size == null).length;
    stage = stage.filter(
      (r) => r.student_size != null && buckets.some((bucket) => r.student_size! >= bucket.min && (bucket.max == null || r.student_size! <= bucket.max))
    );
  }

  let costUnknown: number | undefined;
  if (filters.cost && filters.cost.length > 0) {
    const buckets = COST_BUCKETS.filter((b) => filters.cost!.includes(b.value));
    const costMap = data.costMap ?? new Map<string, number>();
    costUnknown = stage.filter((r) => !costMap.has(r.id)).length;
    stage = stage.filter((r) => {
      const amount = costMap.get(r.id);
      return amount != null && buckets.some((bucket) => amount >= bucket.min && (bucket.max == null || amount <= bucket.max));
    });
  }

  if (filters.rank) {
    const threshold = Number(filters.rank);
    const qsRankMap = data.qsRankMap ?? new Map<string, number>();
    stage = stage.filter((r) => {
      const rk = qsRankMap.get(r.id);
      return rk != null && rk <= threshold;
    });
  }

  return { matched: stage, sizeUnknown, costUnknown };
}

/** institution_type is free text ("Public", "Private nonprofit", "Private not for Profit", a
 * bare "university" placeholder) — matched by substring, case-insensitively, rather than an
 * exact enum. A bare "university" placeholder matches neither bucket, which is correct: it's
 * genuinely unclassified, not silently "Public" by default. */
export function matchesInstitutionType(institutionType: string | null, type: InstitutionTypeFilter | null): boolean {
  if (!type) return true;
  return (institutionType ?? "").toLowerCase().includes(type);
}
