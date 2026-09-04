import type { AIProvider, AIRequest, AIStructuredRequest, AIStructuredResult, AITextResult } from "@/lib/ai/provider";

/**
 * First mock AIProvider fixture in the repo (no prior test needed one — see
 * docs/counselor-core-plan.md §14). Queue responses in order; each call consumes the next
 * one. Passing an Error instance queues a thrown failure, so callers can test their own
 * error handling (not the SDK's) without a network dependency or the real Anthropic SDK.
 *
 * Deliberately does NOT replicate AnthropicProvider's internal retry-once-then-throw
 * behavior — that belongs to lib/ai/anthropic-provider.ts's own tests (if/when written),
 * not to every caller's mock. This fixture answers "what does my code do when the provider
 * succeeds / is unconfigured / fails outright", which is what matters to a caller.
 */
export class MockAIProvider implements AIProvider {
  private structuredQueue: unknown[] = [];
  private textQueue: (string | Error)[] = [];
  public structuredCalls: AIStructuredRequest<unknown>[] = [];
  public textCalls: AIRequest[] = [];
  public textStreamCalls: AIRequest[] = [];

  queueStructured(response: unknown): this {
    this.structuredQueue.push(response);
    return this;
  }

  queueText(response: string | Error): this {
    this.textQueue.push(response);
    return this;
  }

  async generateText(request: AIRequest): Promise<AITextResult> {
    this.textCalls.push(request);
    const next = this.textQueue.shift();
    if (next === undefined) throw new Error("MockAIProvider: no more text responses queued");
    if (next instanceof Error) throw next;
    return { text: next, usage: { inputTokens: 10, outputTokens: 10 }, model: request.model ?? "mock-model" };
  }

  /** Shares textQueue with generateText — same underlying response, callers shouldn't need
   * to know which of the two methods their code under test actually calls. Delivers the
   * whole queued string as a single `onDelta` call rather than simulating word-by-word
   * chunking: enough for a caller testing "did I accumulate onDelta into the right final
   * text", which is what every caller of this method actually needs to verify. A test that
   * specifically needs multi-chunk behavior can call `onDelta` itself multiple times against
   * a hand-built provider instead of asking this shared fixture to guess a chunking scheme
   * no real caller depends on. */
  async generateTextStream(request: AIRequest, onDelta: (delta: string) => void): Promise<AITextResult> {
    this.textStreamCalls.push(request);
    const next = this.textQueue.shift();
    if (next === undefined) throw new Error("MockAIProvider: no more text responses queued");
    if (next instanceof Error) throw next;
    onDelta(next);
    return { text: next, usage: { inputTokens: 10, outputTokens: 10 }, model: request.model ?? "mock-model" };
  }

  async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>> {
    this.structuredCalls.push(request as AIStructuredRequest<unknown>);
    const next = this.structuredQueue.shift();
    if (next === undefined) throw new Error("MockAIProvider: no more structured responses queued");
    if (next instanceof Error) throw next;
    const parsed = request.schema.safeParse(next);
    if (!parsed.success) {
      throw new Error(`MockAIProvider: queued response failed schema validation: ${parsed.error.message}`);
    }
    return { data: parsed.data, usage: { inputTokens: 10, outputTokens: 10 }, model: request.model ?? "mock-model" };
  }
}
