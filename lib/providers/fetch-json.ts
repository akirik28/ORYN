import "server-only";

import type { ProviderResult } from "./types";
import { recordProviderSuccess, recordProviderFailure } from "./health";
import { reportError } from "@/lib/monitoring";

/**
 * Reports alongside recordProviderFailure, never in place of it. Every call site below
 * passes only a message this function builds itself from the response status or a caught
 * network error — never `url` (a search provider's query string lives there), never
 * `init.body` (the outgoing request), and never the response body. `provider`/`error_type`
 * are fixed, code-owned identifiers, not caller input, so they're safe as tags with no
 * redaction needed.
 */
async function reportProviderFailure(provider: string, errorType: string, message: string): Promise<void> {
  await reportError(new Error(message), { source: "provider", tags: { provider, error_type: errorType } });
}

/**
 * Shared HTTP layer for every external provider (Tavily, College Scorecard, OpenAlex):
 * timeout, status-code classification (auth/rate-limit/unavailable), and malformed-JSON
 * handling, all funneled into one ProviderResult shape instead of each provider
 * reinventing try/catch (Phase 33/34/75). Records provider_health on every call.
 */
export async function fetchProviderJson(
  url: string,
  init: RequestInit,
  opts: { provider: string; timeoutMs?: number }
): Promise<ProviderResult<unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);

    if (response.status === 401 || response.status === 403) {
      const error = { type: "auth_failed" as const, message: `${opts.provider} rejected the API credential (HTTP ${response.status}).` };
      await recordProviderFailure(opts.provider, error.message);
      await reportProviderFailure(opts.provider, error.type, error.message);
      return { success: false, error };
    }
    if (response.status === 429) {
      const error = { type: "rate_limited" as const, message: `${opts.provider} rate limit exceeded.` };
      await recordProviderFailure(opts.provider, error.message);
      await reportProviderFailure(opts.provider, error.type, error.message);
      return { success: false, error };
    }
    if (!response.ok) {
      const error = { type: "unavailable" as const, message: `${opts.provider} returned HTTP ${response.status}.` };
      await recordProviderFailure(opts.provider, error.message);
      await reportProviderFailure(opts.provider, error.type, error.message);
      return { success: false, error };
    }

    const json = await response.json().catch(() => null);
    if (json === null) {
      const error = { type: "malformed_response" as const, message: `${opts.provider} returned a response that wasn't valid JSON.` };
      await recordProviderFailure(opts.provider, error.message);
      await reportProviderFailure(opts.provider, error.type, error.message);
      return { success: false, error };
    }

    await recordProviderSuccess(opts.provider);
    return { success: true, data: json };
  } catch (rawError) {
    clearTimeout(timeout);
    const isAbort = rawError instanceof Error && rawError.name === "AbortError";
    const error = {
      type: isAbort ? ("timeout" as const) : ("unavailable" as const),
      message: isAbort ? `${opts.provider} request timed out.` : rawError instanceof Error ? rawError.message : "Unknown network error.",
    };
    await recordProviderFailure(opts.provider, error.message);
    await reportProviderFailure(opts.provider, error.type, error.message);
    return { success: false, error };
  }
}
