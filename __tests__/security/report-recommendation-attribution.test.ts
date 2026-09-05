import { describe, expect, test, vi, beforeEach } from "vitest";
import { MockSupabaseClient } from "../stubs/mock-supabase-table";

/**
 * Proves reportRecommendation() (app/(app)/u/[id]/recommendation-actions.ts) derives
 * `reported_user_id` from the recommendation row's own `author_id`, not from a
 * caller-supplied value — found during the feature-flag enforcement audit (docs/
 * feature-flag-enforcement-audit-2026-09-05.md): the original code took a second
 * `reportedUserId` parameter and inserted it verbatim.
 *
 * A correction on that audit's own severity claim, made explicit rather than left to
 * stand: `message_reports`' live RLS policy ("create own report", migration 0064,
 * confirmed applied against oryn-qa-scratch via pg_get_expr(polwithcheck, ...) before
 * writing this test) already cross-checks `reported_user_id = (select author_id from
 * recommendations where id = recommendation_id)` at the database level — so a forged
 * value was never actually insertable in the live database; RLS was already the real,
 * final gate, the same "app-layer check is a friendly-error nicety, RLS is the actual
 * boundary" convention this codebase uses everywhere else (see that migration's own
 * header). This test is about the APPLICATION layer specifically: the old code's own
 * intent was to trust the caller regardless of what RLS would separately do about it,
 * which is still wrong on its own terms (a raw insert bypassing this Server Action
 * entirely was never the only concern — an honest, well-behaved caller building the
 * wrong payload, or a future refactor that moved this insert to the admin client and
 * silently lost the RLS backstop, both matter too). Proven at the application layer
 * because that is the layer with the actual defect; not re-proving the RLS layer, which
 * a prior session already confirmed live and is not part of this fix.
 */

const RECOMMENDATION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const REAL_AUTHOR_ID = "11111111-1111-1111-1111-111111111111";
const REPORTER_ID = "22222222-2222-2222-2222-222222222222";
const UNRELATED_VICTIM_ID = "99999999-9999-9999-9999-999999999999";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, assertWithinRateLimit: vi.fn().mockResolvedValue(undefined) };
});

let adminMock: MockSupabaseClient;
let requestMock: MockSupabaseClient;
let messageReportsRows: Record<string, unknown>[];

vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: () => adminMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => requestMock }));

import { requireUser } from "@/lib/security/dal";
import { reportRecommendation } from "@/app/(app)/u/[id]/recommendation-actions";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: REPORTER_ID, email: "reporter@example.com" });
  messageReportsRows = [];
  adminMock = new MockSupabaseClient({
    recommendations: { rows: [{ id: RECOMMENDATION_ID, author_id: REAL_AUTHOR_ID }] },
  });
  requestMock = new MockSupabaseClient({
    message_reports: { rows: messageReportsRows },
  });
});

describe("reportRecommendation derives reported_user_id from the row, ignoring what a caller might try to supply", () => {
  test("the inserted report names the recommendation's real author", async () => {
    const result = await reportRecommendation(RECOMMENDATION_ID, "inappropriate content");

    expect(result.error).toBeUndefined();
    expect(messageReportsRows).toHaveLength(1);
    expect(messageReportsRows[0].reported_user_id).toBe(REAL_AUTHOR_ID);
    expect(messageReportsRows[0].reported_user_id).not.toBe(UNRELATED_VICTIM_ID);
    expect(messageReportsRows[0].recommendation_id).toBe(RECOMMENDATION_ID);
    expect(messageReportsRows[0].reporter_id).toBe(REPORTER_ID);
  });

  test("the function signature has no parameter through which a caller could name a different victim", () => {
    expect(reportRecommendation.length).toBe(2);
  });

  test("a caller shaped like the OLD (vulnerable) call site still can't influence the reported party", async () => {
    // Simulates the exact call shape the pre-fix code used: (recommendationId,
    // reportedUserId, reason). JS binds positionally regardless of what TypeScript would
    // allow, so the real (2-parameter) function receives UNRELATED_VICTIM_ID as its
    // "reason" argument and silently drops the third — proving the runtime behavior
    // itself has no parameter left to read an attacker-supplied victim id from, not
    // merely that the type signature now disallows passing one.
    const oldShapedCall = reportRecommendation as unknown as (id: string, victim: string, reason: string) => Promise<{ error?: string }>;
    const result = await oldShapedCall(RECOMMENDATION_ID, UNRELATED_VICTIM_ID, "this string is never read");

    // The call still succeeds -- UNRELATED_VICTIM_ID, landing in the "reason" parameter,
    // is a non-empty string like any other and passes that check trivially. What matters
    // is who gets named as reported_user_id, which the real fix derives from the row
    // regardless of this argument's position or content.
    expect(result.error).toBeUndefined();
    expect(messageReportsRows[0].reported_user_id).toBe(REAL_AUTHOR_ID);
    expect(messageReportsRows.find((r) => r.reported_user_id === UNRELATED_VICTIM_ID)).toBeUndefined();
  });
});
