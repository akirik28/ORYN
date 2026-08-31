import { describe, expect, it } from "vitest";
import { MAX_TAG_LENGTH, redactHeaders, redactPath, redactTags, redactValue, truncate } from "@/lib/monitoring/redact";

describe("redactPath", () => {
  it("drops the query string, where ids and tokens end up", () => {
    expect(redactPath("/opportunities?token=abc123&email=a@b.com")).toBe("/opportunities");
  });

  it("drops the fragment", () => {
    expect(redactPath("/universities#section")).toBe("/universities");
  });

  it("leaves a clean path untouched", () => {
    expect(redactPath("/api/jobs/deadline-reminders")).toBe("/api/jobs/deadline-reminders");
  });
});

describe("redactHeaders", () => {
  it("keeps only allow-listed headers", () => {
    const result = redactHeaders({ "user-agent": "curl/8", referer: "https://oryn.app/x", "content-type": "application/json" });
    expect(result).toEqual({ "user-agent": "curl/8", referer: "https://oryn.app/x", "content-type": "application/json" });
  });

  it("never forwards credentials, cookies or session headers", () => {
    const result = redactHeaders({ authorization: "Bearer supersecret", cookie: "sb-access-token=xyz", "x-supabase-auth": "tok" });
    expect(result).toEqual({});
    expect(JSON.stringify(result)).not.toContain("supersecret");
  });

  it("is case-insensitive about header names", () => {
    expect(redactHeaders({ "User-Agent": "Mozilla" })).toEqual({ "user-agent": "Mozilla" });
  });

  it("joins array-valued headers", () => {
    expect(redactHeaders({ "accept-language": ["tr", "en"] })).toEqual({ "accept-language": "tr, en" });
  });

  it("returns an empty object for undefined", () => {
    expect(redactHeaders(undefined)).toEqual({});
  });

  it("skips a present-but-valueless header (Next's Dict allows undefined)", () => {
    expect(redactHeaders({ "user-agent": undefined, referer: "https://oryn.app" })).toEqual({ referer: "https://oryn.app" });
  });
});

describe("redactValue", () => {
  it("redacts secret-looking keys at any depth", () => {
    const result = redactValue({ outer: { apiKey: "sk-live-123", nested: { session_token: "t" } }, safe: "ok" });
    expect(JSON.stringify(result)).not.toContain("sk-live-123");
    expect(result).toEqual({ outer: { apiKey: "[redacted]", nested: { session_token: "[redacted]" } }, safe: "ok" });
  });

  it("truncates long strings so one error can't upload a megabyte", () => {
    const result = redactValue("x".repeat(5000)) as string;
    expect(result.length).toBeLessThan(1100);
    expect(result).toContain("truncated");
  });

  it("bounds depth instead of recursing forever", () => {
    expect(redactValue({ a: { b: { c: { d: "deep" } } } })).toEqual({ a: { b: { c: "[depth limit]" } } });
  });

  it("survives a cyclic object", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    expect(() => redactValue(cyclic)).not.toThrow();
  });

  it("caps array length", () => {
    expect((redactValue(Array.from({ length: 100 }, (_, i) => i)) as unknown[]).length).toBe(20);
  });

  it("reduces an Error to name and message, never its stack", () => {
    expect(redactValue(new TypeError("bad input"))).toEqual({ name: "TypeError", message: "bad input" });
  });

  it("reports the type of exotic values rather than the value", () => {
    expect(redactValue(() => "secret")).toBe("[function]");
  });

  it("passes primitives through", () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(null)).toBe(null);
  });
});

describe("redactTags", () => {
  it("drops undefined values and truncates to Sentry's 200-char tag ceiling", () => {
    const result = redactTags({ route: "a".repeat(400), missing: undefined });
    expect(result.missing).toBeUndefined();
    expect(result.route.length).toBeLessThanOrEqual(MAX_TAG_LENGTH + 20);
  });

  it("redacts a secret-looking tag key", () => {
    expect(redactTags({ auth_token: "abc" })).toEqual({ auth_token: "[redacted]" });
  });
});

describe("truncate", () => {
  it("leaves short strings alone", () => {
    expect(truncate("short")).toBe("short");
  });
});
