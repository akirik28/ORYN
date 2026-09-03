import { describe, test, expect } from "vitest";
import { getUniversityCardMeta } from "@/lib/universities/browse-page";
import type { University } from "@/types/database";

/**
 * getUniversityCardMeta's tuition resolution (2026-09-03) — the fix for the browse card's
 * own stale "US-only coverage" comment. Real logic worth pinning directly: which of the
 * three raw sources (cost_of_attendance, tuition_international_annual,
 * tuition_domestic_annual) a university's TuitionContext resolves from, and that a
 * university with none of the three simply has no `tuition` key at all (not an
 * "unavailable" one) — the caller's own scope decision (features/universities/
 * university-card.tsx renders nothing for `kind: "unavailable"`) rather than something
 * this function should force.
 *
 * A chainable, table-dispatching mock rather than matching an exact method sequence — this
 * function's own three queries use different chain shapes (.eq().in(), .in().not(),
 * .in().in()), and asserting the literal call sequence would make the test brittle to a
 * harmless reordering rather than testing what the function actually returns.
 */

interface Row {
  [key: string]: unknown;
}

function chain(data: Row[]): PromiseLike<{ data: Row[]; error: null }> & Record<string, (...args: unknown[]) => unknown> {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    not: () => self,
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return self as unknown as PromiseLike<{ data: Row[]; error: null }> & Record<string, (...args: unknown[]) => unknown>;
}

function mockSupabase(tables: { rankings?: Row[]; statistics?: Row[]; metrics?: Row[] }) {
  return {
    from: (table: string) => {
      if (table === "university_rankings") return chain(tables.rankings ?? []);
      if (table === "university_statistics") return chain(tables.statistics ?? []);
      if (table === "university_profile_metrics") return chain(tables.metrics ?? []);
      throw new Error(`browse-page-card-meta.test.ts: unexpected table "${table}"`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function university(id: string): University {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id } as any;
}

const noop = (raw: string[]) => raw;

describe("getUniversityCardMeta — tuition", () => {
  test("a US university with cost_of_attendance resolves kind: cost_of_attendance", async () => {
    const supabase = mockSupabase({ statistics: [{ university_id: "u1", cost_of_attendance: 65000, cost_currency: "USD" }] });
    const meta = await getUniversityCardMeta(supabase, [university("u1")], noop, new Set());
    expect(meta.u1?.tuition?.kind).toBe("cost_of_attendance");
  });

  test("a non-US university with international tuition on file resolves kind: international, previously invisible entirely", async () => {
    const supabase = mockSupabase({
      metrics: [{ university_id: "u2", metric_code: "tuition_international_annual", value_text: null, value_numeric: 9250, unit: "GBP/year", precision_state: "exact" }],
    });
    const meta = await getUniversityCardMeta(supabase, [university("u2")], noop, new Set());
    expect(meta.u2?.tuition?.kind).toBe("international");
    expect(meta.u2?.tuition?.displayValue).toContain("9,250");
  });

  test("domestic-only tuition (no international figure) resolves kind: domestic", async () => {
    const supabase = mockSupabase({
      metrics: [{ university_id: "u3", metric_code: "tuition_domestic_annual", value_text: null, value_numeric: 0, unit: "EUR/year", precision_state: "exact" }],
    });
    const meta = await getUniversityCardMeta(supabase, [university("u3")], noop, new Set());
    expect(meta.u3?.tuition?.kind).toBe("domestic");
    expect(meta.u3?.tuition?.displayValue).toBe("Free"); // real German-style €0, not missing data
  });

  test("cost_of_attendance still wins over a co-existing tuition row -- never blended, matching deriveTuitionContext's own priority", async () => {
    const supabase = mockSupabase({
      statistics: [{ university_id: "u4", cost_of_attendance: 65000, cost_currency: "USD" }],
      metrics: [{ university_id: "u4", metric_code: "tuition_international_annual", value_text: null, value_numeric: 40000, unit: "GBP/year", precision_state: "exact" }],
    });
    const meta = await getUniversityCardMeta(supabase, [university("u4")], noop, new Set());
    expect(meta.u4?.tuition?.kind).toBe("cost_of_attendance");
  });

  test("a university with none of the three sources has no tuition key at all -- the caller's own scope decision, not forced here", async () => {
    const supabase = mockSupabase({});
    const meta = await getUniversityCardMeta(supabase, [university("u5")], noop, new Set());
    expect(meta.u5?.tuition).toBeUndefined();
  });

  test("a per-credit tuition code is out of scope, same as the detail page -- does not surface a tuition figure", async () => {
    const supabase = mockSupabase({
      metrics: [{ university_id: "u6", metric_code: "tuition_international_per_credit", value_text: null, value_numeric: 500, unit: "USD/credit", precision_state: "exact" }],
    });
    const meta = await getUniversityCardMeta(supabase, [university("u6")], noop, new Set());
    expect(meta.u6?.tuition).toBeUndefined();
  });

  test("multiple universities in one page each resolve their own tuition independently", async () => {
    const supabase = mockSupabase({
      statistics: [{ university_id: "u7", cost_of_attendance: 40000, cost_currency: "USD" }],
      metrics: [{ university_id: "u8", metric_code: "tuition_international_annual", value_text: null, value_numeric: 12000, unit: "EUR/year", precision_state: "approximate" }],
    });
    const meta = await getUniversityCardMeta(supabase, [university("u7"), university("u8"), university("u9")], noop, new Set());
    expect(meta.u7?.tuition?.kind).toBe("cost_of_attendance");
    expect(meta.u8?.tuition?.kind).toBe("international");
    expect(meta.u9?.tuition).toBeUndefined();
  });

  test("locale is threaded through to the resolved tuition text", async () => {
    const supabase = mockSupabase({
      metrics: [{ university_id: "u10", metric_code: "tuition_international_annual", value_text: null, value_numeric: 9250, unit: "GBP/year", precision_state: "range" }],
    });
    const metaEn = await getUniversityCardMeta(supabase, [university("u10")], noop, new Set(), "en");
    const metaTr = await getUniversityCardMeta(supabase, [university("u10")], noop, new Set(), "tr");
    expect(metaEn.u10?.tuition?.displayValue).toMatch(/^From /);
    expect(metaTr.u10?.tuition?.displayValue).toMatch(/^Başlangıç /);
  });
});
