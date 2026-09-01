"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addFeaturedItem, removeFeaturedItem, reorderFeaturedItems } from "@/app/(app)/profile/featured-actions";
import type { FeaturedItemType } from "@/types/database";

export interface FeaturedManagerItem {
  id: string;
  itemType: FeaturedItemType;
  title: string;
  organization: string | null;
  url: string | null;
}

interface CandidateItem {
  id: string;
  label: string;
}

const MAX_FEATURED = 5;

export function FeaturedManager({
  initialItems,
  candidates,
}: {
  initialItems: FeaturedManagerItem[];
  candidates: Record<Exclude<FeaturedItemType, "external_link">, CandidateItem[]>;
}) {
  const t = useTranslations("common");
  const tFeatured = useTranslations("profile.featuredManager");
  const SOURCE_TYPE_OPTIONS: { value: Exclude<FeaturedItemType, "external_link">; label: string }[] = [
    { value: "project", label: tFeatured("sourceTypes.project") },
    { value: "research_experience", label: tFeatured("sourceTypes.research") },
    { value: "award", label: tFeatured("sourceTypes.award") },
    { value: "activity", label: tFeatured("sourceTypes.activity") },
    { value: "work_experience", label: tFeatured("sourceTypes.workExperience") },
    { value: "volunteering_experience", label: tFeatured("sourceTypes.volunteering") },
    { value: "sports_experience", label: tFeatured("sourceTypes.sports") },
  ];
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FeaturedItemType>("project");
  const [selectedId, setSelectedId] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() {
    setMode("project");
    setSelectedId("");
    setLinkTitle("");
    setLinkUrl("");
    setError(null);
    setOpen(true);
  }

  function submitAdd() {
    startTransition(async () => {
      const result =
        mode === "external_link"
          ? await addFeaturedItem("external_link", null, linkTitle, linkUrl)
          : await addFeaturedItem(mode, selectedId || null, null, null);
      if (result.error || !result.id) {
        setError(result.error ?? tFeatured("genericError"));
        return;
      }
      setOpen(false);
      // Optimistic append using the row's REAL id (not crypto.randomUUID()) — a locally
      // generated id matched nothing in the database, so removing or reordering this exact
      // item before the next full page load (which replaces this optimistic state with
      // server-truthed `initialItems`) sent Server Actions an id that owned no row: a
      // silent no-op delete that left the real row behind, or a reorder rejected outright.
      // The server revalidation on next navigation is still the ultimate source of truth
      // for everything else about this row; this only fixes the id itself.
      if (mode === "external_link") {
        setItems((prev) => [...prev, { id: result.id!, itemType: "external_link", title: linkTitle || linkUrl, organization: null, url: linkUrl }]);
      } else {
        const candidate = candidates[mode].find((c) => c.id === selectedId);
        if (candidate) setItems((prev) => [...prev, { id: result.id!, itemType: mode, title: candidate.label, organization: null, url: null }]);
      }
    });
  }

  function remove(id: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await removeFeaturedItem(id);
      if (result.error) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const previous = items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    startTransition(async () => {
      const result = await reorderFeaturedItems(next.map((i) => i.id));
      if (result.error) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.organization ? <p className="truncate text-xs text-muted-foreground">{item.organization}</p> : null}
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline">
                    <ExternalLink className="size-3" /> {item.url}
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button variant="ghost" size="icon-xs" disabled={isPending || index === 0} onClick={() => move(index, -1)} aria-label={tFeatured("moveUp")}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" disabled={isPending || index === items.length - 1} onClick={() => move(index, 1)} aria-label={tFeatured("moveDown")}>
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" disabled={isPending} onClick={() => remove(item.id)} aria-label={tFeatured("remove")}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{tFeatured("emptyState")}</p>
      )}

      {items.length < MAX_FEATURED ? (
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="size-4" /> {tFeatured("featureSomething")}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{tFeatured("maxFeatured", { max: MAX_FEATURED })}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tFeatured("featureSomething")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={mode}
              onValueChange={(v) => {
                if (!v) return;
                setMode(v as FeaturedItemType);
                setSelectedId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value="external_link">{tFeatured("externalLink")}</SelectItem>
              </SelectContent>
            </Select>

            {mode === "external_link" ? (
              <div className="space-y-2">
                <Input placeholder={tFeatured("titleOptional")} value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
                <Input placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
            ) : candidates[mode].length > 0 ? (
              <Select value={selectedId} onValueChange={(v) => v && setSelectedId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tFeatured("chooseAnItem")} />
                </SelectTrigger>
                <SelectContent>
                  {candidates[mode].map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">{tFeatured("noneYet")}</p>
            )}

            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={submitAdd} disabled={isPending || (mode === "external_link" ? !linkUrl.trim() : !selectedId)}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : tFeatured("featureIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
