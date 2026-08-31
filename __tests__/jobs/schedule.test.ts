import { describe, expect, it } from "vitest";
import { isJobStale, isRunStuck, ONE_DAY_MS, ONE_HOUR_MS, STALE_MULTIPLIER, STUCK_RUNNING_THRESHOLD_MS, JOB_DEFINITIONS } from "@/lib/jobs/schedule";

const NOW = new Date("2026-08-31T12:00:00Z");
const DAILY = { expectedIntervalMs: ONE_DAY_MS };

describe("isJobStale", () => {
  it("is stale when the job has never run", () => {
    expect(isJobStale(DAILY, null, NOW)).toBe(true);
  });

  it("is not stale right after a run", () => {
    expect(isJobStale(DAILY, NOW, NOW)).toBe(false);
  });

  it("is not stale within the expected interval", () => {
    const twelveHoursAgo = new Date(NOW.getTime() - 12 * ONE_HOUR_MS);
    expect(isJobStale(DAILY, twelveHoursAgo, NOW)).toBe(false);
  });

  it("tolerates Vercel Hobby's up-to-59-minute scheduling jitter without flagging stale", () => {
    // Worst case for a nominally-24h job: previous run fired right at the top of its
    // window, next run fires at the very end of its own — a ~24h59m real gap that's still
    // completely normal, not a sign anything broke.
    const justUnder25Hours = new Date(NOW.getTime() - (ONE_DAY_MS + 59 * 60 * 1000));
    expect(isJobStale(DAILY, justUnder25Hours, NOW)).toBe(false);
  });

  it("is stale once the multiplier threshold is exceeded", () => {
    const justOverThreshold = new Date(NOW.getTime() - DAILY.expectedIntervalMs * STALE_MULTIPLIER - 1000);
    expect(isJobStale(DAILY, justOverThreshold, NOW)).toBe(true);
  });

  it("is not stale exactly at the threshold boundary", () => {
    const exactlyAtThreshold = new Date(NOW.getTime() - DAILY.expectedIntervalMs * STALE_MULTIPLIER);
    expect(isJobStale(DAILY, exactlyAtThreshold, NOW)).toBe(false);
  });

  it("scales with a job's own interval, not a fixed constant", () => {
    const hourly = { expectedIntervalMs: ONE_HOUR_MS };
    const twoHoursAgo = new Date(NOW.getTime() - 2 * ONE_HOUR_MS);
    expect(isJobStale(hourly, twoHoursAgo, NOW)).toBe(true);
    expect(isJobStale(DAILY, twoHoursAgo, NOW)).toBe(false);
  });
});

describe("isRunStuck", () => {
  it("a fresh running job is not stuck", () => {
    expect(isRunStuck("running", NOW, NOW)).toBe(false);
  });

  it("running well past the threshold is stuck", () => {
    const wayBack = new Date(NOW.getTime() - STUCK_RUNNING_THRESHOLD_MS - 60_000);
    expect(isRunStuck("running", wayBack, NOW)).toBe(true);
  });

  it("not stuck exactly at the threshold boundary", () => {
    const atThreshold = new Date(NOW.getTime() - STUCK_RUNNING_THRESHOLD_MS);
    expect(isRunStuck("running", atThreshold, NOW)).toBe(false);
  });

  it("a completed job is never stuck, no matter how old", () => {
    const daysAgo = new Date(NOW.getTime() - 5 * ONE_DAY_MS);
    expect(isRunStuck("succeeded", daysAgo, NOW)).toBe(false);
    expect(isRunStuck("failed", daysAgo, NOW)).toBe(false);
  });
});

describe("JOB_DEFINITIONS", () => {
  it("covers exactly the four job_name strings runWithTracking is actually called with", () => {
    const names = JOB_DEFINITIONS.map((d) => d.jobName).sort();
    expect(names).toEqual(["deadline_reminders", "discover_opportunities", "discover_requirements", "sync_us_universities"]);
  });

  it("has no duplicate job names", () => {
    const names = JOB_DEFINITIONS.map((d) => d.jobName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every definition has a positive expected interval", () => {
    for (const def of JOB_DEFINITIONS) expect(def.expectedIntervalMs).toBeGreaterThan(0);
  });
});
