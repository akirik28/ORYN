import "server-only";

import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";
import { ADVISOR_SYSTEM_PROMPT } from "./advisor-prompt";
import { buildStudentAdvisorContext, formatContextForPrompt } from "./student-context";
import type { AIMessage } from "./provider";

export async function generateAdvisorReply(params: {
  userId: string;
  history: AIMessage[];
  newMessage: string;
}): Promise<string> {
  const context = await buildStudentAdvisorContext(params.userId);
  const provider = getAIProvider();

  const system = `${ADVISOR_SYSTEM_PROMPT}\n\nCurrent student context:\n${formatContextForPrompt(context)}`;

  const result = await provider.generateText({
    system,
    prompt: params.newMessage,
    history: params.history,
    maxTokens: 1024,
  });

  await logAIUsage({ userId: params.userId, feature: "advisor_chat", usage: result.usage });
  return result.text;
}
