import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, type RateLimitStore } from "@/lib/security/rate-limit-core";
import { RateLimitExceededError } from "@/lib/errors/rate-limit-exceeded";

/** Deterministic in-memory model of the real store's contract
 * (lib/security/rate-limit.ts's supabaseRateLimitStore): per-user, per-action,
 * time-windowed counting, with the same "null count / thrown record = fail open"
 * failure modes the production Supabase-backed store actually has. */
class InMemoryRateLimitStore implements RateLimitStore {
  events: { userId: string; action: string; at: number }[] = [];
  failCount = false;
  failRecord = false;

  async countSince(userId: string, action: string, sinceIso: string): Promise<number | null> {
    if (this.failCount) return null;
    const since = new Date(sinceIso).getTime();
    return this.events.filter((e) => e.userId === userId && e.action === action && e.at >= since).length;
  }

  async record(userId: string, action: string): Promise<void> {
    if (this.failRecord) throw new Error("simulated storage failure");
    this.events.push({ userId, action, at: Date.now() });
  }

  seed(userId: string, action: string, count: number, at = Date.now()) {
    for (let i = 0; i < count; i++) this.events.push({ userId, action, at });
  }
}

const OPTS = { maxCalls: 5, windowMinutes: 10 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit — boundary behavior", () => {
  test("under the limit: allowed, and records the call", async () => {
    const store = new InMemoryRateLimitStore();
    store.seed("user-a", "send_message", OPTS.maxCalls - 1);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).resolves.toBeUndefined();
    expect(store.events.filter((e) => e.userId === "user-a").length).toBe(OPTS.maxCalls);
  });

  test("at exactly the limit: the next call is rejected", async () => {
    const store = new InMemoryRateLimitStore();
    store.seed("user-a", "send_message", OPTS.maxCalls);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).rejects.toThrow(RateLimitExceededError);
    // Rejected calls don't get recorded — nothing to record, the action itself is denied.
    expect(store.events.filter((e) => e.userId === "user-a").length).toBe(OPTS.maxCalls);
  });

  test("over the limit: still rejected, doesn't un-block with excess count", async () => {
    const store = new InMemoryRateLimitStore();
    store.seed("user-a", "send_message", OPTS.maxCalls * 2);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).rejects.toThrow(RateLimitExceededError);
  });
});

describe("checkRateLimit — window reset", () => {
  test("events older than the window don't count", async () => {
    const store = new InMemoryRateLimitStore();
    const outsideWindow = Date.now() - (OPTS.windowMinutes * 60_000 + 1_000); // 1s before window start
    store.seed("user-a", "send_message", OPTS.maxCalls, outsideWindow);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).resolves.toBeUndefined();
  });

  test("events just inside the window still count", async () => {
    const store = new InMemoryRateLimitStore();
    const insideWindow = Date.now() - (OPTS.windowMinutes * 60_000 - 1_000); // 1s after window start
    store.seed("user-a", "send_message", OPTS.maxCalls, insideWindow);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).rejects.toThrow(RateLimitExceededError);
  });

  test("advancing past the window lifts a previously-hit limit", async () => {
    const store = new InMemoryRateLimitStore();
    store.seed("user-a", "send_message", OPTS.maxCalls);
    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).rejects.toThrow(RateLimitExceededError);

    vi.setSystemTime(new Date(Date.now() + OPTS.windowMinutes * 60_000 + 1_000));

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).resolves.toBeUndefined();
  });
});

describe("checkRateLimit — isolation", () => {
  test("distinct user isolation: user B is unaffected by user A hitting the limit", async () => {
    const store = new InMemoryRateLimitStore();
    store.seed("user-a", "send_message", OPTS.maxCalls);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).rejects.toThrow(RateLimitExceededError);
    await expect(checkRateLimit(store, "user-b", "send_message", OPTS)).resolves.toBeUndefined();
  });

  test("distinct action isolation: the same user hitting one action's limit doesn't affect another action", async () => {
    const store = new InMemoryRateLimitStore();
    store.seed("user-a", "send_message", OPTS.maxCalls);

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).rejects.toThrow(RateLimitExceededError);
    await expect(checkRateLimit(store, "user-a", "send_connection_request", OPTS)).resolves.toBeUndefined();
  });
});

describe("checkRateLimit — fail-open behavior", () => {
  test("a storage failure while counting is treated as zero recent calls, not a block", async () => {
    const store = new InMemoryRateLimitStore();
    store.failCount = true;

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).resolves.toBeUndefined();
  });

  test("a storage failure while recording this call is swallowed — never blocks the action it's guarding", async () => {
    const store = new InMemoryRateLimitStore();
    store.failRecord = true;

    await expect(checkRateLimit(store, "user-a", "send_message", OPTS)).resolves.toBeUndefined();
  });
});
