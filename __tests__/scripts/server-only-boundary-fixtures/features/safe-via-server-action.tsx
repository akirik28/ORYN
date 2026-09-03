"use client";

// EXPECT: not flagged. Reaches server-value.ts only through app/server-action.ts's "use
// server" boundary -- the checker must not walk past a "use server" file's own imports.
import { doThing } from "../app/server-action";

export function SafeViaServerAction() {
  doThing();
  return null;
}
