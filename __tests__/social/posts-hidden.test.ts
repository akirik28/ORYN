import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { isSocialFeedEnabled, assertSocialFeedEnabled, SOCIAL_FEED_FLAG_ENV, SocialFeedDisabledError } from "@/lib/social/posts-feature-flag";

/**
 * ============================================================================
 * The social layer must be PROVABLY unreachable, not merely unlinked.
 * ============================================================================
 *
 * The founder's constraint is that a logged-in student cannot reach any part of this
 * feature — not from navigation, not from a link, not by typing a URL. "Nobody linked it"
 * is not a proof; the next person to add a page does not read a comment first. So this
 * file asserts the four in-repo layers mechanically against the real source tree
 * (the fifth, "migration 0058 is not applied", is not something a test can observe).
 *
 * If one of these fails, the feature has become reachable. Do not relax the test — either
 * revert what made it reachable, or switch the feature on deliberately and delete this
 * file with the founder's sign-off.
 */

const ROOT = join(import.meta.dirname, "..", "..");

/** The student-facing half of the social layer. Nothing rendered to a student may import
 * any of these — not a page, not a component, not a Server Action wrapper. */
const STUDENT_FACING_MODULES = [
  "lib/social/posts.ts",
  "lib/social/post-actions.ts",
  "lib/social/posts-feed.ts",
  "lib/social/posts-visibility.ts",
  "lib/social/posts-input.ts",
  "lib/social/posts-feature-flag.ts",
];

/** Every module in the feature, for the "no `use server` directive anywhere" check. */
const SOCIAL_MODULES = [...STUDENT_FACING_MODULES, "lib/social/posts-moderation.ts"];

/**
 * `posts-moderation.ts` is the one deliberate exception to the import ban, and only from
 * the admin surface. Moderation tooling is admin-only — `requireAdmin()` 404s rather than
 * redirects, so a student poking at URLs cannot reach it — and wiring the report queue is
 * what stops this feature from repeating the failure migration 0030's header describes: a
 * report written into a table nobody ever acts on. The allowlist is exact rather than a
 * directory prefix so it cannot quietly grow.
 */
// app/(app)/admin/actions.ts imports buildPostRemovalUpdate/buildPostRestoreUpdate/
// ModerationInputError for the removal Server Action below.
//
// features/admin/sections/reports-section.tsx used to import REPORTED_POST_MISSING_LABEL
// for the same "post preview is gone" case messageMissing/recommendationMissing already
// handled via a translated string — found untranslated (always English, regardless of
// locale) during 2026-09-03's kumanda sweep and fixed by switching it to t("postMissing"),
// the same t() the section already had, matching the other two rather than importing a raw
// constant for the third case only. Dropped from this allowlist accordingly — the module no
// longer has a second real importer.
const MODERATION_IMPORT_ALLOWLIST = ["app/(app)/admin/actions.ts"];

/** Every source file under the given directories, recursively. */
function sourceFiles(dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
  };
  for (const dir of dirs) walk(join(ROOT, dir));
  return out;
}

/** Exact module specifier, quote-terminated. A bare `includes` would let
 * `@/lib/social/posts` match `@/lib/social/posts-moderation` and vice versa, which is
 * precisely the distinction these tests turn on. */
function importsSpecifier(contents: string, specifier: string): boolean {
  return contents.includes(`"${specifier}"`) || contents.includes(`'${specifier}'`);
}

describe("layer 1 — no route exists", () => {
  test("no route segment under app/ is named for the social layer", () => {
    const segments: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (!statSync(full).isDirectory()) continue;
        segments.push(entry.toLowerCase());
        walk(full);
      }
    };
    walk(join(ROOT, "app"));
    for (const forbidden of ["feed", "posts", "post", "social", "timeline"]) {
      expect(segments, `app/ must not contain a "${forbidden}" route segment`).not.toContain(forbidden);
    }
  });
});

