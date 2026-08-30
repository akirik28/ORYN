import { requireUser } from "@/lib/security/dal";
import { globalSearch } from "@/lib/search";
import { SearchView } from "@/features/search/search-view";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await requireUser();
  const query = q?.trim() ?? "";
  const results = query.length > 0 ? await globalSearch(query, session.userId!) : [];

  return <SearchView query={query} results={results} />;
}
