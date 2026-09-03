"use client";

// EXPECT: flagged. Mixed inline type + real value in one braced import -- OTHER_VALUE is a
// genuine runtime value, so this statement is NOT fully type-only despite `type OtherType`
// sitting right next to it in the same braces.
import { type OtherType, OTHER_VALUE } from "../lib/server-value-2";

export function MixedImportViolation({ t }: { t: OtherType }) {
  return OTHER_VALUE + t.y;
}
