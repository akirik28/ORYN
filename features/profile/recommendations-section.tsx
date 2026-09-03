"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Eye, EyeOff, Flag, Loader2, Plus, Quote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/proxola/empty-state";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { SectionHeader } from "@/components/proxola/section-header";
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
  const t = useTranslations("common");
  const tRec = useTranslations("profile.recommendations");
  // Found bare (no locale) during 2026-09-03's Turkish pass — same class of bug as
  // features/admin/sections/user-list-section.tsx, found there first via oryn-a7's live
  // /kumanda walkthrough, then swept for elsewhere per their own instruction.
  const locale = useLocale();
  const dateFnsLocale = locale === "tr" ? { locale: trLocale } : undefined;
  const RELATIONSHIP_OPTIONS: { value: RecommendationRelationship; label: string }[] = [
    { value: "teacher", label: tRec("relationships.teacher") },
    { value: "mentor", label: tRec("relationships.mentor") },
    { value: "teammate", label: tRec("relationships.teammate") },
    { value: "project_collaborator", label: tRec("relationships.projectCollaborator") },
    { value: "colleague", label: tRec("relationships.colleague") },
    { value: "other", label: tRec("relationships.other") },
  ];
  const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS.map((o) => [o.value, o.label])) as Record<RecommendationRelationship, string>;

  const [writeOpen, setWriteOpen] = useState(false);
  const [relationship, setRelationship] =
    useState<RecommendationRelationship>("mentor");
  const [body, setBody] = useState("");
  const [writeError, setWriteError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<RecommendationItem | null>(
    null,
  );
  const [reportReason, setReportReason] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<RecommendationItem | null>(null);

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
      const result = await reportRecommendation(
        reportTarget.id,
        reportTarget.authorId,
        reportReason,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setReportTarget(null);
      setReportReason("");
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteRecommendation(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        title={tRec("title")}
        action={
          canWrite ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWriteOpen(true)}
            >
              <Plus className="size-4" /> {tRec("write")}
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
                    {item.authorName ?? tRec("anonymousAuthor")}
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
                      ...dateFnsLocale,
                    })}
                  </span>
                  {item.status === "hidden" ? (
                    <span className="italic">{tRec("hidden")}</span>
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
                    {item.status === "hidden" ? t("show") : t("hide")}
                  </Button>
                ) : null}
                {item.authorId === viewerId ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="size-3" /> {t("delete")}
                  </Button>
                ) : null}
                {!isSelf && item.authorId !== viewerId ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setReportTarget(item)}
                  >
                    <Flag className="size-3" /> {tRec("report")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Quote} title={tRec("noneYet")} className="py-6" />
      )}

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tRec("write")}</DialogTitle>
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
              placeholder={tRec("writePlaceholder")}
            />
            {writeError ? (
              <p className="text-sm text-destructive">{writeError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={submitWrite} disabled={isPending || !body.trim()}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("submit")
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
            <DialogTitle>{tRec("reportDialogTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={tRec("reportPlaceholder")}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={submitReport}
              disabled={isPending || !reportReason.trim()}
            >
              {tRec("reportSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tRec("deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tRec("deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{t("cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
