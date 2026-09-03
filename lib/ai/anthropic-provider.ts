import "server-only";

import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { recordProviderSuccess, recordProviderFailure, recordProviderNotConfigured } from "@/lib/providers/health";
import { reportError } from "@/lib/monitoring";
import {
  AIProviderNotConfiguredError,
  AIResponseIncompleteError,
  AIStructuredResponseFailedError,
  type AIProvider,
  type AIRequest,
  type AIStructuredRequest,
  type AIStructuredResult,
  type AITextResult,
  type AIUsage,
} from "./provider";

/** Row name in `provider_health` — snake_case like the other three providers'
 * (college_scorecard), not the SDK/package name. */
const PROVIDER_NAME = "anthropic";

/**
 * `max_tokens` is a ceiling, not a reservation — an unused budget costs nothing, while too
 * small a budget is a hard failure. Current Claude models run adaptive thinking when a
 * request omits a `thinking` parameter (as every call here does), and thinking is drawn
 * from this same budget, so the floor has to clear the model's reasoning before any of it
 * is available for the answer.
 *
 * Raised from 2048 after the 2026-08-23 advisor benchmark: on a rich student profile that
 * value produced *truncated* text (1736 thinking tokens, stop_reason max_tokens), so it was
 * already below the working floor for a thinking model. Every current caller passes an
 * explicit maxTokens, so this only governs future ones — and it should not hand them a
 * value already measured as insufficient.
 */
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Async since 2026-09-03 (was sync) so the not-configured case can be recorded before it
 * throws — see recordProviderNotConfigured's own header for why this needed a distinct
 * synthetic status rather than being folded into a plain provider_health failure.
 */
async function getClient(): Promise<Anthropic> {
  if (!env.anthropic.apiKey) {
    await recordProviderNotConfigured(PROVIDER_NAME, "ANTHROPIC_API_KEY is not set.");
    throw new AIProviderNotConfiguredError();
  }
  return new Anthropic({ apiKey: env.anthropic.apiKey });
}

/**
 * Strips the JSON-Schema-only `$schema` key before handing the shape to Anthropic's tool
 * `input_schema` — it's metadata for JSON Schema tooling, not something the model needs.
 */
function toToolInputSchema(schema: z.ZodType<unknown>) {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema as Anthropic.Tool.InputSchema;
}

/**
 * The one place this file reports to Sentry — deliberately never passed `request`. Every
 * caller below hands over only what already goes to `recordProviderFailure` (an error's own
 * `.message`, or a schema-validation summary built from Zod issue paths/messages, never a
 * request field): a CV's text or a student's own prompt content must never be reachable from
 * this call, and not passing `request` here is what makes that true by construction rather
 * than by remembering to strip it. `model` is an identifier, not content, so it's fine as a
 * tag. Same failure-worth-reporting line `recordProviderFailure` already draws: a missing
 * API key (`getClient()`, above the try/catch every caller wraps) never reaches Sentry via
 * this function, because "nobody configured this yet" is a deployment fact, not an error —
 * still true after getClient() started recording it to provider_health (2026-09-03): that
 * change is about the admin panel's own visibility, a different question from whether this
 * specific alerting channel should fire.
 */
async function reportProviderFailure(message: string, model: string, tags?: Record<string, string>): Promise<void> {
  // Awaited, like recordProviderFailure alongside it: a serverless invocation can be frozen
  // the instant the response is sent, so a fire-and-forget call here could just never finish
  // — reportError() itself is what keeps this bounded (4s timeout, never throws/rejects).
  await reportError(new Error(message), { source: "ai_provider", tags: { provider: PROVIDER_NAME, model, ...tags } });
}

function buildUserContent(request: AIRequest): string | Anthropic.ContentBlockParam[] {
  if (!request.documents || request.documents.length === 0) {
    return request.prompt;
  }

  const documentBlocks: Anthropic.ContentBlockParam[] = request.documents.map((doc) => ({
    type: "document",
    title: doc.title ?? null,
    source:
      doc.mediaType === "application/pdf"
        ? { type: "base64", media_type: "application/pdf", data: doc.data }
        : { type: "text", media_type: "text/plain", data: doc.data },
  }));

  return [...documentBlocks, { type: "text", text: request.prompt }];
}

/** Prior turns (plain text) followed by the new final user turn (which may carry documents). */
function buildMessages(request: AIRequest): Anthropic.MessageParam[] {
  const history: Anthropic.MessageParam[] = (request.history ?? []).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
  return [...history, { role: "user", content: buildUserContent(request) }];
}

