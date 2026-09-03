"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquareText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/app/(app)/feedback/actions";

/**
 * Reachable from anywhere, not buried in settings (the founder's own request: "sitede
 * şikayet veya geri bildirim alacak bir yer olmalı") — same utility-cluster slot as
 * UsageIndicator/NotificationBell, rendered in both Topbar and MobileNav exactly like
 * those two, not a page-specific control. Styling matches NotificationBell's trigger
 * (features/app-shell/notification-bell.tsx): 34px white box, #EEEEF6 border, the rest of
 * this cluster's literal source colors.
 *
 * No name field, no email field (migration 0113's own header — the session already
 * identifies the student) and no category dropdown — one text box, one submit, by design.
 * `path` is the one thing captured automatically rather than asked for.
 */
export function FeedbackButton() {
  const t = useTranslations("feedback");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  // "failed" (a real, possibly transient write failure -- retrying might work) and
  // "not_configured" (migration 0113 hasn't landed -- retrying never will) render two
  // different sentences, per submitFeedback's own SubmitFeedbackResult comment. "empty" is
  // a defensive server-side echo of a state the submit button below already prevents
  // reaching, so it shares "failed"'s copy rather than needing a third string.
  const [status, setStatus] = useState<"idle" | "success" | "failed" | "not_configured">("idle");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Only reset on a successful close -- an error should leave the student's own words in
    // place so a retry doesn't require retyping them.
    if (!next && status === "success") {
      setMessage("");
      setStatus("idle");
    }
  }

  function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      const result = await submitFeedback({ message: trimmed, path: pathname });
      setStatus(result.success ? "success" : result.reason === "not_configured" ? "not_configured" : "failed");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            style={{ background: "white", borderColor: "#EEEEF6" }}
            className="flex size-[34px] items-center justify-center rounded-[9px] border text-[#6A6A7A] transition-colors hover:text-[#111118] focus-visible:outline-none"
          />
        }
        nativeButton={true}
        aria-label={t("triggerLabel")}
      >
        <MessageSquareText className="size-[17px]" strokeWidth={1.6} />
      </DialogTrigger>
      <DialogContent>
        {status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("successTitle")}</DialogTitle>
              {/* Plainly states what happens next, and just as plainly what doesn't --
                  there's no reply mechanism, so this never implies one. */}
              <DialogDescription>{t("successDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>{t("done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>{t("dialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("placeholder")}
                // Mirrors submitFeedback's own MESSAGE_MAX_LENGTH (app/(app)/feedback/actions.ts)
                // -- a client-side courtesy, not the real limit; the server truncates
                // regardless of what a non-browser caller sends.
                maxLength={2000}
                rows={4}
                autoFocus
              />
              {status === "failed" ? (
                <p role="alert" className="text-sm text-destructive">{t("errorFailed")}</p>
              ) : status === "not_configured" ? (
                <p role="alert" className="text-sm text-destructive">{t("errorNotConfigured")}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tCommon("cancel")}
              </Button>
              <Button disabled={!message.trim() || isPending} onClick={handleSubmit}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("submit")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
