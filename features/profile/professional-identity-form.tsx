"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProfessionalIdentity } from "@/app/(app)/profile/professional-actions";

const HEADLINE_MAX = 220;
const ABOUT_MAX = 2600;

/**
 * `show_gpa` (migration 0033) is deliberately NOT exposed as a control here. It promises
 * "show my GPA on my public profile", but the public profile has no education section at
 * all to show it in: `getPublicPortfolio` drops the `education` category, and
 * `school_name` is on the forbidden-column list for `public_profiles` — both deliberate
 * minor-safety decisions recorded in docs/product-decisions.md ("a public GPA/school-name
 * toggle feels like a materially bigger disclosure... worth a deliberate look"). A
 * checkbox that silently does nothing is a worse defect than a missing one, so the
 * control is withheld until that founder decision lands (see
 * docs/founder-blocked-backlog.md). The column, the Server Action path, and any value a
 * student has already stored are all left untouched.
 */
export function ProfessionalIdentityForm({
  initialHeadline,
  initialAbout,
}: {
  initialHeadline: string | null;
  initialAbout: string | null;
}) {
  const [headline, setHeadline] = useState(initialHeadline ?? "");
  const [about, setAbout] = useState(initialAbout ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = headline !== (initialHeadline ?? "") || about !== (initialAbout ?? "");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={headline}
          maxLength={HEADLINE_MAX}
          placeholder="e.g. Aspiring Economist · Grade 11"
          onChange={(e) => {
            setHeadline(e.target.value);
            setSaved(false);
          }}
        />
        <p className="text-xs text-muted-foreground">{headline.length}/{HEADLINE_MAX}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="about">About</Label>
        <Textarea
          id="about"
          value={about}
          maxLength={ABOUT_MAX}
          rows={5}
          placeholder="A short summary of who you are and what you're working toward."
          onChange={(e) => {
            setAbout(e.target.value);
            setSaved(false);
          }}
        />
        <p className="text-xs text-muted-foreground">{about.length}/{ABOUT_MAX}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={isPending || !dirty}
        onClick={() =>
          startTransition(async () => {
            const result = await updateProfessionalIdentity({ headline, about });
            if (result.error) setError(result.error);
            else setSaved(true);
          })
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? "Saved" : "Save"}
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
