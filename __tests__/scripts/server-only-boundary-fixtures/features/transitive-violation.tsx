"use client";

// EXPECT: flagged. Reaches server-value.ts transitively through a plain (non-boundary)
// module -- the exact real-bug shape (lib/validation/onboarding.ts -> field-config.ts),
// not just the direct case.
import { SECRET_VALUE } from "../lib/plain-reexport";

export function TransitiveViolation() {
  return SECRET_VALUE;
}