describe("layer 2 — nothing links to it", () => {
  test("navigation carries no social entry", () => {
    const nav = readFileSync(join(ROOT, "features/app-shell/nav-items.ts"), "utf8");
    const hrefs = [...nav.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).not.toMatch(/feed|post|social|timeline/i);
    }
  });

  test("no file under app/, features/ or components/ imports a student-facing social module", () => {
    // This is the load-bearing assertion. It is what makes "no Server Action id is ever
    // minted" true: a `"use server"` wrapper could not exist without importing one of
    // these, and a page could not render a feed without importing one either.
    const offenders: string[] = [];
    for (const file of sourceFiles(["app", "features", "components"])) {
      const contents = readFileSync(file, "utf8");
      for (const moduleName of STUDENT_FACING_MODULES) {
        const specifier = `@/${moduleName.replace(/\.ts$/, "")}`;
        // Quote-terminated, so `@/lib/social/posts` does not also match
        // `@/lib/social/posts-moderation` — the one module the admin surface may import.
        if (importsSpecifier(contents, specifier)) offenders.push(`${relative(ROOT, file)} -> ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("the moderation module is imported only by the admin surface, which 404s for students", () => {
    const importers = sourceFiles(["app", "features", "components"])
      .filter((file) => importsSpecifier(readFileSync(file, "utf8"), "@/lib/social/posts-moderation"))
      .map((file) => relative(ROOT, file).split("\\").join("/"))
      .sort();
    expect(importers).toEqual([...MODERATION_IMPORT_ALLOWLIST].sort());
  });

  test("the admin removal action re-checks requireAdmin itself, never relying on the page", () => {
    // Every export in admin/actions.ts re-checks — a Server Action is directly callable
    // regardless of which page rendered it. Same convention as every other admin action.
    const actions = readFileSync(join(ROOT, "app/(app)/admin/actions.ts"), "utf8");
    for (const fn of ["removeReportedPost", "restoreReportedPost"]) {
      const body = actions.slice(actions.indexOf(`export async function ${fn}`));
      expect(body.slice(0, 400), `${fn} must call requireAdmin`).toContain("requireAdmin()");
    }
  });
});

describe("layer 3 — no Server Action endpoint", () => {
  test.each(SOCIAL_MODULES)("%s carries no 'use server' directive", (moduleName) => {
    // A `"use server"` file becomes a callable RPC endpoint with a build-time action id.
    // Without the directive there is no endpoint for a crafted POST to reach.
    const contents = readFileSync(join(ROOT, moduleName), "utf8");
    expect(contents).not.toMatch(/^\s*["']use server["']/m);
  });
});

describe("layer 4 — the kill switch fails closed", () => {
  test("the flag is off when unset", () => {
    expect(isSocialFeedEnabled({})).toBe(false);
  });

  test.each(["false", "0", "1", "yes", "on", "TRUE", "True", " true", "true ", ""])(
    "%s does not enable the feature",
    (value) => {
      // Exact-match on "true" only. An ambiguous value must resolve to OFF.
      expect(isSocialFeedEnabled({ [SOCIAL_FEED_FLAG_ENV]: value })).toBe(false);
    }
  );

  test("only the exact string 'true' enables it", () => {
    expect(isSocialFeedEnabled({ [SOCIAL_FEED_FLAG_ENV]: "true" })).toBe(true);
  });

  test("the assert throws rather than returning an empty result", () => {
    // An empty feed would look like "no posts yet" and could ship unnoticed; a throw
    // cannot.
    expect(() => assertSocialFeedEnabled({})).toThrow(SocialFeedDisabledError);
    expect(() => assertSocialFeedEnabled({ [SOCIAL_FEED_FLAG_ENV]: "true" })).not.toThrow();
  });

  test("the flag is server-only — never NEXT_PUBLIC_, so it cannot reach the browser bundle", () => {
    expect(SOCIAL_FEED_FLAG_ENV.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  test("every data-layer entry point asserts the flag before touching the database", () => {
    for (const moduleName of ["lib/social/posts.ts", "lib/social/post-actions.ts"]) {
      const contents = readFileSync(join(ROOT, moduleName), "utf8");
      expect(contents, `${moduleName} must import the kill switch`).toContain("assertSocialFeedEnabled");
    }
  });

  test("the flag is absent from .env.example — it is not a knob to fill in during setup", () => {
    expect(readFileSync(join(ROOT, ".env.example"), "utf8")).not.toContain(SOCIAL_FEED_FLAG_ENV);
  });
});

describe("the nav comment that is this work's brief stays in place", () => {
  test("nav-items.ts still explains why the social surfaces are hidden", () => {
    // Deleting this comment is how the reasoning gets lost and someone re-adds the nav
    // entry as a tidy-up.
    const nav = readFileSync(join(ROOT, "features/app-shell/nav-items.ts"), "utf8");
    expect(nav).toContain("minor-safe");
    expect(nav).toContain("Phase 54");
  });
});
