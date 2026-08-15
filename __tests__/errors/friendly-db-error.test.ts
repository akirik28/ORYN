import { describe, expect, test } from "vitest";
import { toFriendlyDbErrorMessage } from "@/lib/errors/friendly-db-error";

describe("toFriendlyDbErrorMessage", () => {
  test("save errors never mention Postgres/schema internals", () => {
    const message = toFriendlyDbErrorMessage("save");
    expect(message).toBe("Couldn't save this. Please try again.");
    expect(message).not.toMatch(/column|relation|constraint|postgres|does not exist/i);
  });

  test("delete errors never mention Postgres/schema internals", () => {
    const message = toFriendlyDbErrorMessage("delete");
    expect(message).toBe("Couldn't delete this. Please try again.");
    expect(message).not.toMatch(/column|relation|constraint|postgres|does not exist/i);
  });
});
