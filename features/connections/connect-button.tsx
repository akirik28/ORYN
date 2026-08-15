"use client";

import { useState, useTransition } from "react";
import { UserPlus, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendConnectionRequest, respondToConnectionRequest } from "@/app/(app)/connections/actions";
import type { ConnectionStatus } from "@/types/database";

export function ConnectButton({
  targetId,
  initialStatus,
  initialConnectionId,
  isRecipient,
}: {
  targetId: string;
  initialStatus: ConnectionStatus | null;
  initialConnectionId: string | null;
  isRecipient: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  if (status === "accepted") {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Check className="size-3.5" /> Connected
      </Button>
    );
  }

  if (status === "pending" && isRecipient && initialConnectionId) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(async () => { await respondToConnectionRequest(initialConnectionId, true); })}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(async () => { await respondToConnectionRequest(initialConnectionId, false); })}
        >
          Decline
        </Button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <Button variant="outline" size="sm" disabled>
        <Clock className="size-3.5" /> Requested
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendConnectionRequest(targetId);
          if (!result.error) setStatus("pending");
        })
      }
    >
      <UserPlus className="size-3.5" /> Connect
    </Button>
  );
}
