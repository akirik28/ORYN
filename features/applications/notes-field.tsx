"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * Phase 22 names notes as a tracked field alongside status/deadline/requirements; both
 * `applications.notes` and `application_requirements.notes` existed in the schema with no
 * UI ever touching them (2026-09-02 application-detail-page audit). One component for both
 * — same save/dirty/error shape either way, only the placeholder and the action passed in
 * differ.
 *
 * Save button only appears once the text actually differs from the last-saved value, per
 * Phase 22's own "do not make the UI overly complex" warning — no autosave-on-every-
 * keystroke wiring, no debounce timer, just an explicit action a student can see and trust.
 * On success `savedValue` resets to the new text so the button disappears again; on failure
 * the text a student typed is left exactly as they left it (never rolled back) — a lost
 * network call shouldn't cost them what they wrote, only the toast says try saving again.
 */
export function NotesField({
  initialValue,
  placeholder,
  saveLabel,
  savedLabel,
  errorFallback,
  onSave,
}: {
  initialValue: string | null;
  placeholder: string;
  saveLabel: string;
  savedLabel: string;
  errorFallback: string;
  onSave: (notes: string) => Promise<{ error?: string }>;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [savedValue, setSavedValue] = useState(initialValue ?? "");
  const [isPending, startTransition] = useTransition();
  const dirty = value !== savedValue;

  function save() {
    startTransition(async () => {
      const result = await onSave(value);
      if (result.error) {
        toast.error(result.error || errorFallback);
        return;
      }
      setSavedValue(value);
      toast.success(savedLabel);
    });
  }

  return (
    <div className="space-y-1.5">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} disabled={isPending} rows={2} />
      {dirty ? (
        <Button size="sm" variant="outline" onClick={save} disabled={isPending}>
          {saveLabel}
        </Button>
      ) : null}
    </div>
  );
}
