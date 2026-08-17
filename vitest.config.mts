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
  },
});
