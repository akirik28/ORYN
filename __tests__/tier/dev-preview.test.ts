import { describe, expect, test, afterEach, vi } from "vitest";
import { isDevTierPreviewAllowed, resolveDevTierPreviewOverride } from "@/lib/tier/dev-preview";

/**
 * The one property that matters most here: this is structurally incapable of setting
 * "ultra" in a production build, checked directly against `process.env.NODE_ENV` rather
 * than trusted from the code's own shape.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDevTierPreviewAllowed", () => {
  test("false in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevTierPreviewAllowed()).toBe(false);
  });

  test("true outside production (development, test, or anything else)", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevTierPreviewAllowed()).toBe(true);
    vi.stubEnv("NODE_ENV", "test");
    expect(isDevTierPreviewAllowed()).toBe(true);
  });
});

describe("resolveDevTierPreviewOverride", () => {
  test("production: returns null regardless of cookie value — even a literal 'ultra'", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveDevTierPreviewOverride("ultra")).toBeNull();
    expect(resolveDevTierPreviewOverride("standard")).toBeNull();
  });

  test("non-production: a real cookie value passes through", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveDevTierPreviewOverride("ultra")).toBe("ultra");
    expect(resolveDevTierPreviewOverride("standard")).toBe("standard");
  });

  test("non-production: an absent or garbage cookie value is null, not a crash", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveDevTierPreviewOverride(undefined)).toBeNull();
    expect(resolveDevTierPreviewOverride("not-a-real-tier")).toBeNull();
  });
});
