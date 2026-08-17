"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

const MAX_VISIBLE = 8;

/**
 * Canonical-suggestion text input for closed-ish vocabularies that don't warrant the full
 * canonical-entity registry (lib/entities/*, EntityCombobox): test names, course subjects —
 * a small, known, mostly-static list where a fixed `select` would be too rigid (a genuinely
 * custom course subject is common and legitimate) but plain free text invites exactly the
 * fragmentation Priority 2's founder brief calls out ("sat"/"SAT"/"Sat" as three different
 * stored values). Same interaction contract as EntityCombobox (typeahead, keyboard nav,
 * Escape/Enter) but synchronous over an in-memory list — no debounce, no server round trip,
 * and critically no "id" concept: there is nothing to link to, the typed text IS the value,
 * and it is never rejected for not matching a suggestion. This is the deliberate difference
 * from EntityCombobox: universities/schools/employers are curated registries where a wrong
 * selection is a data-integrity problem; a course subject or test name is a label, where the
 * suggestion exists purely to reduce fragmentation, not to gate what can be entered.
 */
export function SuggestInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = (query ? suggestions.filter((s) => s.toLowerCase().includes(query)) : suggestions).slice(0, MAX_VISIBLE);

  function select(suggestion: string) {
    onChange(suggestion);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      select(filtered[highlightedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 ? (
        <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {filtered.map((suggestion, index) => (
            <li key={suggestion} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${index === highlightedIndex ? "bg-muted" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => select(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
