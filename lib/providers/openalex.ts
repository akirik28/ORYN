import "server-only";

import { z } from "zod";
import { env } from "@/lib/env";
import { fetchProviderJson } from "./fetch-json";
import type { ProviderResult } from "./types";

const PROVIDER_NAME = "openalex";

const WorkSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  publication_year: z.number().nullable(),
  topics: z.array(z.object({ display_name: z.string() })).optional(),
});

const WorksResponseSchema = z.object({
  results: z.array(WorkSchema),
});

export interface ResearchWork {
  id: string;
  title: string;
  publicationYear: number | null;
  topics: string[];
}

/**
 * OpenAlex — free, no API key required (AGENTS.md section 10). Used to ground the research-project
 * generator in real current research themes rather than the AI inventing topics from
 * nothing. `mailto` opts into OpenAlex's faster "polite pool" if configured, but works
 * fine without it.
 */
export class OpenAlexResearchProvider {
  async searchWorks(query: string, perPage = 10): Promise<ProviderResult<ResearchWork[]>> {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("sort", "cited_by_count:desc");
    if (env.openAlex.contactEmail) url.searchParams.set("mailto", env.openAlex.contactEmail);

    const result = await fetchProviderJson(url.toString(), { method: "GET" }, { provider: PROVIDER_NAME });
    if (!result.success) return result;

    const parsed = WorksResponseSchema.safeParse(result.data);
    if (!parsed.success) {
      return { success: false, error: { type: "malformed_response", message: "OpenAlex response didn't match the expected shape." } };
    }

    return {
      success: true,
      data: parsed.data.results
        .filter((w): w is typeof w & { title: string } => Boolean(w.title))
        .map((w) => ({
          id: w.id,
          title: w.title,
          publicationYear: w.publication_year,
          topics: (w.topics ?? []).map((t) => t.display_name),
        })),
    };
  }
}

export const openAlexProvider = new OpenAlexResearchProvider();
