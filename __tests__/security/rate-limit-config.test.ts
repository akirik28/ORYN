import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";

function read(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("RATE_LIMITS", () => {
  test("every configured action has sane, positive thresholds", () => {
    for (const [action, config] of Object.entries(RATE_LIMITS)) {
      expect(config.maxCalls, `${action}.maxCalls`).toBeGreaterThan(0);
      expect(config.windowMinutes, `${action}.windowMinutes`).toBeGreaterThan(0);
    }
  });

  // Regression guard for the confirmed gap (docs/qa-environment-readiness-audit.md §8):
  // "no rate limit on sendMessage, sendConnectionRequest, blockUser, or reportMessage".
  test.each(["send_message", "send_connection_request", "report_message", "report_recommendation"])(
    "%s is configured",
    (action) => {
      expect(RATE_LIMITS).toHaveProperty(action);
    }
  );

  // Security Gate 1 second-pass review (2026-08-29): report_recommendation was added to
  // close a real bug (reportRecommendation was reusing report_message's key, silently
  // pooling two unrelated report surfaces' budgets). Two things must both be true for that
  // fix to actually hold, neither of which the "is configured" check above proves on its
  // own: the two keys must be genuinely distinct strings (not one a substring/prefix of the
  // other, which would matter if any future storage layer ever moved to prefix matching),
  // and the call site that used to share the key must now actually use the new one — a
  // config entry existing proves nothing about whether anything reads it.
  test("report_message and report_recommendation are distinct keys, neither a prefix of the other", () => {
    expect(RATE_LIMITS).toHaveProperty("report_message");
    expect(RATE_LIMITS).toHaveProperty("report_recommendation");
    expect("report_message").not.toBe("report_recommendation");
    expect("report_recommendation".startsWith("report_message")).toBe(false);
    expect("report_message".startsWith("report_recommendation")).toBe(false);
  });

  test("reportRecommendation actually uses report_recommendation, not report_message, as its rate-limit key", () => {
    const src = read("app/(app)/u/[id]/recommendation-actions.ts");
    expect(src).toContain('assertWithinRateLimit(session.userId!, "report_recommendation", RATE_LIMITS.report_recommendation)');
    expect(src).not.toContain('assertWithinRateLimit(session.userId!, "report_message"');
  });

  test("reportMessage still uses its own report_message key, unaffected by the split", () => {
    const src = read("app/(app)/messages/actions.ts");
    expect(src).toContain('assertWithinRateLimit(session.userId!, "report_message", RATE_LIMITS.report_message)');
  });
});
