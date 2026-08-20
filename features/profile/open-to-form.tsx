"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOpenTo } from "@/app/(app)/profile/professional-actions";
import { OPEN_TO_OPTIONS, OPEN_TO_LABELS } from "@/lib/social/open-to";
import type { ContactVisibility } from "@/types/database";

const VISIBILITY_OPTIONS: { value: ContactVisibility; label: string }[] = [
  { value: "private", label: "Only me" },
  { value: "connections", label: "Connections" },
  { value: "public", label: "Anyone" },
];

/** Multi-select from a fixed vocabulary (lib/social/open-to.ts) — a real Digital Twin
 * signal for opportunity matching per the product spec, but never proof of eligibility
 * on its own, so this stays plain toggle chips rather than anything that reads as a
 * verified claim. */
export function OpenToForm({
  initialSelected,
  initialVisibility,
}: {
  initialSelected: string[];
  initialVisibility: ContactVisibility;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [visibility, setVisibility] = useState<ContactVisibility>(initialVisibility);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    visibility !== initialVisibility ||
    selected.length !== initialSelected.length ||
    selected.some((v) => !initialSelected.includes(v));

  function toggle(option: string) {
    setSelected((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]));
    setSaved(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {OPEN_TO_OPTIONS.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={
                active
                  ? "rounded-full border border-brand-primary bg-brand-primary-subtle px-3 py-1 text-sm font-medium text-brand-primary-strong outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
                  : "rounded-full border border-input px-3 py-1 text-sm text-muted-foreground outline-none transition-colors hover:border-brand-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              }
            >
              {OPEN_TO_LABELS[option]}
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="open-to-visibility">Who can see this</Label>
          <Select
            value={visibility}
            onValueChange={(v) => {
              if (!v) return;
              setVisibility(v as ContactVisibility);
              setSaved(false);
            }}
          >
            <SelectTrigger id="open-to-visibility" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || !dirty}
          onClick={() =>
            startTransition(async () => {
              const result = await updateOpenTo(selected, visibility);
              if (result.error) setError(result.error);
              else setSaved(true);
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? "Saved" : "Save"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
