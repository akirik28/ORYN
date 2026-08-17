// Vitest stub for Next.js's "server-only" package (aliased in vitest.config.mts).
// The real package throws when imported outside Next's own bundler — its whole purpose
// is a build-time guard, which is meaningless (and blocking) inside a plain Node test
// runner. This lets tests import modules tagged `import "server-only"` without pulling
// in Next.js itself, as long as the module doesn't otherwise depend on request-scoped
// Next.js APIs (cookies(), headers(), etc.) — most lib/ modules don't.
export {};
