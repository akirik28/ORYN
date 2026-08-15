"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, X, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  const name = connection.otherProfile?.display_name ?? "A student";
  const meta = [connection.otherProfile?.curriculum, connection.otherProfile?.country].filter(Boolean).join(" · ");

  return (
    <Link href={`/u/${connection.otherProfile?.id ?? ""}`} className="flex min-w-0 items-center gap-3">
      <Avatar>
        <AvatarFallback className="bg-brand-primary-soft text-brand-primary-strong">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium hover:underline">{name}</p>
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </Link>
  );
}

export function PendingRequestRow({ connection }: { connection: ConnectionWithProfile }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
      <Identity connection={connection} />
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(async () => { await respondToConnectionRequest(connection.id, true); })}
        >
          <Check className="size-3.5" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(async () => { await respondToConnectionRequest(connection.id, false); })}
        >
          <X className="size-3.5" /> Decline
        </Button>
      </div>
    </div>
  );
}

export function ConnectionRow({ connection, pending = false }: { connection: ConnectionWithProfile; pending?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
      <Identity connection={connection} />
      <div className="flex shrink-0 items-center gap-2">
        {pending ? <span className="text-xs text-muted-foreground">Requested</span> : null}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={pending ? "Withdraw request" : "Remove connection"}
          disabled={isPending}
          onClick={() => startTransition(async () => { await removeConnection(connection.id); })}
          className="text-muted-foreground hover:text-destructive"
        >
          <UserMinus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
