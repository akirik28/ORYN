import { describe, expect, test } from "vitest";
import { canViewContactField } from "@/lib/social/contact-visibility";
import { isValidOpenToOption, OPEN_TO_OPTIONS } from "@/lib/social/open-to";

/**
 * Open To (profiles.open_to) has no privacy state of its own — it's gated by
 * contact_info.open_to_visibility through the exact same canViewContactField predicate
 * every other contact field uses (lib/social/contact-info.ts's getFilteredContactInfo:
 * `canViewContactField(contact.open_to_visibility, viewer.isSelf, viewer.hasAcceptedConnection)`).
 * Dedicated acceptance coverage for the six named relationship/visibility combinations,
 * even though the underlying predicate is already covered generically in
 * contact-visibility.test.ts.
 */
describe("Open To visibility — canViewContactField applied to open_to_visibility", () => {
  test("owner always sees their own Open To, regardless of the stored visibility", () => {
    expect(canViewContactField("private", true, false)).toBe(true);
    expect(canViewContactField("connections", true, false)).toBe(true);
    expect(canViewContactField("public", true, false)).toBe(true);
  });

  test("public visibility: a stranger can see it", () => {
    expect(canViewContactField("public", false, false)).toBe(true);
  });

  test("connections-only visibility: a stranger cannot see it", () => {
    expect(canViewContactField("connections", false, false)).toBe(false);
  });

  test("connections-only visibility: an accepted connection can see it", () => {
    expect(canViewContactField("connections", false, true)).toBe(true);
  });

  test("private visibility: hidden from everyone but the owner, even an accepted connection", () => {
    expect(canViewContactField("private", false, false)).toBe(false);
    expect(canViewContactField("private", false, true)).toBe(false);
  });

  test("stranger vs. accepted connection: public visibility shows to both identically", () => {
    expect(canViewContactField("public", false, false)).toBe(canViewContactField("public", false, true));
    expect(canViewContactField("public", false, false)).toBe(true);
  });
});

describe("Open To selection — isValidOpenToOption", () => {
  test("every option in the fixed vocabulary validates", () => {
    for (const option of OPEN_TO_OPTIONS) {
      expect(isValidOpenToOption(option)).toBe(true);
    }
  });

  test("an arbitrary free-text value is rejected — not a free-text field", () => {
    expect(isValidOpenToOption("interpretive_dance")).toBe(false);
    expect(isValidOpenToOption("")).toBe(false);
  });
});
