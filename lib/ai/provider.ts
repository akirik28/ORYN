import type { z } from "zod";

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AIDocument {
  mediaType: "application/pdf" | "text/plain";
  /** Base64 for PDFs, raw UTF-8 text for text/plain. */
  data: string;
  title?: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequest {
  /** System prompt — the persona/behavior instructions, kept separate from user content. */
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** Files attached alongside the prompt (e.g. an uploaded CV) — provider-agnostic; not every provider needs to support these. */
  documents?: AIDocument[];
  /** Prior turns, oldest first. `prompt` is the new final user turn — don't include it here too. */
  history?: AIMessage[];
}

export interface AIStructuredRequest<T> extends AIRequest {
  schema: z.ZodType<T>;
  /** Tool name the model is forced to call — should read like a function name. */
  schemaName: string;
  schemaDescription: string;
}

export interface AITextResult {
  text: string;
  usage: AIUsage;
}

export interface AIStructuredResult<T> {
  data: T;
  usage: AIUsage;
}

/**
 * The app never talks to Anthropic's SDK directly outside lib/ai — every feature
 * (advisor, CV extraction, weekly plans, research ideas) goes through this interface, so
 * swapping models or providers never touches business logic. All calls happen server-side
 * only; see lib/ai/anthropic-provider.ts for the "server-only" enforcement.
 */
export interface AIProvider {
  generateText(request: AIRequest): Promise<AITextResult>;
  generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. See API_SETUP.md to configure the AI Advisor.");
    this.name = "AIProviderNotConfiguredError";
  }
}
