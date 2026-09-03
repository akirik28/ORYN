"use client";

// EXPECT: not flagged. A pure `import type` -- fully erased at compile time, can never
// reach a bundle regardless of what module it names.
import type { ServerType } from "../lib/server-value";

export function SafeTypeOnly({ value }: { value: ServerType }) {
  return value.x;
}
