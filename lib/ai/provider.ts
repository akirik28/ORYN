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
  /** Overrides the provider's default (`ANTHROPIC_MODEL`) for this one call — e.g.
   * lib/ai/limits/budget.ts's degrade path. Omit to use the default; most callers should. */
  model?: string;
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
  /** The model that actually produced this response — not necessarily the request's own
   * `model` field (which may have been omitted), and not `ANTHROPIC_MODEL` by assumption.
   * The provider is the one place that knows for certain, so it reports it back rather than
   * making every caller re-derive or assume it — lib/ai/usage.ts's logAIUsage requires this
   * exact value, not env.anthropic.model, precisely so a degraded call is never mis-recorded
   * (and mis-priced) as the ceiling model. */
  model: string;
}

export interface AIStructuredResult<T> {
  data: T;
  usage: AIUsage;
  /** See AITextResult.model's own doc — identical reasoning. */
  model: string;
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
  /** See AITextResult.model's own doc — a failed-but-billed call needs its real model
   * recorded exactly as much as a successful one does. */
  readonly model: string;

  constructor(params: { stopReason: string | null; usage: AIUsage; model: string }) {
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
    this.model = params.model;
  }
}

/**
 * `generateStructured` exhausted its one retry (lib/ai/anthropic-provider.ts) without ever
 * getting a schema-valid response — the model didn't call the required tool, or called it
 * with input that failed validation, on both attempts. This is the structured-output
 * sibling of AIResponseIncompleteError, for the same reason: up to two real, billed calls
 * happened here (the retry's whole point is a second real attempt, not a local recheck),
 * and a bare `Error` cannot carry that spend back to a caller that wants to log it.
 *
 * `usage` is the SUM across every attempt this call made, not just the last one — each
 * attempt is a separate billed request, and reporting only the final one would undercount
 * by exactly the tokens the first attempt spent before retrying.
 */
export class AIStructuredResponseFailedError extends Error {
  readonly usage: AIUsage;
  readonly model: string;

  constructor(params: { lastError: string | null; usage: AIUsage; model: string }) {
    // Same "no prompt or model reasoning in the message" rule as AIResponseIncompleteError —
    // this reaches server logs.
    super(`AI response failed schema validation after retry: ${params.lastError ?? "unknown validation error"}`);
    this.name = "AIStructuredResponseFailedError";
    this.usage = params.usage;
    this.model = params.model;
  }
}
