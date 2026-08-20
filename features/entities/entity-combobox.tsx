"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { searchEntitiesAction, createCustomEntityAction } from "@/app/(app)/entities/actions";
import type { EntitySearchResult } from "@/lib/entities/types";
import { ENTITY_SCOPES, type EntityScope } from "@/lib/entities/field-policy";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export interface EntityComboboxValue {
  id: string | null;
  displayName: string;
}

/**
 * Shared search/select UX for every canonical entity field — school, employer, NGO,
 * lab, sports team, university, opportunity all use this one component, differing only
 * by `scope` (lib/entities/field-policy.ts, which mirrors the database's own per-field
 * entity-type triggers). Fully controlled by `value`/`onChange` (like every other field
 * in DynamicFormFields) rather than mirroring the prop into local state, so there's no
 * "sync prop to state" effect to keep correct. Selecting a result persists its `id`, not
 * just the displayed string; manually editing the text after a selection clears the id
 * (the text and the linked entity must never silently drift apart) until a new selection
 * is made. `allowCustom` exposes the "Can't find your X?" fallback with its required
 * duplicate check — it is ignored for scopes the policy gives no custom fallback type
 * (universities and opportunities stay fully curated registries).
 */
export function EntityCombobox({
  id,
  scope,
  value,
  entityId,
  onChange,
  context,
  placeholder,
  allowCustom = false,
  customLabel,
}: {
  id?: string;
  scope: EntityScope;
  value: string;
  entityId: string | null;
  onChange: (next: EntityComboboxValue) => void;
  context?: { country?: string | null; city?: string | null };
  placeholder?: string;
  allowCustom?: boolean;
  customLabel?: string;
}) {
  // A scope with no custom fallback type cannot accept one however the caller configured
  // it — the Server Action refuses it too, so offering the affordance would only produce
  // an error the student can do nothing about.
  const canAddCustom = allowCustom && ENTITY_SCOPES[scope].customFallbackType !== null;
  const customNoun = customLabel ?? ENTITY_SCOPES[scope].customLabel;
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  // The query a search has actually resolved (or failed) for — distinguishes "we looked
  // and found nothing" from "nothing's been searched yet" (e.g. focusing a field that
  // already has a linked value, before the user types anything), which would otherwise
  // both look like an empty `results` array.
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDialogKey, setCustomDialogKey] = useState(0);
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
      setSearchFailed(false);
      return;
    }
    setIsSearching(true);
    setSearchFailed(false);
    const thisRequest = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchEntitiesAction(scope, trimmed, context);
        if (requestIdRef.current === thisRequest) {
          setResults(found);
          setIsSearching(false);
          setHighlightedIndex(-1);
          setSearchedQuery(trimmed);
        }
      } catch {
        // A failed lookup must never leave the spinner running forever — surface it as a
        // real (if terse) state instead of looking unresponsive.
        if (requestIdRef.current === thisRequest) {
          setResults([]);
          setIsSearching(false);
          setSearchFailed(true);
          setSearchedQuery(trimmed);
        }
      }
    }, DEBOUNCE_MS);
  }

  function selectResult(result: EntitySearchResult) {
    onChange({ id: result.id, displayName: result.displayName });
    setOpen(false);
    setResults([]);
  }

  function handleTextChange(next: string) {
    setOpen(true);
    // Editing the text after a selection was made breaks the link — the text and the
    // linked entity must never silently drift apart (spec section 5's own reasoning
    // extended: an id must always refer to what's actually displayed).
    onChange({ id: null, displayName: next });
    runSearch(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        e.preventDefault();
        selectResult(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const trimmedValue = value.trim();
  const hasQuery = trimmedValue.length >= MIN_QUERY_LENGTH;
  const noResults = hasQuery && !isSearching && !searchFailed && searchedQuery === trimmedValue && results.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="pl-7"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleTextChange(e.target.value)}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {isSearching ? <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
      </div>

      {entityId ? <p className="mt-1 text-xs text-muted-foreground">Linked to a verified entry.</p> : null}

      {open && hasQuery && (results.length > 0 || canAddCustom || searchFailed || noResults) ? (
        <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {searchFailed ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Search isn&apos;t working right now — try again in a moment.</li>
          ) : noResults && !canAddCustom ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matches found.</li>
          ) : null}
          {results.map((result, index) => (
            <li key={result.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm hover:bg-brand-primary-subtle ${index === highlightedIndex ? "bg-brand-primary-subtle" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectResult(result)}
              >
                <span className="font-medium">
                  {result.displayName}
                  {result.isCustom ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(unverified)</span> : null}
                </span>
                {result.subtitle ? <span className="text-xs text-muted-foreground">{result.subtitle}</span> : null}
              </button>
            </li>
          ))}
          {canAddCustom ? (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm text-brand-primary hover:bg-brand-primary-subtle"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  setCustomDialogKey((k) => k + 1);
                  setCustomOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Can&apos;t find your {customNoun}?
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {canAddCustom ? (
        <CreateCustomEntityDialog
          key={customDialogKey}
          open={customOpen}
          onOpenChange={setCustomOpen}
          scope={scope}
          noun={customNoun}
          initialName={value}
          context={context}
          onCreated={(entity) => {
            onChange({ id: entity.id, displayName: entity.canonicalName });
            setCustomOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CreateCustomEntityDialog({
  open,
  onOpenChange,
  scope,
  noun,
  initialName,
  context,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: EntityScope;
  noun: string;
  initialName: string;
  context?: { country?: string | null; city?: string | null };
  onCreated: (entity: { id: string; canonicalName: string }) => void;
}) {
  // Fresh on every mount only — the parent forces a remount (via a changing `key`) each
  // time the dialog is reopened, so these never need to be reset by an effect.
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(context?.city ?? "");
  const [country, setCountry] = useState(context?.country ?? "");
  const [duplicates, setDuplicates] = useState<{ id: string; canonicalName: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(confirmDespiteDuplicates: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await createCustomEntityAction(scope, name, city || null, country || null, confirmDespiteDuplicates);
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      if (result.status === "possible_duplicates") {
        setDuplicates(result.candidates);
        return;
      }
      onCreated(result.entity);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {scope === "school" ? "your school" : `a ${noun}`}</DialogTitle>
        </DialogHeader>

        {duplicates && duplicates.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Did you mean one of these already-listed entries?</p>
            <ul className="space-y-1.5">
              {duplicates.map((candidate) => (
                <li key={candidate.id}>
                  <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => onCreated(candidate)}>
                    {candidate.canonicalName}
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => submit(true)}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "None of these — add it anyway"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom-entity-name">Name</Label>
              <Input id="custom-entity-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="custom-entity-city">City</Label>
                <Input id="custom-entity-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-entity-country">Country</Label>
                <Input id="custom-entity-country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            {/* No website field: a registry row's official_url is sourced during
                verification from the official page itself. A student-typed URL would put
                unverified data on a row every other student reads. */}
            <p className="text-xs text-muted-foreground">
              Oryn will add this as unverified until someone checks it against an official source.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        {!duplicates ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => submit(false)} disabled={isPending || !name.trim()}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
