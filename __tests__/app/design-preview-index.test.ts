import { describe, expect, test } from "vitest";
import { OTHER_PREVIEW_ROUTES, buildPreviewHref } from "@/app/(dev-preview)/design-preview/preview-routes";

/**
 * The index's own real logic, tested directly rather than only through a full page render
 * (which would need PreviewShell's whole fixture graph mounted for no extra coverage of
 * what actually changed here). Guards the one thing the founder's own complaint was about:
 * a link that silently drops back to Standard the moment you click it.
 */
describe("buildPreviewHref", () => {
  test("standard tier: a route with no extra params gets a bare href, no stray ?tier=", () => {
    expect(buildPreviewHref({ href: "/design-preview/dashboard", label: "Dashboard" }, "standard")).toBe("/design-preview/dashboard");
  });

  test("ultra tier: appends ?tier=ultra", () => {
    expect(buildPreviewHref({ href: "/design-preview/dashboard", label: "Dashboard" }, "ultra")).toBe("/design-preview/dashboard?tier=ultra");
  });

  test("standard tier with extra params: keeps the extra params, adds no tier param", () => {
    const href = buildPreviewHref({ href: "/design-preview/map", label: "University map", extraParams: "country=United+Kingdom" }, "standard");
    expect(href).toBe("/design-preview/map?country=United+Kingdom");
  });

  test("ultra tier with extra params: keeps both, together -- the real map link this was built for", () => {
    const href = buildPreviewHref({ href: "/design-preview/map", label: "University map", extraParams: "country=United+Kingdom" }, "ultra");
    const [path, query] = href.split("?");
    expect(path).toBe("/design-preview/map");
    const params = new URLSearchParams(query);
    expect(params.get("country")).toBe("United Kingdom");
    expect(params.get("tier")).toBe("ultra");
  });
});

describe("OTHER_PREVIEW_ROUTES", () => {
  test("lists all eleven other preview surfaces (guards against the array silently losing an entry)", () => {
    expect(OTHER_PREVIEW_ROUTES).toHaveLength(11);
  });

  test("every route is a real design-preview path with a non-empty label", () => {
    for (const route of OTHER_PREVIEW_ROUTES) {
      expect(route.href).toMatch(/^\/design-preview\//);
      expect(route.label.length).toBeGreaterThan(0);
    }
  });

  test("no duplicate hrefs", () => {
    const hrefs = OTHER_PREVIEW_ROUTES.map((r) => r.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("only the map route carries extra params", () => {
    const withExtra = OTHER_PREVIEW_ROUTES.filter((r) => r.extraParams);
    expect(withExtra.map((r) => r.href)).toEqual(["/design-preview/map"]);
  });
});
