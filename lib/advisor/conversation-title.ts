/**
 * Founder, 2026-09-04, verbatim: "eğer 3 konu konuşmak istiyorsa 3 farklı oturumda
 * konuşabilsin. O yüzden isimlendirmeyi de konuyu söyleyerek yapmalıyız" — if he wants to
 * discuss 3 topics, he should be able to in 3 separate sessions, and naming has to say the
 * topic. CEO's own explicit pushback on the obvious approach: an AI call per conversation is
 * not the default here — this derives a title directly from the student's own first message,
 * zero AI spend, and can never fabricate a topic since it's never anything but their own words.
 *
 * app/(app)/advisor/actions.ts's sendAdvisorMessage is the one caller: whenever a conversation's
 * first user message is saved (regardless of whether the row was just lazy-created there or was
 * an empty shell from createConversation's own explicit button, still carrying the DB's generic
 * default title), this derives the real one from it.
 */

const MAX_TITLE_LENGTH = 60;

/** Cuts at the last word boundary within the limit rather than mid-word, unless there isn't a
 * reasonable one (e.g. one long URL/token) — in which case a hard cut beats truncating to
 * almost nothing. Trailing punctuation right at the cut point is trimmed so a title doesn't end
 * mid-comma. */
export function deriveConversationTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;

  const truncated = trimmed.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > MAX_TITLE_LENGTH * 0.5 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.replace(/[,;:.\-–—]+$/, "")}…`;
}
