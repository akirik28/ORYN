/**
 * Paginated reads against PostgREST.
 *
 * PostgREST applies a server-side `max-rows` cap (1000 on Supabase by default) and returns a
 * truncated result **with a 200 status and no error**. Nothing about the response says it was
 * cut short unless you asked for the count separately.
 *
 * That bit this project for real: `universities` holds 1010 rows, every unpaginated read
 * returned exactly 1000, and so
 *   - the completeness report computed every coverage percentage over 1000 of 1010 rows,
 *   - the acquisition roster (ordered by name) silently dropped the last 10 alphabetically,
 *   - and the importer then could not match those same 10 back, reporting them as
 *     "no name match" — a truncation bug wearing the costume of a data-quality refusal.
 *
 * Any read that must be complete goes through here. `fetchAllRows` also verifies the row
 * count it assembled against the server's own exact count and throws on a mismatch, because
 * a silently short read is worse than a failed one.
 */

export interface PostgrestTarget {
  /** Supabase project URL, no trailing slash. */
  url: string;
  /** Service-role key. Never logged. */
  key: string;
}

const PAGE_SIZE = 1000;

/**
 * Total rows matching `query`, from PostgREST's own exact count.
 *
 * `countColumn` is the cheap column to `select` for this probe — any real column works since
 * only the `content-range` header is read, not the body, but it must actually exist on
 * `table`. Defaults to `"id"`, true for every table this pipeline reads except
 * `qs2027_import_staging` (primary key is `list_position`, no separate `id` column) — pass
 * that table's real key explicitly rather than assuming every table has an `id`.
 */
export async function fetchExactCount(target: PostgrestTarget, table: string, query = "", countColumn = "id"): Promise<number> {
  const separator = query ? "&" : "";
  const response = await fetch(`${target.url}/rest/v1/${table}?select=${countColumn}${separator}${query}&limit=1`, {
    headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, Prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`count on ${table} failed: HTTP ${response.status}`);
  const range = response.headers.get("content-range");
  const total = range ? Number(range.split("/")[1]) : Number.NaN;
  if (!Number.isFinite(total)) throw new Error(`count on ${table} returned an unparseable content-range: ${range}`);
  return total;
}

/**
 * Every row matching `query`, fetched in pages.
 *
 * `query` must include a stable `order=` clause — without one, PostgREST gives no ordering
 * guarantee across pages, so rows can be skipped or duplicated between requests. Callers
 * that forget get a thrown error rather than a quietly wrong result set.
 */
export async function fetchAllRows<T>(target: PostgrestTarget, table: string, select: string, query = ""): Promise<T[]> {
  if (!query.includes("order=")) {
    throw new Error(`fetchAllRows("${table}") needs a stable order= clause; paging without one can skip or repeat rows.`);
  }

  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${target.url}/rest/v1/${table}?select=${select}&${query}&limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { apikey: target.key, Authorization: `Bearer ${target.key}` },
    });
    if (!response.ok) {
      throw new Error(`GET ${table} (offset ${offset}) failed: HTTP ${response.status} ${await response.text().catch(() => "")}`);
    }
    const page = (await response.json()) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * `fetchAllRows` plus an assertion that the assembled count matches the server's exact count.
 *
 * Use for reads where completeness is a correctness requirement rather than a nicety — a
 * coverage denominator, or the candidate set an identity match is resolved against.
 */
export async function fetchAllRowsVerified<T>(
  target: PostgrestTarget,
  table: string,
  select: string,
  query = "",
  countColumn = "id"
): Promise<{ rows: T[]; expected: number }> {
  const countQuery = query.replace(/(^|&)order=[^&]*/g, "").replace(/^&+/, "");
  const expected = await fetchExactCount(target, table, countQuery, countColumn);
  const rows = await fetchAllRows<T>(target, table, select, query);
  if (rows.length !== expected) {
    throw new Error(`Incomplete read of ${table}: assembled ${rows.length} rows but the server counts ${expected}. Refusing to continue on a partial result.`);
  }
  return { rows, expected };
}
