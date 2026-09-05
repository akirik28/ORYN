import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Founder, 2026-09-04, verbatim: "eğer 3 konu konuşmak istiyorsa 3 farklı oturumda
 * konuşabilsin. O yüzden isimlendirmeyi de konuyu söyleyerek yapmalıyız" — if he wants to
 * discuss 3 topics, he should be able to in 3 separate sessions, and naming has to say the
 * topic. CEO's own explicit pushback on the obvious approach: an AI call per conversation is
 * not the default here — this derives a title directly from the student's own first message,
 * zero AI spend, and can never fabricate a topic since it's never anything but their own words.
 *
 * app/(app)/advisor/actions.ts's sendAdvisorMessage and app/api/advisor/chat/route.ts's
 * (streaming) POST are the two callers: whenever a conversation's first user message is
 * saved (regardless of whether the row was just lazy-created there or was an empty shell
 * from createConversation's own explicit button, still carrying the DB's generic default
 * title), this derives the real one from it.
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

/** Both of this file's own literal placeholder inserts (createConversation's
 * `title: tr ? "Yeni sohbet" : "New conversation"`) plus the DB column's own generic
 * default (migration 0011) — a title still equal to any of these means derivation never
 * ran for this row, for whatever reason (created before this file existed, or a prior
 * update attempt failed). Locale-agnostic on purpose: a Turkish-locale reader can still
 * hold an English-defaulted row and vice versa, since locale is resolved per-request, not
 * stored on the conversation. */
const GENERIC_TITLES = new Set(["New conversation", "Yeni sohbet"]);

export interface BackfillableConversation {
  id: string;
  title: string;
}

/**
 * 2026-09-05 — lazy backfill, not a one-off migration script: called wherever the session
 * list is loaded (app/(app)/advisor/page.tsx), so a conversation whose first message
 * predates this file's own derivation (or one whose derivation attempt failed and was
 * silently swallowed, per that call site's own comment) gets a real title the next time
 * its owner actually looks at Advisor, rather than needing a write executed against every
 * account's data at once. Confirmed live 2026-09-05: two real conversations, both with a
 * genuine reply already generated, still carried the literal placeholder because their
 * only message was sent hours before lib/advisor/conversation-title.ts existed at all —
 * not a live bug in the current code, but real, nameable data sitting on real accounts.
 *
 * Silent per-row failure by design, same posture as the two call sites' own title-update
 * attempts: a backfill that can't find a first message (a genuinely empty shell) or whose
 * UPDATE fails just leaves that one row on its placeholder for next time — never blocks or
 * errors the page that's loading the whole list for an unrelated reason.
 */
export async function backfillGenericConversationTitles<T extends BackfillableConversation>(
  supabase: SupabaseClient<Database>,
  conversations: T[],
): Promise<T[]> {
  const candidates = conversations.filter((c) => GENERIC_TITLES.has(c.title));
  if (candidates.length === 0) return conversations;

  const resolved = await Promise.all(
    candidates.map(async (c): Promise<[string, string] | null> => {
      const { data: firstMessage } = await supabase
        .from("advisor_messages")
        .select("content")
        .eq("conversation_id", c.id)
        .eq("role", "user")
        .eq("status", "complete")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!firstMessage?.content) return null;

      const title = deriveConversationTitle(firstMessage.content);
      const { error } = await supabase.from("advisor_conversations").update({ title }).eq("id", c.id);
      if (error) {
        console.warn("[advisor] failed to backfill conversation title", { conversationId: c.id, error: error.message });
        return null;
      }
      return [c.id, title];
    }),
  );

  const titleById = new Map(resolved.filter((r): r is [string, string] => r !== null));
  if (titleById.size === 0) return conversations;
  return conversations.map((c) => (titleById.has(c.id) ? { ...c, title: titleById.get(c.id)! } : c));
}
