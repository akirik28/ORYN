import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { globalSearch } from "@/lib/search";
import { SearchView } from "@/features/search/search-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search.view");
  return { title: t("title") };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await requireUser();
  const query = q?.trim() ?? "";
  const results = query.length > 0 ? await globalSearch(query, session.userId!) : [];

  return <SearchView query={query} results={results} />;
}
