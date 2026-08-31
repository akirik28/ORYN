"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addUniversityRequirement, suggestRequirementRule } from "@/app/(app)/universities/[id]/requirement-actions";
import { REQUIREMENT_CATEGORIES, REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import type { RequirementCategory } from "@/types/database";

/**
 * Admin-only tool (rendered only when the viewer's profile.is_admin is true — see the
 * parent page) for adding a sourced, structured requirement row. Deliberately plain rather
 * than polished — Chat 2 owns visual design; this exists so the Phase 69 checklist has a
 * real way to get data into it instead of shipping schema with no usable entry point.
 */
export function AdminRequirementForm({ universityId, programs }: { universityId: string; programs: { id: string; name: string }[] }) {
  const [programId, setProgramId] = useState<string>("__none__");
  const [category, setCategory] = useState<RequirementCategory>("required_subject");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [sourceUrl, setSourceUrl] = useState("");
  const [ruleJson, setRuleJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();

  function reset() {
    setTitle("");
    setDetail("");
    setSourceUrl("");
    setRuleJson("");
    setIsRequired(true);
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">Admin: add a requirement</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Program</Label>
          <Select value={programId} onValueChange={(value) => value && setProgramId(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">University-wide (all programs)</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as RequirementCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUIREMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {REQUIREMENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mathematics through Calculus" />
      </div>

      <div className="space-y-1.5">
        <Label>Sourced requirement text</Label>
        <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} placeholder="Paste the exact wording from the official source." />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="is-required" checked={isRequired} onCheckedChange={(c) => setIsRequired(c === true)} />
        <Label htmlFor="is-required" className="font-normal">
          Required (not just recommended)
        </Label>
      </div>

      <div className="space-y-1.5">
        <Label>Source URL</Label>
        <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Structured rule (JSON, optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSuggesting}
            onClick={() =>
              startSuggesting(async () => {
                setError(null);
                const result = await suggestRequirementRule({ category, title, requirementDetail: detail });
                if (result.error) setError(result.error);
                else if (result.ruleJson) setRuleJson(result.ruleJson);
              })
            }
          >
            {isSuggesting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Suggest with AI
          </Button>
        </div>
        <Textarea
          value={ruleJson}
          onChange={(e) => setRuleJson(e.target.value)}
          rows={5}
          className="font-mono text-xs"
          placeholder='Leave blank for categories like essay/interview. Otherwise e.g. {"kind": "minimum_grade", "minGpa": 3.5, "scale": 4}'
        />
        <p className="text-xs text-muted-foreground">
          AI only structures text you already pasted above — review before saving, it never invents the requirement itself.
        </p>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {status ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{status}</p> : null}

      <Button
        disabled={isPending || !title || !sourceUrl}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setStatus(null);
            const result = await addUniversityRequirement({
              universityId,
              programId: programId === "__none__" ? null : programId,
              requirementType: category,
              title,
              requirementDetail: detail || null,
              isRequired,
              sourceUrl,
              structuredRuleJson: ruleJson || null,
            });
            if (result.error) setError(result.error);
            else {
              setStatus("Requirement added.");
              reset();
            }
          })
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : "Add requirement"}
      </Button>
    </div>
  );
}
