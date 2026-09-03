"use client";

// EXPECT: flagged. A real value import of a server-only export, direct, no boundary.
import { SECRET_VALUE } from "../lib/server-value";

export function DirectViolation() {
  return SECRET_VALUE;
}
