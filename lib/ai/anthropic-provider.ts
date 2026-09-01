import "server-only";

import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { recordProviderSuccess, recordProviderFailure } from "@/lib/providers/health";
import {
  AIProviderNotConfiguredError,
  AIResponseIncompleteError,
  type AIProvider,
  type AIRequest,
  type AIStructuredRequest,
  type AIStructuredResult,
  type AITextResult,
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

function getClient(): Anthropic {
  if (!env.anthropic.apiKey) {
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
    const client = getClient();

    // Wraps only the actual network call, not getClient() above — a missing API key is a
    // deployment/configuration fact (AIProviderNotConfiguredError), not a live health
    // signal, and recording it as a provider_health failure would make a dashboard read
    // "Anthropic is degraded" when the honest statement is "nobody has set the key yet".
    let message: Anthropic.Message;
    try {
      message = await client.messages.create({
        model: env.anthropic.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: buildMessages(request),
      });
    } catch (error) {
      await recordProviderFailure(PROVIDER_NAME, error instanceof Error ? error.message : "Unknown error calling Anthropic.");
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
      const incomplete = new AIResponseIncompleteError({ stopReason: message.stop_reason, usage });
      await recordProviderFailure(PROVIDER_NAME, incomplete.message);
      throw incomplete;
    }

    await recordProviderSuccess(PROVIDER_NAME);

    return { text: textBlock.text, usage };
  }

  async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>> {
    const client = getClient();
    const tool: Anthropic.Tool = {
      name: request.schemaName,
      description: request.schemaDescription,
      input_schema: toToolInputSchema(request.schema as z.ZodType<unknown>),
    };

    let lastError: string | null = null;

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
          model: env.anthropic.model,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: request.system,
          messages: [{ role: "user", content: buildUserContent({ ...request, prompt }) }],
          tools: [tool],
          tool_choice: { type: "tool", name: request.schemaName },
        });
      } catch (error) {
        await recordProviderFailure(PROVIDER_NAME, error instanceof Error ? error.message : "Unknown error calling Anthropic.");
        throw error;
      }

      const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
      const toolUse = message.content.find((block) => block.type === "tool_use");

      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "Model did not call the required tool.";
        continue;
      }

      const parsed = request.schema.safeParse(toolUse.input);
      if (parsed.success) {
        await recordProviderSuccess(PROVIDER_NAME);
        return { data: parsed.data, usage };
      }

      lastError = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    }

    // Recorded as a health failure: the call reached Anthropic on both attempts, but the
    // response never matched the required schema — the same "landed but not usable"
    // signal AIResponseIncompleteError records in generateText above, just for the
    // structured-output path's own failure shape.
    const error = new Error(`AI response failed schema validation after retry: ${lastError}`);
    await recordProviderFailure(PROVIDER_NAME, error.message);
    throw error;
  }
}
