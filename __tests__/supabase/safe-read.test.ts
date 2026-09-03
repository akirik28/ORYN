import { describe, expect, test, vi } from "vitest";
import { readOr } from "@/lib/supabase/safe-read";

/**
 * The shared helper docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md's tier-1 decision
 * calls for: a drop-in replacement for `x.data ?? fallback` that behaves identically on
 * success and logs, by category name, when the read itself failed rather than genuinely
 * returning nothing.
 */
describe("readOr", () => {
  test("returns data unchanged and logs nothing on success", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = readOr("activities", { data: [1, 2, 3], error: null }, []);
    expect(result).toEqual([1, 2, 3]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("returns the fallback and logs, by category name, on a real error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = readOr("activities", { data: null, error: { message: "relation does not exist" } }, []);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    const [message, detail] = spy.mock.calls[0];
    expect(message).toContain("activities");
    expect(message).toContain("read failed");
    expect(detail).toMatchObject({ error: "relation does not exist" });
    spy.mockRestore();
  });

  test("extra context is included in the log", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    readOr("sports", { data: null, error: { message: "boom" } }, [], { userId: "user-42" });
    const [, detail] = spy.mock.calls[0];
    expect(detail).toMatchObject({ userId: "user-42", error: "boom" });
    spy.mockRestore();
  });

  test("a null data with no error (a genuinely empty .single() result) returns the fallback silently", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = readOr("profile", { data: null, error: null }, "default-name");
    expect(result).toBe("default-name");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a stub result with no error key at all (e.g. a skipped-query { data: [] } branch) is accepted, not just real Supabase results", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = readOr("targets", { data: [] }, ["fallback"]);
    expect(result).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
