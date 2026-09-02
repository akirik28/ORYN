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

  async extract(urls: string[]): Promise<ProviderResult<TavilyExtractResult[]>> {
    if (!this.apiKey) {
      return { success: false, error: { type: "not_configured", message: "TAVILY_API_KEY is not set." } };
    }
    if (urls.length === 0) return { success: true, data: [] };

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

    return { success: true, data: parsed.data.results };
  }
}

export const tavilyProvider = new TavilySearchProvider();
