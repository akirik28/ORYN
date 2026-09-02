"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllRead } from "./mark-read";

export function MarkAllReadButton({ unreadCount, label }: { unreadCount: number; label: string }) {
  const [isPending, startTransition] = useTransition();
  if (unreadCount === 0) return null;

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={() => markAllRead(startTransition)}>
      <CheckCheck className="size-3.5" /> {label}
    </Button>
  );
}
