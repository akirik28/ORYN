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

/**
 * The model returned a well-formed response that contained no usable text — distinct from
 * a transport/auth/API failure, and distinct from "the model said something we didn't like".
 *
 * The case that motivated this (SEV-1, 2026-08-23): current Claude models run adaptive
 * thinking whenever a request omits a `thinking` parameter, and thinking tokens are drawn
 * from the same `max_tokens` budget as the visible answer. On a rich student profile the
 * thinking alone exhausted the advisor's 1024-token budget, so the response came back
 * `stop_reason: "max_tokens"` with only a thinking block and no text block at all.
 *
 * Two things callers need that a bare `Error` could not give them:
 *  - `stopReason`, to tell budget exhaustion apart from an unknown failure and say
 *    something specific to the user (see lib/ai/advisor-failure.ts);
 *  - `usage`, because these tokens are billed whether or not any text came back. Without
 *    it the most expensive failure mode stays invisible to the ai_usage spend gates.
 */
export class AIResponseIncompleteError extends Error {
  readonly stopReason: string | null;
  readonly usage: AIUsage;

  constructor(params: { stopReason: string | null; usage: AIUsage }) {
    // Deliberately says nothing about the prompt or the model's reasoning — this message
    // reaches server logs, and SECURITY.md forbids leaking either into them.
    super(
      params.stopReason === "max_tokens"
        ? "AI response hit max_tokens before emitting any text (thinking likely consumed the whole budget)."
        : `AI response contained no text content (stop_reason: ${params.stopReason ?? "unknown"}).`,
    );
    this.name = "AIResponseIncompleteError";
    this.stopReason = params.stopReason;
    this.usage = params.usage;
  }
}
