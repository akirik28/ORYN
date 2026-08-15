import { describe, expect, test } from "vitest";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";

describe("RATE_LIMITS", () => {
  test("every configured action has sane, positive thresholds", () => {
    for (const [action, config] of Object.entries(RATE_LIMITS)) {
      expect(config.maxCalls, `${action}.maxCalls`).toBeGreaterThan(0);
      expect(config.windowMinutes, `${action}.windowMinutes`).toBeGreaterThan(0);
    }
  });

  // Regression guard for the confirmed gap (docs/qa-environment-readiness-audit.md §8):
  // "no rate limit on sendMessage, sendConnectionRequest, blockUser, or reportMessage".
  test.each(["send_message", "send_connection_request", "report_message"])("%s is configured", (action) => {
    expect(RATE_LIMITS).toHaveProperty(action);
  });
});
