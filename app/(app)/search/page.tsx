import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { globalSearch } from "@/lib/search";
import { SEARCH_RESULT_TYPE_LABELS } from "@/lib/search/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await requireUser();
  const query = q?.trim() ?? "";
  const results = query.length > 0 ? await globalSearch(query, session.userId!) : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Search</h1>
        <p className="mt-1 text-muted-foreground">Universities, programs, opportunities, and your own profile — all in one place.</p>
      </div>

      <form action="/search" className="flex gap-2">
        <Input name="q" defaultValue={query} placeholder="Search Oryn..." autoFocus />
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
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            <SearchIcon className="size-5" />
            <p>No results for &quot;{query}&quot;.</p>
          </div>
        )
      ) : null}
    </div>
  );
}
