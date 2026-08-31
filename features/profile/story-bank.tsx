"use client";

import { useState, useTransition } from "react";
import { Sparkles, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/oryn/empty-state";
import { cn } from "@/lib/utils";
import { generateStoryOutlines } from "@/app/(app)/profile/story-bank/actions";
import type { EssayOutlineResponse } from "@/lib/ai/essay-outlines";
import type { StoryBankItem } from "@/lib/story-bank/collect";

const OUTLINE_STEPS = [
  { key: "hook", label: "Hook" },
  { key: "context", label: "Context" },
  { key: "conflict", label: "Conflict" },
  { key: "action", label: "Action" },
  { key: "turningPoint", label: "Turning point" },
  { key: "reflection", label: "Reflection" },
  { key: "connectionToFuture", label: "Connection to future" },
] as const;

const GLOWS = ["glass-card", "glass-card-offset", "glass-card-fast", "glass-card-offset2"];

export function StoryBank({ experiences }: { experiences: StoryBankItem[] }) {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<EssayOutlineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const withNotes = experiences.filter((e) => e.storyNotes).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await generateStoryOutlines(prompt, [...selected]);
      if (res.error) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res.data ?? null);
    });
  }

  if (experiences.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="Add experiences to your profile first"
        description="Add activities, projects, research, sports, volunteering, or work to your profile first — your essay stories come from things you've actually done, never from something invented for you."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="glass-card rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl">
        <label htmlFor="essay-prompt" className="text-sm font-medium">
          The essay prompt you&apos;re answering
        </label>
        <Textarea
          id="essay-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste the exact prompt, e.g. &quot;Discuss an accomplishment, event, or realization that sparked a period of personal growth.&quot;"
          rows={3}
          className="mt-2"
          maxLength={1000}
        />

        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium">
            Experiences to consider{" "}
            <span className="font-normal text-muted-foreground">
              ({selected.size > 0 ? `${selected.size} selected` : "all"} — {withNotes} of {experiences.length} have
              story notes)
            </span>
          </p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-white/55 bg-white/35 p-3">
            {experiences.map((e) => (
              <label key={e.id} className="flex items-start gap-2 text-sm">
                <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="font-medium">{e.title}</span>{" "}
                  <span className="text-muted-foreground">· {e.category}</span>
                  {e.storyNotes ? (
                    <NotebookPen className="ml-1 inline size-3 text-brand-primary" aria-label="has story notes" />
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Leave everything unchecked to consider all of them. Entries with story notes give far better
            results — add yours from the Profile page.
          </p>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <Button onClick={submit} disabled={isPending || !prompt.trim()} className="mt-4">
          <Sparkles className="size-4" /> {isPending ? "Finding your stories…" : "Find my stories"}
        </Button>
      </div>

      {result ? (
        <div className="space-y-6">
          {result.notEnoughMaterial ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">{result.notEnoughMaterial}</div>
          ) : null}

          {result.candidates.map((candidate, ci) => (
            <section key={ci} className={cn("space-y-4 rounded-2xl border border-white/65 bg-white/45 p-5 backdrop-blur-2xl", GLOWS[ci % GLOWS.length])}>
              <div>
                <h2 className="text-lg font-medium">{candidate.experienceTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{candidate.whyThisStory}</p>
                {candidate.missingDetail ? (
                  <p className="mt-2 text-sm text-brand-primary">Worth adding to your story notes: {candidate.missingDetail}</p>
                ) : null}
              </div>

              <div className="space-y-4">
                {candidate.outlines.map((outline, oi) => (
                  <div key={oi} className="rounded-xl border p-4">
                    <Badge variant="outline" className="mb-3">
                      Angle {oi + 1}: {outline.angle}
                    </Badge>
                    <dl className="space-y-2">
                      {OUTLINE_STEPS.map(({ key, label }) => (
                        <div key={key} className="grid gap-0.5 sm:grid-cols-[140px_1fr] sm:gap-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                          <dd className="text-sm">{outline[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-center text-xs text-muted-foreground">
            These are structures for your own writing, not a draft. Oryn never writes the essay for you — and
            never adds a detail you didn&apos;t record yourself.
          </p>
        </div>
      ) : null}
    </div>
  );
}
