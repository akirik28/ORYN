"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConnectButton } from "./connect-button";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function PeopleYouMayKnowRow({ id, displayName, reasons }: { id: string; displayName: string | null; reasons: string[] }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
      <Link href={`/u/${id}`} className="group flex min-w-0 items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-brand-primary-soft text-brand-primary-strong">{initials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium group-hover:underline">{displayName ?? "Oryn student"}</p>
          {reasons.length > 0 ? <p className="truncate text-xs text-muted-foreground">{reasons.slice(0, 2).join(" · ")}</p> : null}
        </div>
      </Link>
      <div className="shrink-0">
        <ConnectButton targetId={id} initialStatus={null} initialConnectionId={null} isRecipient={false} />
      </div>
    </div>
  );
}
