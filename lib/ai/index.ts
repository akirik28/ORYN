import "server-only";

import { integrationStatus } from "@/lib/env";
import { AnthropicProvider } from "./anthropic-provider";
import type { AIProvider } from "./provider";

export { AIProviderNotConfiguredError } from "./provider";
export type { AIProvider, AIRequest, AIStructuredRequest, AITextResult, AIStructuredResult } from "./provider";

let cachedProvider: AIProvider | null = null;

/** The one place the app picks which AIProvider implementation is active. */
export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = new AnthropicProvider();
  }
  return cachedProvider;
}

export const isAIConfigured = () => integrationStatus.anthropic;
