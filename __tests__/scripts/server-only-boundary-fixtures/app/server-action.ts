"use server";

// "use server" is its own boundary -- Next.js compiles this file into a client-safe RPC
// stub, so the real SECRET_VALUE import below never reaches a client bundle through it.
// Relative, not "@/" -- these fixtures live under the real project's __tests__/, where "@/"
// resolves against the REAL project root (tsconfig's "@/*": ["./*"]), not this fixtures
// directory's own root. Relative imports work identically for tsc and for this checker.
import { SECRET_VALUE } from "../lib/server-value";

export async function doThing() {
  return SECRET_VALUE;
}
