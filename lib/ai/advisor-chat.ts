import "server-only";

import { getAIProvider } from "./index";
import { withUsageLogging } from "./usage";
import { ADVISOR_SYSTEM_PROMPT } from "./advisor-prompt";
import { buildStudentAdvisorContext, formatContextForPrompt } from "./student-context";
import { buildOpportunityContextText } from "./opportunity-context";
import type { AIMessage } from "./provider";
import { withOutputLanguage } from "./output-language";

export async function generateAdvisorReply(params: {
  userId: string;
  history: AIMessage[];
  newMessage: string;
}): Promise<string> {
  const context = await buildStudentAdvisorContext(params.userId);
  const opportunityContext = await buildOpportunityContextText(params.userId);
  const provider = getAIProvider();

  const locale = context.student.preferredLanguage;
  const system = withOutputLanguage(
    `${ADVISOR_SYSTEM_PROMPT}\n\nCurrent student context:\n${formatContextForPrompt(context, locale)}${opportunityContext}`,
    locale,
  );

  const result = await withUsageLogging({ userId: params.userId, feature: "advisor_chat" }, (model) =>
    provider.generateText({
      system,
      prompt: params.newMessage,
      history: params.history,
      model,
      // This budget covers the model's thinking *and* the reply. Adaptive thinking is on by
      // default on claude-sonnet-5, and it scales with how much profile there is to reason
      // over — so the budget has to clear the reasoning before the student sees a word.
      // Lowering this does NOT make thinking shorter: the model reasons however much the
      // task needs regardless of the ceiling, so this number only controls how much margin
      // exists between that need and a truncated response. It is not a lever for reply
      // length at all -- there is no separate mechanism in this file that is.
      //
      // The 2026-08-23 benchmark, on a rich profile: 1024 returned a thinking block and no
      // text at all — a hard failure; 2048 truncated mid-answer; 4096 completed cleanly with
      // 1599 thinking tokens (a separate sample hit 1736). Brought back down from 8192
      // (2026-08-23's defensive ceiling) to 4096 — the measured, benchmark-verified floor,
      // not a new guess: ~2.3-2.5k of headroom over both observed thinking samples. 8192 was
      // originally paired with a prompt-brevity change (2026-09-02, branch
      // oryn/advisor-reply-length-2026-09-02) reverted the same day after the one live
      // eval comparison scored worse, not better -- 4096 does not depend on that reverted
      // change; it is the same floor this codebase already had independent evidence for
      // before that experiment started. Re-tighten only
      // against a new benchmark showing thinking has grown, never by assumption.
      maxTokens: 4096,
    }),
  );

  return result.text;
}
