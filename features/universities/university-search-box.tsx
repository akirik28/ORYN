"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchEntitiesAction } from "@/app/(app)/entities/actions";
import type { EntitySearchResult } from "@/lib/entities/types";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Lives inside the university browse page's existing GET `<form>` (kept as the `q` field,
 * unchanged) and layers a live suggestions dropdown on top of it, backed by the same
 * canonical, alias-aware registry search every EntityCombobox field uses
 * (`searchEntitiesAction("university", ...)`) — that scope already existed and already
 * excludes superseded duplicate rows, it just had no UI caller yet. Deliberately not
 * EntityCombobox itself: that component's contract is "select a value into a controlled
 * form field"; this one navigates straight to a result instead, and universities/
 * opportunities take no custom-fallback affordance anyway (fully curated registries).
 * A plain Enter with no suggestion highlighted is left alone so the surrounding form's
 * native submit still re-renders the page with the full filtered grid below.
 */
export function UniversitySearchBox({ defaultValue, country }: { defaultValue?: string; country?: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const listboxId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function runSearch(text: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const thisRequest = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const found = await searchEntitiesAction("university", trimmed, { country });
      if (requestIdRef.current === thisRequest) {
        setResults(found);
        setIsSearching(false);
        setHighlightedIndex(-1);
      }
    }, DEBOUNCE_MS);
  }

  function handleChange(next: string) {
    setQuery(next);
    setOpen(true);
    runSearch(next);
  }

  function goToUniversity(id: string) {
    setOpen(false);
    setResults([]);
    router.push(`/universities/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      goToUniversity(results[highlightedIndex].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Search universities"
          className="pl-7 sm:w-72"
          value={query}
          placeholder="Search by university name…"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {isSearching ? <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full min-w-72 overflow-auto rounded-lg border bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {results.map((result, index) => (
            <li key={result.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm hover:bg-brand-primary-subtle ${index === highlightedIndex ? "bg-brand-primary-subtle" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => goToUniversity(result.id)}
              >
                <span className="font-medium">{result.displayName}</span>
                {result.subtitle ? <span className="text-xs text-muted-foreground">{result.subtitle}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
