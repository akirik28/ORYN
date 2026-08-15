import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { globalSearch } from "@/lib/search";
import { SEARCH_RESULT_TYPE_LABELS } from "@/lib/search/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await requireUser();
  const query = q?.trim() ?? "";
  const results = query.length > 0 ? await globalSearch(query, session.userId!) : [];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Search"
        description="Universities, programs, opportunities, and your own profile — all in one place."
      />

      <form action="/search" className="flex gap-2">
        <Input name="q" defaultValue={query} placeholder="Search Oryn... (or press ⌘K anywhere)" autoFocus />
        <Button type="submit">Search</Button>
      </form>

      {query.length > 0 && query.length < 2 ? <p className="text-sm text-muted-foreground">Keep typing — search needs at least 2 characters.</p> : null}

      {query.length >= 2 ? (
        results.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {results.map((result) => (
              <li key={`${result.type}-${result.id}`}>
                <Link href={result.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{result.title}</p>
                    {result.subtitle ? <p className="truncate text-muted-foreground">{result.subtitle}</p> : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{SEARCH_RESULT_TYPE_LABELS[result.type]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={SearchIcon} title="No results" description={`Nothing matched "${query}".`} />
        )
      ) : null}
    </div>
  );
}
