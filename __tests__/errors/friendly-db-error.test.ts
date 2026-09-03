import { describe, expect, test } from "vitest";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";

describe("toFriendlyDbErrorMessage", () => {
  test("save errors never mention Postgres/schema internals", () => {
    const message = toFriendlyDbErrorMessage("save", "en");
    expect(message).toBe("Couldn't save this. Please try again.");
    expect(message).not.toMatch(/column|relation|constraint|postgres|does not exist/i);
  });

  test("delete errors never mention Postgres/schema internals", () => {
    const message = toFriendlyDbErrorMessage("delete", "en");
    expect(message).toBe("Couldn't delete this. Please try again.");
    expect(message).not.toMatch(/column|relation|constraint|postgres|does not exist/i);
  });

  // 2026-09-03: locale used to be silently ignored (English hardcoded regardless of who
  // was asking) -- these two guard against that regressing now that every one of the six
  // real call sites depends on this actually varying by locale.
  test("save errors are Turkish for a Turkish locale", () => {
    expect(toFriendlyDbErrorMessage("save", "tr")).toBe("Kaydedilemedi. Lütfen tekrar dene.");
  });

  test("delete errors are Turkish for a Turkish locale", () => {
    expect(toFriendlyDbErrorMessage("delete", "tr")).toBe("Silinemedi. Lütfen tekrar dene.");
  });
});
