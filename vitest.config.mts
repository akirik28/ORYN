import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // The real "server-only" package throws when imported outside Next's bundler —
      // stubbed so tests can exercise server-only-tagged modules directly. See the stub
      // file's own comment for the reasoning and the limits of what this unlocks.
      "server-only": `${import.meta.dirname}/__tests__/stubs/server-only.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    // Raised from vitest's 5000ms default on 2026-09-02. Several tests here do real work
    // rather than assert on mocks -- notably the write-guard scan, which parses 300+ source
    // files with the TypeScript compiler -- and 5s was comfortable on an idle machine and
    // marginal under any concurrent CPU load. That produced the worst possible failure mode:
    // two lanes reported 8-13 failures in a full run, in a DIFFERENT set of files each time,
    // none related to their own changes. A suite whose result depends on what else the
    // machine is doing makes every gate it gates unreadable, and the natural response --
    // "probably just the machine, re-run it" -- is exactly how a real regression gets waved
    // through. Fix the marginal tests where they're genuinely slow; this ceiling exists so a
    // busy machine can't manufacture a red run.
    testTimeout: 20000,
  },
});
