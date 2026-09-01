"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateVisibility } from "@/app/(app)/settings/actions";

export function VisibilityForm({
  userId,
  initialIsPublic,
  initialLookingFor,
}: {
  userId: string;
  initialIsPublic: boolean;
  initialLookingFor: string | null;
}) {
  const t = useTranslations("common");
  const tVisibility = useTranslations("settings.visibility");
  const LOOKING_FOR_PRESETS = [
    tVisibility("lookingForPresets.researchCollaborators"),
    tVisibility("lookingForPresets.internshipNextSummer"),
    tVisibility("lookingForPresets.competitionTeammates"),
    tVisibility("lookingForPresets.startupCoFounders"),
    tVisibility("lookingForPresets.mentorship"),
  ];
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [lookingFor, setLookingFor] = useState(initialLookingFor ?? "");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/u/${userId}` : `/u/${userId}`;
  const dirty = isPublic !== initialIsPublic || lookingFor !== (initialLookingFor ?? "");

  function save() {
    startTransition(async () => {
      const result = await updateVisibility(isPublic, lookingFor || null);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{tVisibility("publicProfileTitle")}</p>
          <p className="text-sm text-muted-foreground">{tVisibility("publicProfileDescription")}</p>
        </div>
        <Button
          variant={isPublic ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setIsPublic((v) => !v);
            setSaved(false);
          }}
        >
          {isPublic ? tVisibility("on") : tVisibility("off")}
        </Button>
      </div>

      {isPublic ? (
        <div className="space-y-3 pl-1">
          <div className="space-y-1.5">
            <Label htmlFor="looking-for">{tVisibility("lookingForLabel")}</Label>
            <Input
              id="looking-for"
              value={lookingFor}
              placeholder={tVisibility("lookingForPlaceholder")}
              onChange={(e) => {
                setLookingFor(e.target.value);
                setSaved(false);
              }}
              list="looking-for-presets"
            />
            <datalist id="looking-for-presets">
              {LOOKING_FOR_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{shareUrl}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? tVisibility("copied") : tVisibility("copyLink")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{tVisibility("visibleToStudents")}</p>
        </div>
      ) : null}

      <Button variant="outline" size="sm" disabled={isPending || !dirty} onClick={save}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? tVisibility("saved") : t("save")}
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
