"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { searchEntitiesAction, createCustomEntityAction, resolveEntityAction } from "@/app/(app)/entities/actions";
import type { EntitySearchResult } from "@/lib/entities/types";
import { ENTITY_SCOPES, type EntityScope } from "@/lib/entities/field-policy";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * `customLabel` is free English text threaded in from callers (lib/entities/field-policy.ts's
 * per-scope defaults, and per-field overrides in features/profile/field-config.ts) — not a
 * closed enum this file owns, so it can't be translated here without reaching into those
 * other files' territory. "Add {article} {noun}" and "Can't find your {noun}?" therefore
 * interpolate the noun as-is (still English) rather than attempting it; see the entities.*
 * catalog keys for how each locale's template copes with an untranslated noun. English gets
 * its article computed here since that's a same-file, low-risk fix already needed either way
 * (the old `a ${noun}` template said "a organization", "a issuer", "a institution or lab" —
 * never correct); Turkish sidesteps the problem structurally (see the "cantFind"/"addTitle"
 * catalog comment) rather than needing a Turkish equivalent of this table.
 */
const VOWEL_SOUND_EXCEPTIONS = ["university"];
function englishArticle(noun: string): "a" | "an" {
  const firstWord = noun.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (VOWEL_SOUND_EXCEPTIONS.includes(firstWord)) return "a";
  return /^[aeiou]/.test(firstWord) ? "an" : "a";
}

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
  const t = useTranslations("entities");
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
  // Whether the *currently linked* entity (not a search result — those already carry
  // their own `isCustom` from the server) is a student-submitted row still awaiting a
  // check. `entityId` alone can't answer this; it's just an id. Paired with the id it was
  // resolved for, not stored as a bare boolean — a plain boolean reset to "unknown" every
  // time entityId changes would stomp the optimistic value onCreated sets below the instant
  // it sets it (found by the test for that path, not assumed correct because it compiled):
  // the effect fires on the very entityId change onCreated just caused, and without this
  // pairing it can't tell "I already know this" from "I need to ask again". Missing (or
  // for a different id) covers two honestly-indistinguishable-to-the-student cases on
  // purpose: not yet resolved, and resolved to nothing worth claiming either way — both
  // render no message rather than a guess.
  const [linkedEntity, setLinkedEntity] = useState<{ id: string; isCustom: boolean } | null>(null);
  const listboxId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const linkedEntityRequestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Found 2026-09-02, onboarding audit: this used to render "Linked to a verified entry"
  // for ANY entityId, including one the student just self-added seconds earlier through
  // "Can't find your X?" — which honestly discloses the opposite in its own dialog
  // (unverifiedNotice below). The component had no way to know better: `entityId` was its
  // only signal about the link. This fetches the one fact it was missing.
  //
  // No branch here for `!entityId`: the id-matching check below (`linkedEntity?.id ===
  // entityId`) already makes a stale `linkedEntity` from a previous id inapplicable the
  // moment entityId no longer matches it — nothing else needs to notice entityId became
  // null. Setting state synchronously in an effect body (rather than inside the async
  // callback below, the pattern React's own hooks lint rule expects) is what an earlier
  // draft did here to "reset" that case, and the linter was right to reject it: it wasn't
  // needed.
  useEffect(() => {
    // Nothing to resolve, or already known for this exact id (a prior fetch settled it, or
    // onCreated set it optimistically moments ago) — skip the round trip rather than fetch
    // the same fact again, which would also briefly un-set the optimistic value while the
    // redundant fetch was in flight.
    if (!entityId || linkedEntity?.id === entityId) return;
    const thisRequest = ++linkedEntityRequestIdRef.current;
    resolveEntityAction(scope, entityId).then((resolved) => {
      if (linkedEntityRequestIdRef.current === thisRequest) setLinkedEntity(resolved ? { id: entityId, isCustom: resolved.isCustom } : null);
    });
  }, [entityId, scope, linkedEntity]);

  // Cancel a pending debounced search when this component goes away. Without this the
  // timer set below still fires after unmount and calls searchEntitiesAction -- a real
  // server action -- for a component nobody is looking at any more: every abandoned
  // keystroke within DEBOUNCE_MS of navigating away costs a request whose result is
  // discarded. The requestIdRef guard inside the timer only protects against *stale*
  // results racing a newer search; it does nothing about the call itself, and nothing at
  // all once the component is gone.
  //
  // Found 2026-09-03 through a cross-test leak rather than by reading this file: a
  // pending timer from one test fired during the next one, so the assertion that failed
  // was in a test whose own behaviour was correct, carrying the *previous* test's query
  // in the call args. Worth knowing next time an unrelated-looking test goes flaky under
  // parallel load -- a timer with no unmount cleanup looks exactly like that.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
    if (!open) return;
    // Escape must dismiss the popup whenever it's actually open — including the
    // zero-result states (no matches, search failed, or nothing but the "add custom"
    // affordance) — not only when there are options to navigate. Checked before the
    // results-length guard below, which exists for the option-navigation keys only.
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
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

      {linkedEntity?.id === entityId && linkedEntity.isCustom === false ? <p className="mt-1 text-xs text-muted-foreground">{t("linkedToVerified")}</p> : null}
      {linkedEntity?.id === entityId && linkedEntity.isCustom === true ? <p className="mt-1 text-xs text-muted-foreground">{t("linkedToUnverified")}</p> : null}

      {open && hasQuery && (results.length > 0 || canAddCustom || searchFailed || noResults) ? (
        <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {searchFailed ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t("searchFailed")}</li>
          ) : noResults && !canAddCustom ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t("noMatches")}</li>
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
                  {result.isCustom ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("unverifiedTag")}</span> : null}
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
                <Plus className="size-3.5" /> {t("cantFind", { noun: customNoun })}
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
            // A freshly created entity: known synchronously, since createCustomEntity can
            // only ever produce a user_submitted row (lib/entities/resolve.ts's own
            // comment) — set directly rather than waiting on the entityId-change effect
            // above to re-resolve the same fact a moment later. A "did you mean" pick is
            // an existing entity this dialog never learned the real state of (see
            // DuplicateCandidate's own comment) — left unknown (null) here on purpose;
            // that effect resolves the true state within one round trip regardless.
            setLinkedEntity(entity.isCustom === undefined ? null : { id: entity.id, isCustom: entity.isCustom });
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
  onCreated: (entity: { id: string; canonicalName: string; isCustom?: boolean }) => void;
}) {
  const t = useTranslations("entities");
  const tCommon = useTranslations("common");
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
          <DialogTitle>
            {scope === "school" ? t("schoolAddTitle") : t("addTitle", { article: englishArticle(noun), noun })}
          </DialogTitle>
        </DialogHeader>

        {duplicates && duplicates.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("didYouMean")}</p>
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
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : t("noneOfThese")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom-entity-name">{t("name")}</Label>
              <Input id="custom-entity-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="custom-entity-city">{t("city")}</Label>
                <Input id="custom-entity-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-entity-country">{t("country")}</Label>
                <Input id="custom-entity-country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            {/* No website field: a registry row's official_url is sourced during
                verification from the official page itself. A student-typed URL would put
                unverified data on a row every other student reads. */}
            <p className="text-xs text-muted-foreground">{t("unverifiedNotice")}</p>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}

        {!duplicates ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={() => submit(false)} disabled={isPending || !name.trim()}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : tCommon("add")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
