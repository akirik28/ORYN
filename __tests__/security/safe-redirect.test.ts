import { describe, expect, test } from "vitest";
import { isSafeRedirectTarget } from "@/lib/security/safe-redirect";

describe("isSafeRedirectTarget", () => {
  test.each(["/dashboard", "/messages/123", "/", "/profile?tab=activities"])(
    "accepts same-origin relative path %s",
    (path) => {
      expect(isSafeRedirectTarget(path)).toBe(true);
    }
  );

  // Regression guard for the open-redirect found auditing app/auth/confirm/route.ts:
  // `next` comes straight from an emailed confirmation link's query string.
  test.each([
    "https://evil.com/phish",
    "http://evil.com",
    "//evil.com", // protocol-relative — still resolves to an external host in a browser
    "javascript:alert(1)",
    "not-a-path",
    "",
  ])("rejects unsafe target %s", (path) => {
    expect(isSafeRedirectTarget(path)).toBe(false);
  });
});
