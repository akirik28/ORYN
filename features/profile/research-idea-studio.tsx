"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Plus, Check, FlaskConical, Database, ListChecks, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generateResearchIdeas, saveResearchIdea } from "@/app/(app)/profile/actions";
import type { ResearchProject } from "@/lib/ai/research-generator";

const SUGGESTED_FIELDS = [
  "Economics",
  "Computer Science",
  "Psychology",
  "Biology",
  "Political Science",
  "Environmental Science",
];

// Difficulty is the one field that should read at a glance — it is the signal a student
// uses to decide whether an idea is actually within reach this term. Colour-coded rather
// than a uniform outline badge, which is what the dialog version had to settle for.
const DIFFICULTY_TONE: Record<ResearchProject["difficulty"], string> = {
  accessible: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  moderate: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  ambitious: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

/**
 * The full-page counterpart to ResearchIdeaGenerator's dialog.
 *
 * The dialog is a quick in-context action inside the Journey page's Research section and
 * shows a deliberately trimmed subset. This surface exists because "Research idea
 * generator" is its own entry in Features and deserves its own destination, so it renders
 * everything the model actually returns — method, required skills and data sources
 * included. Those three are the fields that decide whether a project is genuinely doable,
 * and hiding them was what made the dialog feel like a teaser.
 *
 * Both call the same server actions; neither fabricates a project the other wouldn't.
 */
export function ResearchIdeaStudio() {
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
    <div className="space-y-8">
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="research-field">What field do you want to work in?</Label>
            <Input
              id="research-field"
              value={field}
              onChange={(e) => setField(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && field.trim() && !isGenerating) generate();
              }}
              placeholder="e.g. Economics, Computer Science, Psychology"
            />
          </div>
          <Button onClick={generate} disabled={isGenerating || !field.trim()} size="lg">
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {isGenerating ? "Thinking" : "Generate ideas"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {SUGGESTED_FIELDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setField(s)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:border-white/25 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </div>

      {isGenerating ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      ) : null}

      {!isGenerating && projects === null ? (
        <div className="rounded-2xl border border-dashed border-white/12 px-6 py-14 text-center">
          <FlaskConical className="mx-auto size-7 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg">No ideas generated yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Name a field and Oryn will propose three projects scaled to your level — each one something you could
            realistically finish, with real data sources rather than an impressive-sounding title.
          </p>
        </div>
      ) : null}

      {!isGenerating && projects && projects.length > 0 ? (
        <div className="space-y-5">
          {projects.map((project, index) => (
            <article key={project.researchQuestion} className="glass-card space-y-5 rounded-2xl border border-white/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-lg leading-snug tracking-tight">{project.researchQuestion}</h2>
                <Badge variant="outline" className={cn("shrink-0 capitalize", DIFFICULTY_TONE[project.difficulty])}>
                  {project.difficulty}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{project.whyItFits}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Fact icon={Clock} label="Time needed" value={project.estimatedDuration} />
                <Fact icon={Target} label="Finished project looks like" value={project.expectedOutput} />
              </div>

              <Block icon={ListChecks} title="Method">
                <p className="text-sm text-muted-foreground">{project.method}</p>
              </Block>

              {project.requiredSkills.length > 0 ? (
                <Block icon={ListChecks} title="Skills you'll need">
                  <div className="flex flex-wrap gap-1.5">
                    {project.requiredSkills.map((s) => (
                      <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </Block>
              ) : null}

              {project.dataSources.length > 0 ? (
                <Block icon={Database} title="Where the data comes from">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {project.dataSources.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden="true" className="text-white/25">—</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </Block>
              ) : null}

              <Block icon={ListChecks} title="Your first steps">
                <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                  {project.firstSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </Block>

              <Button
                variant="outline"
                disabled={isSaving || savedIndexes.has(index)}
                onClick={() => save(index, project)}
              >
                {isSaving && savingIndex === index ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : savedIndexes.has(index) ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {savedIndexes.has(index) ? "Added to your research" : "Add to my research"}
              </Button>
            </article>
          ))}
        </div>
      ) : null}

      {!isGenerating && projects && projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Oryn couldn&apos;t put together a project for that field. Try naming it a little differently.
        </p>
      ) : null}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}
