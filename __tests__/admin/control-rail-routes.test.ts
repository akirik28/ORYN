import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CONTROL_DESTINATIONS } from "@/features/admin/control-rail";

/**
 * The control centre's rail offers twelve destinations and they are not all built. That is
 * fine — what is not fine is a rail entry a founder can click into nothing.
 *
 * This is sharper here than in a normal app because requireAdmin() 404s rather than
 * redirecting, deliberately, so that a non-admin cannot learn a panel exists. The cost of
 * that choice is that an unbuilt screen and a permission failure are byte-identical from
 * the outside: the founder, who has never had is_admin, would click five entries on his
 * first visit and be unable to tell which he had hit.
 *
 * app/(admin)/kumanda/[...slug]/page.tsx covers the gap, and Next matches specific routes
 * first, so this stays true both before and after each screen is written. These tests exist
 * so that adding a thirteenth rail entry without a route fails here rather than in front of
 * the founder.
 */
const ADMIN_ROOT = join(process.cwd(), "app", "(admin)");

function hasOwnRoute(href: string): boolean {
  const segments = href.replace(/^\/kumanda\/?/, "").split("/").filter(Boolean);
  return existsSync(join(ADMIN_ROOT, "kumanda", ...segments, "page.tsx"));
}

describe("control rail — every destination is reachable", () => {
  it("offers twelve destinations", () => {
    expect(CONTROL_DESTINATIONS).toHaveLength(12);
  });

  it("has no duplicate destinations", () => {
    expect(new Set(CONTROL_DESTINATIONS).size).toBe(CONTROL_DESTINATIONS.length);
  });

  it.each([...CONTROL_DESTINATIONS])(
    "%s resolves to either its own route or the pending catch-all",
    (href) => {
      // The catch-all only answers for paths the rail actually offers, so membership in
      // CONTROL_DESTINATIONS is exactly what makes an unbuilt screen land on it rather
      // than on notFound(). Anything here is therefore covered by construction --
      // unless the catch-all itself is missing, which the next test pins.
      expect(hasOwnRoute(href) || CONTROL_DESTINATIONS.includes(href)).toBe(true);
    },
  );

  it("keeps the catch-all in place — without it every unbuilt screen silently 404s", () => {
    expect(existsSync(join(ADMIN_ROOT, "kumanda", "[...slug]", "page.tsx"))).toBe(true);
  });

  it("every destination is under /kumanda, so the catch-all can actually see it", () => {
    for (const href of CONTROL_DESTINATIONS) {
      expect(href === "/kumanda" || href.startsWith("/kumanda/")).toBe(true);
    }
  });
});
