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
      //
      // The 2026-08-23 benchmark, on a rich profile: 1024 (shipped) returned a thinking
      // block and no text at all — a hard failure; 2048 truncated mid-answer; 4096 completed
      // with 1599 thinking tokens. 4096 is therefore the measured floor, not a safe setting:
      // it leaves ~2.4k of headroom over reasoning that was already 1736 tokens on one
      // sample, which is the same fragility that caused this outage with a larger number.
      //
      // 8192 sits ~4.7x above the observed thinking peak, so a profile materially richer
      // than the benchmark still lands inside it. Headroom is free — billing is on tokens
      // generated, not on the ceiling — and the advisor prompt already constrains the reply
      // to be short, so the ceiling only ever binds on reasoning, never on verbosity.
      maxTokens: 8192,
    }),
  );

  return result.text;
}
