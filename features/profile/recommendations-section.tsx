"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, EyeOff, Flag, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SectionHeader } from "@/components/oryn/section-header";
import {
  writeRecommendation,
  setRecommendationVisibility,
  deleteRecommendation,
  reportRecommendation,
} from "@/app/(app)/u/[id]/recommendation-actions";
import type { RecommendationRelationship } from "@/types/database";

interface RecommendationItem {
  id: string;
  authorId: string;
  authorName: string | null;
  relationship: RecommendationRelationship;
  body: string;
  status: "visible" | "hidden";
  createdAt: string;
}

const RELATIONSHIP_OPTIONS: {
  value: RecommendationRelationship;
  label: string;
}[] = [
  { value: "teacher", label: "Teacher" },
  { value: "mentor", label: "Mentor" },
  { value: "teammate", label: "Teammate" },
  { value: "project_collaborator", label: "Project collaborator" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
];
const RELATIONSHIP_LABELS = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((o) => [o.value, o.label]),
) as Record<RecommendationRelationship, string>;

export function RecommendationsSection({
  recipientId,
  items,
  viewerId,
  isSelf,
  canWrite,
}: {
  recipientId: string;
  items: RecommendationItem[];
  viewerId: string;
  isSelf: boolean;
  canWrite: boolean;
}) {
  const [writeOpen, setWriteOpen] = useState(false);
  const [relationship, setRelationship] =
    useState<RecommendationRelationship>("mentor");
  const [body, setBody] = useState("");
  const [writeError, setWriteError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<RecommendationItem | null>(
    null,
  );
  const [reportReason, setReportReason] = useState("");

  const [isPending, startTransition] = useTransition();

  if (items.length === 0 && !canWrite) return null;

  function submitWrite() {
    setWriteError(null);
    startTransition(async () => {
      const result = await writeRecommendation(recipientId, relationship, body);
      if (result.error) {
        setWriteError(result.error);
        return;
      }
      setBody("");
      setWriteOpen(false);
    });
  }

  function submitReport() {
    if (!reportTarget || !reportReason.trim()) return;
    startTransition(async () => {
      await reportRecommendation(
        reportTarget.id,
        reportTarget.authorId,
        reportReason,
      );
      setReportTarget(null);
      setReportReason("");
    });
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Recommendations"
        action={
          canWrite ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWriteOpen(true)}
            >
              <Plus className="size-4" /> Write a recommendation
            </Button>
          ) : undefined
        }
      />

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 rounded-lg border px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">
                    {item.authorName ?? "An Oryn student"}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {RELATIONSHIP_LABELS[item.relationship]}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {item.status === "hidden" ? (
                    <span className="italic">Hidden</span>
                  ) : null}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {item.body}
              </p>
              <div className="flex items-center gap-1">
                {isSelf ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await setRecommendationVisibility(
                          item.id,
                          item.status === "hidden",
                        );
                      })
                    }
                  >
                    {item.status === "hidden" ? (
                      <Eye className="size-3" />
                    ) : (
                      <EyeOff className="size-3" />
                    )}
                    {item.status === "hidden" ? "Show" : "Hide"}
                  </Button>
                ) : null}
                {item.authorId === viewerId ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteRecommendation(item.id);
                      })
                    }
                  >
                    <Trash2 className="size-3" /> Delete
                  </Button>
                ) : null}
                {!isSelf && item.authorId !== viewerId ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setReportTarget(item)}
                  >
                    <Flag className="size-3" /> Report
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No recommendations yet.</p>
      )}

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={relationship}
              onValueChange={(v) =>
                v && setRelationship(v as RecommendationRelationship)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={6}
              value={body}
              maxLength={3000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What would you tell someone about working with them?"
            />
            {writeError ? (
              <p className="text-sm text-destructive">{writeError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitWrite} disabled={isPending || !body.trim()}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportTarget !== null}
        onOpenChange={(open) => !open && setReportTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this recommendation</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="What's wrong with this?"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitReport}
              disabled={isPending || !reportReason.trim()}
            >
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
