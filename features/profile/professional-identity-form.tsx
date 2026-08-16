"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { updateProfessionalIdentity } from "@/app/(app)/profile/professional-actions";

const HEADLINE_MAX = 220;
const ABOUT_MAX = 2600;

export function ProfessionalIdentityForm({
  initialHeadline,
  initialAbout,
  initialShowGpa,
}: {
  initialHeadline: string | null;
  initialAbout: string | null;
  initialShowGpa: boolean;
}) {
  const [headline, setHeadline] = useState(initialHeadline ?? "");
  const [about, setAbout] = useState(initialAbout ?? "");
  const [showGpa, setShowGpa] = useState(initialShowGpa);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = headline !== (initialHeadline ?? "") || about !== (initialAbout ?? "") || showGpa !== initialShowGpa;

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

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-gpa"
          checked={showGpa}
          onCheckedChange={(checked) => {
            setShowGpa(checked === true);
            setSaved(false);
          }}
        />
        <Label htmlFor="show-gpa" className="font-normal">
          Show my GPA on my public profile
        </Label>
      </div>
      <p className="pl-6 -mt-3 text-xs text-muted-foreground">Off by default. Your GPA is never shown unless you turn this on.</p>

      <Button
        variant="outline"
        size="sm"
        disabled={isPending || !dirty}
        onClick={() =>
          startTransition(async () => {
            const result = await updateProfessionalIdentity({ headline, about, showGpa });
            if (result.error) setError(result.error);
            else setSaved(true);
          })
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? "Saved" : "Save"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
