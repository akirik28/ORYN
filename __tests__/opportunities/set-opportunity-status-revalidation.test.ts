import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Proves the 2026-09-04 fix to setOpportunityStatus (app/(app)/opportunities/actions.ts):
 * it now revalidates both "/opportunities" and "/dashboard" on every successful save, matching
 * addTargetUniversity's own save-then-check-dashboard shape (app/(app)/universities/actions.ts,
 * which revalidates "/universities" AND "/dashboard"). Before this fix, only "/opportunities"
 * was revalidated.
 *
 * Honest scope note: this proves the CODE-LEVEL fix -- the revalidatePath("/dashboard") call
 * now actually happens. It deliberately does NOT claim (and nothing below should be read as
 * claiming) that this produces any visible change on the dashboard today. It does not: checked
 * directly, app/(app)/dashboard/page.tsx's opportunity preview is built entirely from
 * `opportunity_matches` and never reads `saved_opportunities` at all, so there is currently
 * nothing on that page for this revalidation to invalidate. The fix is still correct and worth
 * having -- consistent with the university pattern, and it stops being a silent gap the day the
 * dashboard preview starts reflecting saved status -- but a same-file "before/after dashboard
 * render" test would have nothing real to show, since both renders would be identical. The
 * dashboard-level render technique (see __tests__/universities/compare-page-render.test.tsx) is
 * reserved for cases where the target page actually reads the data the action writes; this one
 * doesn't, so component-level proof of the revalidatePath calls themselves is the correct and
 * complete level of proof here.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn() }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: vi.fn() }));

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "saved_opportunities") throw new Error(`set-opportunity-status-revalidation.test.ts: unexpected table "${table}"`);
      return { upsert: upsertMock };
    },
  }),
}));

import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import { requireUser } from "@/lib/security/dal";
import { resolveLocale } from "@/lib/i18n/locale";
import { logEvent } from "@/lib/analytics/log";
import { revalidatePath } from "next/cache";

const USER_ID = "22222222-2222-2222-2222-222222222222";
const OPPORTUNITY_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  vi.mocked(resolveLocale).mockResolvedValue("en");
  vi.mocked(logEvent).mockResolvedValue(undefined);
  upsertMock.mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("setOpportunityStatus — revalidation (2026-09-04 dashboard fix)", () => {
  test("saving successfully revalidates BOTH /opportunities and /dashboard, not just the former", async () => {
    upsertMock.mockResolvedValue({ error: null });

    const result = await setOpportunityStatus({ opportunityId: OPPORTUNITY_ID, status: "saved" });

    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith("/opportunities");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  test("the same two-path revalidation also fires for 'applied' and 'not_interested' -- unconditional on status, not just the 'saved' branch", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await setOpportunityStatus({ opportunityId: OPPORTUNITY_ID, status: "applied" });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");

    vi.mocked(revalidatePath).mockReset();
    upsertMock.mockResolvedValue({ error: null });

    await setOpportunityStatus({ opportunityId: OPPORTUNITY_ID, status: "not_interested", notInterestedReason: "too_competitive" });
    expect(revalidatePath).toHaveBeenCalledWith("/opportunities");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  test("a failed upsert revalidates NEITHER path -- nothing saved, dashboard and opportunities must not act as if it did", async () => {
    upsertMock.mockResolvedValue({ error: { code: "23503", message: "foreign key violation" } });

    const result = await setOpportunityStatus({ opportunityId: OPPORTUNITY_ID, status: "saved" });

    expect(result.error).toBeDefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("upsert payload targets the correct conflict key -- one row per (user, opportunity), matching the schema's own unique constraint", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await setOpportunityStatus({ opportunityId: OPPORTUNITY_ID, status: "saved" });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, opportunity_id: OPPORTUNITY_ID, status: "saved" }),
      { onConflict: "user_id,opportunity_id" }
    );
  });
});
