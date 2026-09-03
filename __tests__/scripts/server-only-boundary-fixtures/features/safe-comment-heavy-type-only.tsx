"use client";

// EXPECT: not flagged. Regression fixture for the real bug this checker's own first commit
// hit: app/(dev-preview)/design-preview/preview-shell.tsx has a multi-line comment directly
// above a genuinely type-only import, and that comment's OWN PROSE discusses "import type"
// and "from" while explaining the file's design -- a naive regex (without stripping
// comments first) latches onto the word "import" inside this paragraph and reads forward
// into the real statement below, corrupting the match into something that doesn't start
// with "import type" and so gets misclassified as a value import. This paragraph
// deliberately repeats those same words -- import, type, from, a value import, not a type
// import -- in prose, the same way the real comment did, so a regression here would mean
// the comment-stripping step (see check-server-only-boundary.ts's stripComments) broke.
import type { ServerType } from "../lib/server-value";

export function SafeCommentHeavyTypeOnly({ value }: { value: ServerType }) {
  return value.x;
}
