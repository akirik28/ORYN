import "server-only";

import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  AIProviderNotConfiguredError,
  type AIProvider,
  type AIRequest,
  type AIStructuredRequest,
  type AIStructuredResult,
  type AITextResult,
} from "./provider";

const DEFAULT_MAX_TOKENS = 2048;

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
    const message = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: request.system,
      messages: buildMessages(request),
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic response contained no text content.");
    }

    return {
      text: textBlock.text,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    };
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

      const message = await client.messages.create({
        model: env.anthropic.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: [{ role: "user", content: buildUserContent({ ...request, prompt }) }],
        tools: [tool],
        tool_choice: { type: "tool", name: request.schemaName },
      });

      const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
      const toolUse = message.content.find((block) => block.type === "tool_use");

      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "Model did not call the required tool.";
        continue;
      }

      const parsed = request.schema.safeParse(toolUse.input);
      if (parsed.success) {
        return { data: parsed.data, usage };
      }

      lastError = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    }

    throw new Error(`AI response failed schema validation after retry: ${lastError}`);
  }
}
