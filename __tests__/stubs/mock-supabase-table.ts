/**
 * A minimal, in-memory Supabase query-builder mock that actually simulates row filtering,
 * rather than just recording which chain methods were called with which arguments.
 *
 * Built for lib/parent/links.ts's coverage gap (CEO/oryn-45, 2026-09-04): "prove the code
 * agrees with the [RLS] policy" needs more than "the mock's .eq() spy saw
 * ('student_user_id', studentId)" — a subtly wrong value, a swapped column, or a missing
 * filter would all still make that assertion pass. This mock instead applies `.eq()`/`.neq()`
 * predicates against real in-memory rows and only returns what actually matches, the same
 * shape of proof a real Postgres `WHERE` clause gives. A test can seed a row that belongs to
 * student A, call the function under test as student B, and assert on the *result*
 * (`count: 0`, `data: null`) rather than trusting that the right-looking calls were made.
 *
 * Scope is deliberately narrow: `.select()` / `.insert()` / `.update()`, `.eq()` / `.neq()`,
 * `.order()` (accepted, no-op — nothing under test depends on ordering correctness),
 * `.maybeSingle()`, and `{ count: "exact" }` on `.select()`/`.update()`. Add to this file
 * rather than building a second, competing mock the next time a lib/ module needs one of
 * these — CEO's own framing for why this harness exists at all: "it stops being a one-off."
 */

export interface MockRow {
  [key: string]: unknown;
}

export interface MockPostgrestError {
  code: string;
  message: string;
}

interface UniqueConstraint {
  name: string;
  columns: string[];
}

export interface MockTableConfig {
  rows?: MockRow[];
  /** Every operation against this table resolves as if the table itself doesn't exist yet —
   * PGRST205/42P01, matching lib/supabase/errors.ts's isUndefinedTableError. This is the
   * *steady state* for parent_links in production today, not an edge case (CEO, 2026-09-04) —
   * every function's degrade path needs a test that sets this. */
  missing?: boolean;
  /** A column named in an .update()/.insert() payload against this key returns
   * PGRST204/42703 (isUndefinedColumnError) instead of applying the write. */
  missingColumns?: string[];
  /** Checked on .insert() only. A new row whose values collide with an existing row on every
   * listed column returns 23505 (isUniqueViolation) instead of inserting. */
  uniqueConstraints?: UniqueConstraint[];
  /** Every operation against this table returns exactly this error — for proving a caller's
   * generic (non-degrade) error branch actually fires and surfaces the right message, distinct
   * from `missing`/`missingColumns`, which simulate two specific, recognized error shapes. */
  forceError?: MockPostgrestError;
}

type Filter = { col: string; op: "eq" | "neq"; val: unknown };

function undefinedTableError(table: string): MockPostgrestError {
  return { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` };
}

function undefinedColumnError(table: string, column: string): MockPostgrestError {
  return { code: "PGRST204", message: `Could not find the '${column}' column of '${table}' in the schema cache` };
}

function uniqueViolationError(constraint: UniqueConstraint): MockPostgrestError {
  return { code: "23505", message: `duplicate key value violates unique constraint "${constraint.name}"` };
}

class MockQueryBuilder {
  private filters: Filter[] = [];
  private mode: "select" | "update" | "insert" = "select";
  private updateValues: MockRow | null = null;
  private insertValues: MockRow | null = null;
  private wantCount = false;
  private wantSingle = false;
  private wantExactlyOne = false;

  constructor(
    private readonly tableName: string,
    private readonly config: MockTableConfig
  ) {}

  select(_columns?: string, opts?: { count?: string; head?: boolean }): this {
    this.mode = "select";
    if (opts?.count) this.wantCount = true;
    return this;
  }

  update(values: MockRow, opts?: { count?: string }): this {
    this.mode = "update";
    this.updateValues = values;
    if (opts?.count) this.wantCount = true;
    return this;
  }

  insert(values: MockRow): this {
    this.mode = "insert";
    this.insertValues = values;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  order(): this {
    return this;
  }

  maybeSingle(): this {
    this.wantSingle = true;
    return this;
  }

  /** Real Postgrest semantics, not maybeSingle's — 0 or 2+ matches is PGRST116, an error, not
   * a quiet null. Added for buildStudentAdvisorContext's own `.select("*").eq("id",
   * userId).single()` profile read, which a 0-match/2-match fixture bug should fail loudly
   * against, the same way it would against a real database. */
  single(): this {
    this.wantSingle = true;
    this.wantExactlyOne = true;
    return this;
  }

  private matchingRows(): MockRow[] {
    const rows = this.config.rows ?? [];
    return rows.filter((row) => this.filters.every((f) => (f.op === "eq" ? row[f.col] === f.val : row[f.col] !== f.val)));
  }

  // Thenable, not a real Promise — this is what lets `await supabase.from(...).eq(...)` work
  // without a `.select()`/terminal call, matching the real supabase-js query builder shape.
  then<TResult1, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: MockPostgrestError | null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const result = this.resolve();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private resolve(): { data: unknown; error: MockPostgrestError | null; count: number | null } {
    if (this.config.forceError) {
      return { data: null, error: this.config.forceError, count: null };
    }
    if (this.config.missing) {
      return { data: null, error: undefinedTableError(this.tableName), count: null };
    }

    if (this.mode === "insert") {
      const values = this.insertValues!;
      const missingCol = (this.config.missingColumns ?? []).find((c) => c in values);
      if (missingCol) return { data: null, error: undefinedColumnError(this.tableName, missingCol), count: null };

      const rows = this.config.rows ?? [];
      for (const constraint of this.config.uniqueConstraints ?? []) {
        const collides = rows.some((row) => constraint.columns.every((c) => row[c] === values[c]));
        if (collides) return { data: null, error: uniqueViolationError(constraint), count: null };
      }
      rows.push({ ...values });
      return { data: null, error: null, count: null };
    }

    if (this.mode === "update") {
      const values = this.updateValues!;
      const missingCol = (this.config.missingColumns ?? []).find((c) => c in values);
      if (missingCol) return { data: null, error: undefinedColumnError(this.tableName, missingCol), count: null };

      const matches = this.matchingRows();
      for (const row of matches) Object.assign(row, values);
      return { data: null, error: null, count: this.wantCount ? matches.length : null };
    }

    // select
    const matches = this.matchingRows();
    if (this.wantExactlyOne && matches.length !== 1) {
      return {
        data: null,
        error: { code: "PGRST116", message: `JSON object requested, multiple (or no) rows returned` },
        count: null,
      };
    }
    if (this.wantSingle) return { data: matches[0] ?? null, error: null, count: null };
    return { data: matches, error: null, count: this.wantCount ? matches.length : null };
  }
}

/**
 * Shaped like just enough of `SupabaseClient<Database>` for lib/parent/links.ts's own calls
 * (`.from(table)...`) — not a full mock of the real client. Cast at the call site
 * (`as unknown as SupabaseClient<Database>`) the same way other lightweight fixtures in this
 * test suite narrow a partial shape to the real type.
 */
export class MockSupabaseClient {
  constructor(private readonly config: Record<string, MockTableConfig>) {}

  from(tableName: string): MockQueryBuilder {
    if (!(tableName in this.config)) {
      throw new Error(`MockSupabaseClient: table "${tableName}" has no configured fixture — add it to the config passed in.`);
    }
    return new MockQueryBuilder(tableName, this.config[tableName]);
  }
}