export class AnthropicProvider implements AIProvider {
  async generateText(request: AIRequest): Promise<AITextResult> {
    const client = await getClient();

    // Wraps only the actual network call, not getClient() above — a missing API key is a
    // deployment/configuration fact (AIProviderNotConfiguredError), recorded by getClient()
    // itself as the distinct `not_configured` synthetic status (2026-09-03), not folded into
    // a plain provider_health failure the way this comment used to say it deliberately
    // wasn't: that reasoning was "don't make a dashboard read 'Anthropic is degraded' when
    // the honest statement is 'nobody has set the key yet'", which still holds — it's why
    // getClient() calls recordProviderNotConfigured rather than recordProviderFailure — but
    // the conclusion changed from "so don't record it" to "so record it as what it actually
    // is", once a status existed that wouldn't be misread as an active failure.
    const model = request.model ?? env.anthropic.model;
    let message: Anthropic.Message;
    try {
      message = await client.messages.create({
        model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: buildMessages(request),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error calling Anthropic.";
      await recordProviderFailure(PROVIDER_NAME, errorMessage);
      await reportProviderFailure(errorMessage, model, { failure_mode: "transport" });
      throw error;
    }

    const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };

    // Note `.find` rather than `content[0]`: on a thinking model the text block is not
    // first — a thinking block precedes it — so the answer must be located by type.
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      // Carries stop_reason and usage so the caller can distinguish an exhausted budget
      // from a real API failure, and can still record tokens this turn actually burned.
      // Recorded as a provider_health failure too — the call reached Anthropic and came
      // back with nothing usable, which is exactly the kind of degradation this table
      // exists to surface, distinct from a clean network/auth failure above.
      const incomplete = new AIResponseIncompleteError({ stopReason: message.stop_reason, usage, model });
      await recordProviderFailure(PROVIDER_NAME, incomplete.message);
      await reportProviderFailure(incomplete.message, model, { failure_mode: "incomplete_response", stop_reason: String(message.stop_reason) });
      throw incomplete;
    }

    await recordProviderSuccess(PROVIDER_NAME);

    return { text: textBlock.text, usage, model };
  }

  async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>> {
    const client = await getClient();
    const tool: Anthropic.Tool = {
      name: request.schemaName,
      description: request.schemaDescription,
      input_schema: toToolInputSchema(request.schema as z.ZodType<unknown>),
    };

    let lastError: string | null = null;
    const model = request.model ?? env.anthropic.model;
    // Summed across every attempt, not replaced by the latest one — each attempt this loop
    // makes is a separate billed request (that's the whole point of a real retry, not a
    // local recheck), so a caller reading only the last attempt's usage would undercount by
    // exactly what the earlier attempt(s) already spent. See AIStructuredResponseFailedError's
    // own doc comment.
    let accumulatedUsage: AIUsage = { inputTokens: 0, outputTokens: 0 };

    // One retry on schema-validation failure (Phase 26): the model occasionally omits a
    // required field or invents an out-of-enum value. A single retry with the validation
    // error appended catches the common cases without masking a genuinely broken schema.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prompt = lastError
        ? `${request.prompt}\n\nYour previous response did not match the required schema: ${lastError}\nPlease call ${request.schemaName} again with corrected input.`
        : request.prompt;

      // Same reasoning as generateText: wraps only the network call. A throw here exits
      // the retry loop immediately (it's a transport/auth failure, not the schema-
      // validation case the loop exists for), so there's no risk of double-recording
      // across the two attempts.
      let message: Anthropic.Message;
      try {
        message = await client.messages.create({
          model,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: request.system,
          messages: [{ role: "user", content: buildUserContent({ ...request, prompt }) }],
          tools: [tool],
          tool_choice: { type: "tool", name: request.schemaName },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error calling Anthropic.";
        await recordProviderFailure(PROVIDER_NAME, errorMessage);
        await reportProviderFailure(errorMessage, model, { failure_mode: "transport", schema: request.schemaName });
        throw error;
      }

      const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
      accumulatedUsage = { inputTokens: accumulatedUsage.inputTokens + usage.inputTokens, outputTokens: accumulatedUsage.outputTokens + usage.outputTokens };
      const toolUse = message.content.find((block) => block.type === "tool_use");

      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "Model did not call the required tool.";
        continue;
      }

      const parsed = request.schema.safeParse(toolUse.input);
      if (parsed.success) {
        await recordProviderSuccess(PROVIDER_NAME);
        // accumulatedUsage, not the current attempt's usage alone: a validation failure that
        // succeeds on retry still spent real tokens on the first (discarded) attempt. Using
        // only the final attempt's usage here would silently under-bill by exactly that much
        // on every retried-then-succeeded call — the success-path sibling of the gap
        // AIStructuredResponseFailedError's own usage field exists to close on the failure
        // path. Found auditing this exact function for the 2026-09-02 structured-output
        // validation-failure sweep, not from a live incident.
        return { data: parsed.data, usage: accumulatedUsage, model };
      }

      lastError = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    }

    // Recorded as a health failure: the call reached Anthropic on both attempts, but the
    // response never matched the required schema — the same "landed but not usable"
    // signal AIResponseIncompleteError records in generateText above, just for the
    // structured-output path's own failure shape. Carries accumulatedUsage rather than a
    // bare Error — up to two real, billed calls happened by this point, and without this a
    // caller has no way to log what was actually spent (found live: cv_extraction and
    // achievement_refinement both call generateStructured directly and only ever logged
    // usage on the success path, so a retry-exhausted failure here was spending real money
    // completely invisibly to ai_usage — the identical shape as the SEV-1 generateText fix
    // above, just never extended to this path).
    const error = new AIStructuredResponseFailedError({ lastError, usage: accumulatedUsage, model });
    await recordProviderFailure(PROVIDER_NAME, error.message);
    // lastError is a Zod issue summary (field path + expected-shape message, e.g.
    // "category: Invalid enum value") — never the model's actual output values, so this
    // stays within the same no-content rule as the other two call sites above.
    await reportProviderFailure(error.message, model, { failure_mode: "schema_validation", schema: request.schemaName });
    throw error;
  }
}
