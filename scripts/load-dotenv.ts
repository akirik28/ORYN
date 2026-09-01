/**
 * Side-effect-only: loads .env.local before anything else in the importing script runs.
 *
 * Must be this script's OWN first import, not a call inside main() — ES module imports are
 * hoisted and evaluated in source order before any of the importing file's own top-level
 * code runs, and lib/env.ts reads process.env into module-scope `const`s (`env`,
 * `integrationStatus`) at that same import-evaluation time, not lazily inside a function.
 * By the time a script's main() gets to call process.loadEnvFile(), any lib/* module already
 * imported ahead of it (e.g. @/lib/ai, which imports @/lib/env) has already frozen whatever
 * process.env held at that earlier moment — confirmed live: scripts/run-ai-eval.ts's
 * isAIConfigured() read false with a real key present in .env.local, because loadEnvFile
 * only ran after @/lib/ai/eval/* and @/lib/ai had already been evaluated. Importing this
 * file first, and only this file first, makes it win that ordering race.
 *
 * Same guarded pattern as scripts/check-integrations.ts, which doesn't hit this problem only
 * because it deliberately avoids importing anything that reads env at module scope.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local -- fine, maybe using real environment variables (e.g. CI, hosting platform).
}
