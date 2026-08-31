"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SuggestInput } from "@/features/entities/suggest-input";
import { COUNTRY_SUGGESTIONS } from "@/lib/vocabularies/countries";
import { updateCitizenship } from "@/app/(app)/settings/actions";

/** Distinct from LocationForm's `country` (residence/school location) — a student can live
 * and attend school somewhere they aren't a citizen of, and vice versa. Multi-valued: dual/
 * multiple citizenship is common among Oryn's international student base. Never required —
 * "not stated" (empty list) is the honest default, never forced; Counselor Core treats
 * citizenship-restricted opportunities as unknown-eligibility either way, not blocked on
 * this being filled in. */
export function CitizenshipForm({ initialCitizenships }: { initialCitizenships: string[] }) {
  const [citizenships, setCitizenships] = useState<string[]>(initialCitizenships);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = citizenships.length !== initialCitizenships.length || citizenships.some((c, i) => c !== initialCitizenships[i]);

  function addDraft() {
    const trimmed = draft.trim();
    if (!trimmed || citizenships.includes(trimmed)) return;
    setCitizenships((prev) => [...prev, trimmed]);
    setDraft("");
    setSaved(false);
  }

  function remove(country: string) {
    setCitizenships((prev) => prev.filter((c) => c !== country));
    setSaved(false);
  }

  return (
    <div className="space-y-3">
      {citizenships.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {citizenships.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 text-sm">
              {c}
              <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not stated. Oryn will show eligibility for citizenship-restricted opportunities as unverified rather than confirmed either way.
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addDraft();
        }}
      >
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label htmlFor="citizenship-add">Add a citizenship</Label>
          <SuggestInput id="citizenship-add" value={draft} onChange={setDraft} suggestions={COUNTRY_SUGGESTIONS} placeholder="e.g. Turkey" />
        </div>
        <Button type="submit" variant="outline" disabled={!draft.trim()}>
          Add
        </Button>
      </form>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending || !dirty}
        onClick={() =>
          startTransition(async () => {
            const result = await updateCitizenship(citizenships);
            if (result.error) setError(result.error);
            else {
              setError(null);
              setSaved(true);
            }
          })
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? "Saved" : "Save"}
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
