"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  const t = useTranslations("connections.actions");
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  if (status === "accepted") {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Check className="size-3.5" /> {t("connected")}
      </Button>
    );
  }

  if (status === "pending" && isRecipient && initialConnectionId) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await respondToConnectionRequest(initialConnectionId, true);
              if (result.error) toast.error(result.error);
            })
          }
        >
          {t("accept")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await respondToConnectionRequest(initialConnectionId, false);
              if (result.error) toast.error(result.error);
            })
          }
        >
          {t("decline")}
        </Button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <Button variant="outline" size="sm" disabled>
        <Clock className="size-3.5" /> {t("requested")}
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
      <UserPlus className="size-3.5" /> {t("connect")}
    </Button>
  );
}
