"use server";

import { requireUser } from "@/lib/security/dal";
import { globalSearch } from "@/lib/search";
import type { SearchResult } from "@/lib/search/types";

export async function searchAction(query: string): Promise<SearchResult[]> {
  const session = await requireUser();
  return globalSearch(query, session.userId!);
}
