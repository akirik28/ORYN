"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, X, UserMinus, MessageCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { respondToConnectionRequest, removeConnection } from "@/app/(app)/connections/actions";
import type { ConnectionWithProfile } from "@/lib/social/connections";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Identity({ connection }: { connection: ConnectionWithProfile }) {
  const t = useTranslations("connections.row");
  const name = connection.otherProfile?.display_name ?? t("defaultName");
  const meta = [connection.otherProfile?.curriculum, connection.otherProfile?.country].filter(Boolean).join(" · ");

  const content = (
    <>
      <Avatar>
        <AvatarFallback className="bg-brand-primary-soft text-brand-primary-strong">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium group-hover:underline">{name}</p>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </>
  );

  // otherProfile is only null for a stale outgoing request whose target has since gone
  // private (public_profiles' pending carve-out is one-directional — see migration 0024 —
  // so a requester never resolves a now-private recipient here). No page to link to in
  // that case, so render a plain row instead of a Link to `/u/` (empty id, would 404).
  if (!connection.otherProfile) {
    return <div className="flex min-w-0 items-center gap-3">{content}</div>;
  }

  return (
    <Link href={`/u/${connection.otherProfile.id}`} className="group flex min-w-0 items-center gap-3">
      {content}
    </Link>
  );
}

export function PendingRequestRow({ connection }: { connection: ConnectionWithProfile }) {
  const t = useTranslations("connections.actions");
  const [isPending, startTransition] = useTransition();

  return (
    // Figma-source card chrome (App.tsx `ConnectionsScreen`'s request card): translucent
    // white, 18px blur. Real AlertDialog-confirmed remove/withdraw logic below is
    // untouched — only this container's colors changed.
    <div
      className="flex items-center justify-between gap-3 rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.48)", backdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.68)" }}
    >
      <Identity connection={connection} />
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await respondToConnectionRequest(connection.id, true);
              if (result.error) toast.error(result.error);
            })
          }
        >
          <Check className="size-3.5" /> {t("accept")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await respondToConnectionRequest(connection.id, false);
              if (result.error) toast.error(result.error);
            })
          }
        >
          <X className="size-3.5" /> {t("decline")}
        </Button>
      </div>
    </div>
  );
}

export function ConnectionRow({ connection, pending = false }: { connection: ConnectionWithProfile; pending?: boolean }) {
  const t = useTranslations("connections.row");
  const tActions = useTranslations("connections.actions");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const label = pending ? t("withdrawRequest") : t("removeConnection");
  const name = connection.otherProfile?.display_name ?? t("thisStudent");

  function confirmRemove() {
    startTransition(async () => {
      const result = await removeConnection(connection.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
    });
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.42)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.65)" }}
    >
      <Identity connection={connection} />
      <div className="flex shrink-0 items-center gap-2">
        {pending ? <span className="text-xs text-muted-foreground">{tActions("requested")}</span> : null}
        {!pending && connection.status === "accepted" ? (
          <Button size="sm" variant="outline" render={<Link href={`/messages/${connection.otherProfile?.id ?? ""}`} />} nativeButton={false}>
            <MessageCircle className="size-3.5" /> {tActions("message")}
          </Button>
        ) : null}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          onClick={() => setConfirmOpen(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <UserMinus className="size-3.5" />
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? t("withdrawConfirmDescription", { name }) : t("removeConfirmDescription", { name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>{tCommon("cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmRemove} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
