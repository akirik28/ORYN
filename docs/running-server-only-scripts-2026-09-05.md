# Running a standalone script that imports from `lib/`

**Symptom**: `tsx scripts/whatever.ts` fails immediately with:

```
Error: Cannot find module 'server-only'
Require stack:
- lib/counselor/index.ts
- scripts/whatever.ts
```

**Cause**: `server-only` is not a real, installable npm package in this project — confirmed
2026-09-05 (present in neither `node_modules` nor `package-lock.json`, anywhere in the tree).
It's a bare module specifier Next.js's own bundler special-cases internally: `import
"server-only"` is a build-time guard that fails the build if a server-only-tagged module gets
pulled into a client bundle. Outside Next's own bundler — a plain Node/tsx run — there is
nothing to resolve, because the string was never meant to name a real package.

Most of `lib/` carries this import (`lib/digest/build.ts`, `lib/counselor/index.ts`, and dozens
more), so **any script that transitively imports real business logic from `lib/` will hit
this**, not just counselor-specific code. This surfaced 2026-09-05 while building
`scripts/measure-unknown-eligibility-in-top3.ts` (CEO's own dispatch), which needed to call the
real `getCounselorRecommendations` rather than reimplement its ranking logic in raw SQL — CEO's
own words on why that reimplementation path was ruled out: *"ölçtüğün şeyin farklı bir şey
olması demek"* (it would mean measuring something different).

**Fix**: run the script through `tsconfig.eval-cli.json` instead of the project's default
tsconfig — it already maps `server-only` to the same no-op stub vitest itself uses
(`__tests__/stubs/server-only.ts`, aliased in `vitest.config.mts`; 444 test files already
depend on this exact stub working, so it's a proven, battle-tested no-op, not a new risk):

```bash
tsx --tsconfig tsconfig.eval-cli.json scripts/your-script.ts
```

Add the flag directly to the script's own `package.json` entry (see
`measure:unknown-eligibility-top3` for a working example) rather than expecting whoever runs it
to remember the flag.

**Deliberately not done**: renaming `tsconfig.eval-cli.json` to a more general name (it now
serves scripts well beyond AI eval). Three real references exist today
(`scripts/run-ai-eval.ts`, its own `package.json` entry, and
`__tests__/scripts/run-ai-eval-env-loading.test.ts`, which is a real, currently-passing test for
an unrelated, working script) — a rename would need to touch that test purely for naming
clarity, a worse risk/value trade than reusing the existing file under its current name.

**Do NOT fix this by adding a `server-only` alias to the project's root `tsconfig.json`.**
Next.js reads the root tsconfig's `paths` for its own webpack resolution (the same mechanism
that makes `@/*` imports work app-wide) — aliasing `server-only` there would redirect the REAL
app build's resolution too, silently defeating the actual purpose of `server-only`: catching a
server-only module accidentally bundled into client-side JS. `scripts/check-server-only-boundary.ts`
exists specifically to guard this boundary; do not build a change that quietly disables it.
