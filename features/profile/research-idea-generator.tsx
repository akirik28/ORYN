"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generateResearchIdeas, saveResearchIdea } from "@/app/(app)/profile/actions";
import type { ResearchProject } from "@/lib/ai/research-generator";

export function ResearchIdeaGenerator() {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("");
  const [projects, setProjects] = useState<ResearchProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [isGenerating, startGenerating] = useTransition();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();
  const router = useRouter();

  function generate() {
    setError(null);
    startGenerating(async () => {
      const result = await generateResearchIdeas(field);
      if (result.error) {
        setError(result.error);
        return;
      }
      setProjects(result.data ?? []);
      setSavedIndexes(new Set());
    });
  }

  function save(index: number, project: ResearchProject) {
    setSavingIndex(index);
    startSaving(async () => {
      const result = await saveResearchIdea(project, field);
      if (!result.error) {
        setSavedIndexes((prev) => new Set(prev).add(index));
        router.refresh();
      }
      setSavingIndex(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles className="size-4 text-primary" /> Generate research ideas
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Research project ideas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="research-field">Field</Label>
              <Input id="research-field" value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Economics, Computer Science, Psychology" />
            </div>
            <Button onClick={generate} disabled={isGenerating || !field.trim()}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project, index) => (
                <div key={project.researchQuestion} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium leading-snug">{project.researchQuestion}</h3>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {project.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.whyItFits}</p>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-foreground">Duration:</span> {project.estimatedDuration}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Output:</span> {project.expectedOutput}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">First steps:</p>
                    <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {project.firstSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSaving || savedIndexes.has(index)}
                    onClick={() => save(index, project)}
                  >
                    {isSaving && savingIndex === index ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : savedIndexes.has(index) ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    {savedIndexes.has(index) ? "Added" : "Add to my research"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
