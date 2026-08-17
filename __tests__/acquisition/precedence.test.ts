import { describe, expect, test } from "vitest";
import { decideWrite, mutatesValue, type FactVersion } from "@/lib/acquisition/precedence";

function version(overrides: Partial<FactVersion> = {}): FactVersion {
  return { value: "a", sourceYear: 2026, tier: "HIGH", retrievedAt: "2026-08-17T00:00:00.000Z", ...overrides };
}

describe("decideWrite", () => {
  test("inserts when nothing is stored", () => {
    expect(decideWrite(version(), null).action).toBe("insert");
  });

  test("touches only when the value already matches", () => {
    expect(decideWrite(version({ value: "a" }), version({ value: "a" })).action).toBe("touch_only");
  });

  test("treats whitespace-only differences as the same value", () => {
    expect(decideWrite(version({ value: " a " }), version({ value: "a" })).action).toBe("touch_only");
  });

  test("NEVER overwrites a newer stored value with an older source", () => {
    const decision = decideWrite(version({ value: "old", sourceYear: 2019 }), version({ value: "new", sourceYear: 2026 }));
    expect(decision.action).toBe("skip_older");
    expect(decision.reason).toContain("2019");
  });

  test("updates when the incoming source states a newer year", () => {
    expect(decideWrite(version({ value: "new", sourceYear: 2026 }), version({ value: "old", sourceYear: 2019 })).action).toBe("update");
  });

  test("an undated incoming value cannot supersede a dated stored one", () => {
    expect(decideWrite(version({ value: "x", sourceYear: null }), version({ value: "y", sourceYear: 2024 })).action).toBe("skip_older");
  });

  test("a dated incoming value supersedes an undated stored one", () => {
    expect(decideWrite(version({ value: "x", sourceYear: 2026 }), version({ value: "y", sourceYear: null })).action).toBe("update");
  });

  test("never machine-overwrites a human-verified value, even with a newer source", () => {
    const decision = decideWrite(version({ value: "machine", sourceYear: 2026 }), version({ value: "human", sourceYear: 2015, humanVerified: true }));
    expect(decision.action).toBe("skip_human_verified");
  });

  test("at equal dates a stronger source wins", () => {
    expect(decideWrite(version({ value: "x", tier: "HIGH" }), version({ value: "y", tier: "MEDIUM" })).action).toBe("update");
  });

  test("at equal dates a weaker source loses", () => {
    expect(decideWrite(version({ value: "x", tier: "MEDIUM" }), version({ value: "y", tier: "HIGH" })).action).toBe("skip_lower_authority");
  });

  test("two equally strong, equally dated sources that disagree produce a conflict, not a winner", () => {
    const decision = decideWrite(version({ value: 1000, tier: "HIGH" }), version({ value: 2000, tier: "HIGH" }));
    expect(decision.action).toBe("conflict");
    expect(decision.reason).toContain("1000");
    expect(decision.reason).toContain("2000");
  });

  test("both undated and same tier with different values is a conflict", () => {
    expect(decideWrite(version({ value: "x", sourceYear: null }), version({ value: "y", sourceYear: null })).action).toBe("conflict");
  });
});

describe("mutatesValue", () => {
  test("only insert and update change stored data", () => {
    expect(mutatesValue("insert")).toBe(true);
    expect(mutatesValue("update")).toBe(true);
    for (const action of ["touch_only", "skip_older", "skip_lower_authority", "skip_human_verified", "conflict"] as const) {
      expect(mutatesValue(action)).toBe(false);
    }
  });
});
