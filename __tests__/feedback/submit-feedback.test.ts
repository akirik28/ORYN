import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * submitFeedback (app/(app)/feedback/actions.ts) — migration 0113, proposed and not yet
 * applied. Same degrade discipline as curriculum_other_text (0109): a write against a
 * table that doesn't exist yet must return a distinguishable, honest "not_configured"
 * reason, never a generic failure and never a false success — see this repo's own
 * feedback_check_the_right_authority_for_state / feedback_code_paired_with_an_unapplied_
 * migration_must_degrade discipline. Two real Supabase calls happen in sequence (read
 * profiles.plan_tier, then insert feedback_reports), which is what makes this action worth
 * its own mock rather than reusing curriculum-other-text.test.ts's single-table shape.
 */

vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn() }));

const { singleMock, insertMock } = vi.hoisted(() => ({ singleMock: vi.fn(), insertMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: singleMock }) }) };
      }
      if (table === "feedback_reports") {
        return { insert: insertMock };
      }
      throw new Error(`submit-feedback.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { submitFeedback } from "@/app/(app)/feedback/actions";
import { requireUser } from "@/lib/security/dal";
import { resolveLocale } from "@/lib/i18n/locale";

const USER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  vi.mocked(resolveLocale).mockResolvedValue("en");
  singleMock.mockReset();
  insertMock.mockReset();
});

describe("submitFeedback — happy path", () => {
  test("trims the message, strips query/hash from path, and inserts only server-derived context", async () => {
    singleMock.mockResolvedValue({ data: { plan_tier: "standard" }, error: null });
    insertMock.mockResolvedValue({ error: null });

    const result = await submitFeedback({ message: "  Something is broken on the dashboard  ", path: "/dashboard?ref=email#section" });

    expect(result).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith({
      user_id: USER_ID,
      message: "Something is broken on the dashboard",
      path: "/dashboard",
      locale: "en",
      plan_tier: "standard",
    });
  });

  test("an empty path string falls back to '/' rather than an empty string", async () => {
    singleMock.mockResolvedValue({ data: { plan_tier: "standard" }, error: null });
    insertMock.mockResolvedValue({ error: null });

    await submitFeedback({ message: "test", path: "" });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ path: "/" }));
  });

  test("a message longer than the 2000-character cap is truncated before it ever reaches the database", async () => {
    singleMock.mockResolvedValue({ data: { plan_tier: "standard" }, error: null });
    insertMock.mockResolvedValue({ error: null });

    await submitFeedback({ message: "a".repeat(2500), path: "/dashboard" });

    const inserted = insertMock.mock.calls[0][0] as { message: string };
    expect(inserted.message).toHaveLength(2000);
  });

  test("a null plan_tier on the profile row falls back to 'standard', not null", async () => {
    singleMock.mockResolvedValue({ data: { plan_tier: null }, error: null });
    insertMock.mockResolvedValue({ error: null });

    await submitFeedback({ message: "test", path: "/dashboard" });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ plan_tier: "standard" }));
  });
});

describe("submitFeedback — empty message never reaches the database", () => {
  test("a whitespace-only message returns reason: empty without calling insert", async () => {
    const result = await submitFeedback({ message: "   ", path: "/dashboard" });

    expect(result).toEqual({ success: false, reason: "empty" });
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("submitFeedback — migration 0113 unapplied", () => {
  test("a PGRST205 on feedback_reports returns reason: not_configured, not the generic failure", async () => {
    singleMock.mockResolvedValue({ data: { plan_tier: "standard" }, error: null });
    insertMock.mockResolvedValue({ error: { code: "PGRST205", message: "Could not find the table 'public.feedback_reports' in the schema cache" } });

    const result = await submitFeedback({ message: "test", path: "/dashboard" });

    expect(result).toEqual({ success: false, reason: "not_configured" });
  });
});

describe("submitFeedback — a real failure stays reason: failed, the not_configured branch is narrow", () => {
  test("an unrelated insert error (not a missing-table shape) returns reason: failed", async () => {
    singleMock.mockResolvedValue({ data: { plan_tier: "standard" }, error: null });
    insertMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });

    const result = await submitFeedback({ message: "test", path: "/dashboard" });

    expect(result).toEqual({ success: false, reason: "failed" });
  });

  test("failing to load plan_tier also returns reason: failed, and never attempts the insert", async () => {
    singleMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });

    const result = await submitFeedback({ message: "test", path: "/dashboard" });

    expect(result).toEqual({ success: false, reason: "failed" });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
