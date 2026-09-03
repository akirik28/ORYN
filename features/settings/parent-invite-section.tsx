"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setParentInviteEmailAction,
  confirmParentLinkAction,
  revokeParentLinkAction,
} from "@/app/(app)/settings/parent-actions";
import type { ParentLinkWithComputedStatus } from "@/lib/parent/links";

export interface GeneratedInvitePreview {
  acceptUrl: string;
  subject: string;
  body: string;
  expiresInDays: number;
}

export interface ParentInviteSectionProps {
  initialParentEmail: string | null;
  links: ParentLinkWithComputedStatus[];
  /** Computed server-side (features/settings/settings-view.tsx) only when there's an email
   * on file and nothing currently active/validly-pending is already using it — see that
   * file's own comment for the exact rule. Null otherwise, including whenever sending is
   * moot because a real link already covers the current email. */
  generatedInvite: GeneratedInvitePreview | null;
}

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §K3) — the student's own view of the parent-invite
 * relationship. Three states this component must keep visually distinct, per CEO's own
 * explicit ask for this task: nothing yet, pending (a parent has NOT been confirmed — see
 * §K3, nothing is visible to them), and active (confirmed, they can see read-only data).
 * Revoked links are not rendered — dead history a student would gain nothing from seeing in
 * their own Settings.
 */
export function ParentInviteSection({ initialParentEmail, links, generatedInvite }: ParentInviteSectionProps) {
  const t = useTranslations("parentInvite");
  const [email, setEmail] = useState(initialParentEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);

  const visibleLinks = links.filter((link) => link.status !== "revoked");
  const trimmedEmail = email.trim();
  const unchanged = trimmedEmail === (initialParentEmail ?? "");

  function handleSaveEmail() {
    setError(null);
    startTransition(async () => {
      const result = await setParentInviteEmailAction(trimmedEmail);
      if (result.error) setError(result.error);
    });
  }

  function handleConfirm(linkId: string) {
    setBusyLinkId(linkId);
    startTransition(async () => {
      const result = await confirmParentLinkAction(linkId);
      if (result.error) setError(result.error);
      setBusyLinkId(null);
    });
  }

  function handleRevoke(linkId: string) {
    setBusyLinkId(linkId);
    startTransition(async () => {
      const result = await revokeParentLinkAction(linkId);
      if (result.error) setError(result.error);
      setBusyLinkId(null);
    });
  }

  async function handleCopy() {
    if (!generatedInvite) return;
    try {
      await navigator.clipboard.writeText(generatedInvite.acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, non-secure context) — the link is still
      // right there in the DOM for the student to select and copy by hand.
    }
  }

  return (
    <div className="space-y-4">
      {visibleLinks.map((link) => {
        const busy = busyLinkId === link.id && isPending;
        if (link.status === "active") {
          return (
            <div key={link.id} className="space-y-2 rounded-xl bg-surface-tint px-4 py-3">
              <p className="text-sm font-medium text-ink-1">{t("activeTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("activeDescription", { parentEmail: link.invited_email ?? "" })}
              </p>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => handleRevoke(link.id)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("revokeButton")}
              </Button>
            </div>
          );
        }
        if (link.status === "pending" && link.isExpired) {
          return (
            <div key={link.id} className="space-y-1.5 rounded-xl bg-surface-tint px-4 py-3">
              <p className="text-sm text-muted-foreground">{t("expiredNotice")}</p>
            </div>
          );
        }
        // pending, not expired
        return (
          <div key={link.id} className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
            <p className="text-sm font-medium text-ink-1">{t("pendingConfirmationTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("pendingConfirmationDescription", { parentEmail: link.invited_email ?? "" })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => handleConfirm(link.id)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("confirmButton")}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => handleRevoke(link.id)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("declineButton")}
              </Button>
            </div>
          </div>
        );
      })}

      {generatedInvite ? (
        <div className="space-y-2 rounded-xl bg-surface-tint px-4 py-3">
          <p className="text-sm font-medium text-ink-1">{t("linkReadyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("sendingDisabledNotice")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 text-xs">
              {generatedInvite.acceptUrl}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t("linkCopied") : t("copyLink")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("expiresIn", { days: generatedInvite.expiresInDays })}</p>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">{t("emailPreviewTitle")}</summary>
            <p className="mt-1 font-medium text-ink-1">{generatedInvite.subject}</p>
            <p className="mt-1 whitespace-pre-line">{generatedInvite.body}</p>
          </details>
        </div>
      ) : null}

      {visibleLinks.length === 0 && !generatedInvite ? (
        <p className="text-sm text-muted-foreground">{t("noInviteYet")}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="settings-parent-email">{t("emailLabel")}</Label>
          <Input
            id="settings-parent-email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />
        </div>
        <Button variant="outline" disabled={isPending || unchanged} onClick={handleSaveEmail}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : t("generateButton")}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
