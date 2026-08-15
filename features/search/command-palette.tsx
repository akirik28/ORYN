"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { searchAction } from "@/app/(app)/search/actions";
import { SEARCH_RESULT_TYPE_LABELS, type SearchResult, type SearchResultType } from "@/lib/search/types";

const GROUP_ORDER: SearchResultType[] = [
  "university",
  "program",
  "opportunity",
  "application",
  "goal",
  "project",
  "activity",
  "research_experience",
  "award",
  "work_experience",
  "volunteering_experience",
  "certification",
  "education_record",
  "test_score",
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchFailed, setSearchFailed] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `open` for the global keydown listener below, so its handler (registered
  // once) always reads the current value instead of closing over the initial render's.
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleOpenChange(!openRef.current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setHighlighted(0);
      setSearchFailed(false);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setHighlighted(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const data = await searchAction(value);
          setResults(data);
          setSearchFailed(false);
        } catch {
          setResults([]);
          setSearchFailed(true);
        }
      });
    }, 250);
  }

  const grouped = useMemo(() => {
    const byType = new Map<SearchResultType, SearchResult[]>();
    for (const result of results) {
      byType.set(result.type, [...(byType.get(result.type) ?? []), result]);
    }
    return GROUP_ORDER.map((type) => ({ type, items: byType.get(type) ?? [] })).filter((g) => g.items.length > 0);
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  function go(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[highlighted];
      if (target) go(target);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger
        render={
          <button
            type="button"
            aria-label="Search"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          />
        }
      >
        <Search className="size-4" />
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          className="fixed top-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">Search Oryn</DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b px-4">
            {isPending ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search universities, opportunities, your profile…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              Esc
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto py-2">
            {searchFailed ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Search isn&apos;t available right now. Please try again.
              </p>
            ) : query.trim().length > 0 && query.trim().length < 2 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Keep typing — at least 2 characters.</p>
            ) : query.trim().length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Search universities, opportunities, applications, and everything in your profile.
              </p>
            ) : flatResults.length === 0 && !isPending ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results for &quot;{query}&quot;.</p>
            ) : (
              grouped.map((group) => (
                <div key={group.type} className="px-2 py-1">
                  <p className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {SEARCH_RESULT_TYPE_LABELS[group.type]}
                  </p>
                  {group.items.map((item) => {
                    const index = flatResults.indexOf(item);
                    const isHighlighted = index === highlighted;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => go(item)}
                        onMouseEnter={() => setHighlighted(index)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          isHighlighted ? "bg-brand-primary-soft text-brand-primary-strong" : "hover:bg-muted"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.title}</span>
                          {item.subtitle ? <span className="block truncate text-xs opacity-70">{item.subtitle}</span> : null}
                        </span>
                        {isHighlighted ? <CornerDownLeft className="size-3.5 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
