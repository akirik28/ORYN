import { describe, expect, test } from "vitest";
import { buildParentInviteEmail } from "@/lib/parent/invite-email";
import { PARENT_INVITE_WINDOW_DAYS } from "@/lib/parent/invite-token";

/**
 * No next-intl mock — getTranslations({locale, namespace}) (the explicit-locale overload
 * buildParentInviteEmail uses) resolves the real message catalogs correctly outside request
 * scope, same as __tests__/opportunities/notify-newly-eligible-matches.test.ts's own
 * precedent for the identical call shape. This runs the real messages/en.json and
 * messages/tr.json content, which is the point: a regression here should mean the actual
 * catalog changed, not a mock drifting from it.
 */
describe("buildParentInviteEmail", () => {
  const acceptUrl = "https://proxola.com/parent-invite/abc123";

  test("English content names the student, states the expiry window, and includes the accept URL", async () => {
    const { subject, body } = await buildParentInviteEmail({ locale: "en", studentDisplayName: "Ada", acceptUrl });
    expect(subject).toContain("Ada");
    expect(subject.toLowerCase()).toContain("proxola");
    expect(body).toContain(String(PARENT_INVITE_WINDOW_DAYS));
    expect(body).toContain(acceptUrl);
  });

  test("Turkish content names the student, states the expiry window, and includes the accept URL", async () => {
    const { subject, body } = await buildParentInviteEmail({ locale: "tr", studentDisplayName: "Ada", acceptUrl });
    expect(subject).toContain("Ada");
    expect(body).toContain(String(PARENT_INVITE_WINDOW_DAYS));
    expect(body).toContain(acceptUrl);
  });

  /**
   * P4's core promise (docs/veli-hesabi-spec-2026-09-04.md §K1, §K6, G13) — regression guard
   * against exactly the failure this feature exists to prevent: an invite that reads as full
   * access. Every generated message must say, in both languages, that access is read-only
   * and that specific things stay private. If this ever starts failing, the copy changed in
   * a way that silently drops the one promise the whole feature is built around.
   */
  test.each([
    { locale: "en" as const, mustContain: ["advisor", "can't change"] },
    { locale: "tr" as const, mustContain: ["danışman", "değiştiremezsin"] },
  ])("$locale content states what stays private, not just what's visible", async ({ locale, mustContain }) => {
    const { body } = await buildParentInviteEmail({ locale, studentDisplayName: "Ada", acceptUrl });
    for (const phrase of mustContain) {
      expect(body.toLowerCase()).toContain(phrase.toLowerCase());
    }
  });

  test("mentions Premium's weekly AI summary (G6) in both languages", async () => {
    const en = await buildParentInviteEmail({ locale: "en", studentDisplayName: "Ada", acceptUrl });
    const tr = await buildParentInviteEmail({ locale: "tr", studentDisplayName: "Ada", acceptUrl });
    expect(en.body.toLowerCase()).toContain("premium");
    expect(tr.body.toLowerCase()).toContain("premium");
  });
});
