import "server-only";

import { z } from "zod";
import { env } from "@/lib/env";
import { fetchProviderJson } from "./fetch-json";
import type { ProviderResult } from "./types";

const PROVIDER_NAME = "tavily";

const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),
  score: z.number(),
  raw_content: z.string().nullable().optional(),
});

const SearchResponseSchema = z.object({
  query: z.string(),
  answer: z.string().nullable().optional(),
  results: z.array(SearchResultSchema),
  response_time: z.number().optional(),
});

export type TavilySearchResult = z.infer<typeof SearchResultSchema>;

const ExtractResultSchema = z.object({
  url: z.string(),
  raw_content: z.string(),
});

const ExtractResponseSchema = z.object({
  results: z.array(ExtractResultSchema),
  failed_results: z.array(z.object({ url: z.string(), error: z.string() })).optional(),
});

export type TavilyExtractResult = z.infer<typeof ExtractResultSchema>;
export type TavilyExtractFailure = { url: string; error: string };

export interface TavilyExtractResponse {
  results: TavilyExtractResult[];
  /** Per-URL failures Tavily itself reported for this batch — dropped silently by an
   * earlier version of `extract()` below, which returned only `results`. Needed by
   * lib/opportunities/reverification/corroborate.ts (design doc §7.3's second corroborating
   * signal: "Tavily's failed_results reports the same status for the URL"). Always present,
   * empty array rather than undefined, when nothing failed. */
  failedResults: TavilyExtractFailure[];
}

export interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeDomains?: string[];
  excludeDomains?: string[];
  timeRange?: "day" | "week" | "month" | "year";
}

/**
 * Thin wrapper over Tavily's REST API (no SDK — the API is small enough that a typed
 * fetch wrapper is simpler than a dependency). Used for opportunity discovery and
 * fact-checking university requirement pages (AGENTS.md section 9 / Phase 11.2).
 */
export class TavilySearchProvider {
  private get apiKey(): string | null {
    return env.tavily.apiKey ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async search(query: string, options: TavilySearchOptions = {}): Promise<ProviderResult<TavilySearchResult[]>> {
    if (!this.apiKey) {
      return { success: false, error: { type: "not_configured", message: "TAVILY_API_KEY is not set." } };
    }

    const result = await fetchProviderJson(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          query,
          max_results: options.maxResults ?? 8,
          search_depth: options.searchDepth ?? "basic",
          include_domains: options.includeDomains,
          exclude_domains: options.excludeDomains,
          time_range: options.timeRange,
        }),
      },
      { provider: PROVIDER_NAME }
    );

    if (!result.success) return result;

    const parsed = SearchResponseSchema.safeParse(result.data);
    if (!parsed.success) {
      return { success: false, error: { type: "malformed_response", message: "Tavily search response didn't match the expected shape." } };
    }

    return { success: true, data: parsed.data.results };
  }

  /**
   * `data.failedResults` is required, not optional-and-usually-empty — a caller checking
   * corroboration (lib/opportunities/reverification/corroborate.ts) needs to distinguish
   * "Tavily reported nothing wrong with this URL" from "I forgot to look," and an optional
   * field invites the second reading by accident. Previously returned `TavilyExtractResult[]`
   * directly, silently discarding `failed_results` even though ExtractResponseSchema already
   * parsed it — found while wiring up the re-verification job's corroboration ladder
   * (design doc §7.3), which needs exactly this signal and has no other source for it. No
   * caller of the old shape exists in the codebase (grepped before changing this), so this is
   * a correction, not a breaking change requiring a migration of call sites.
   */
  async extract(urls: string[]): Promise<ProviderResult<TavilyExtractResponse>> {
    if (!this.apiKey) {
      return { success: false, error: { type: "not_configured", message: "TAVILY_API_KEY is not set." } };
    }
    if (urls.length === 0) return { success: true, data: { results: [], failedResults: [] } };

    const result = await fetchProviderJson(
      "https://api.tavily.com/extract",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ urls, extract_depth: "basic", format: "markdown" }),
      },
      { provider: PROVIDER_NAME }
    );

    if (!result.success) return result;

    const parsed = ExtractResponseSchema.safeParse(result.data);
    if (!parsed.success) {
      return { success: false, error: { type: "malformed_response", message: "Tavily extract response didn't match the expected shape." } };
    }

    return { success: true, data: { results: parsed.data.results, failedResults: parsed.data.failed_results ?? [] } };
  }
}

export const tavilyProvider = new TavilySearchProvider();
