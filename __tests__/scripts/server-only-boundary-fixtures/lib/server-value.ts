import "server-only";

// A comment that mentions import, type, and from "somewhere" on purpose -- this file's own
// header comment must never corrupt the parser reading THIS file, only the separate,
// dedicated regression fixture (features/safe-comment-heavy-type-only.tsx) tests the actual
// failure mode found live (a comment sitting directly above the import STATEMENT itself).
export const SECRET_VALUE = 42;
export interface ServerType {
  x: number;
}
