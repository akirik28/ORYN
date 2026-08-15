"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateApplicationStatus } from "@/app/(app)/applications/actions";
import { transition } from "@/lib/motion";
import type { ApplicationStatus } from "@/types/database";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "accepted", label: "Accepted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

// A handful of small dots radiating outward on acceptance — restrained, not a literal
// confetti library. "No childish fireworks overload... a meaningful, memorable Oryn
// moment" (Chat 2 spec). Respects prefers-reduced-motion via the app-wide MotionConfig.
const BURST_DOTS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { x: Math.cos(angle) * 70, y: Math.sin(angle) * 70, delay: i * 0.015 };
});

export function AcceptanceMoment({ universityName }: { universityName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, height: 0 }}
      animate={{ opacity: 1, scale: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={transition("slow")}
      className="relative overflow-hidden rounded-2xl border border-success/25 bg-success/[0.06] p-6 text-center"
    >
      <div className="relative mx-auto flex size-14 items-center justify-center">
        {BURST_DOTS.map((dot, i) => (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full bg-success"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: dot.x, y: dot.y, opacity: 0 }}
            transition={{ duration: 0.7, delay: dot.delay, ease: "easeOut" }}
          />
        ))}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...transition("slow"), delay: 0.1 }}
          className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <GraduationCap className="size-7" />
        </motion.span>
      </div>
      <p className="mt-4 font-heading text-xl font-medium">You&apos;re in.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Accepted to {universityName}. Whatever came before this moment worked — well done.
      </p>
    </motion.div>
  );
}

export function ApplicationStatusControl({
  applicationId,
  initialStatus,
  universityName,
}: {
  applicationId: string;
  initialStatus: ApplicationStatus;
  universityName: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [justAccepted, setJustAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function changeStatus(next: ApplicationStatus) {
    const previous = status;
    const wasAccepted = status === "accepted";
    setStatus(next);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, next);
      if (result.error) {
        // Roll back the optimistic update — otherwise a failed write leaves the select
        // showing a status that was never actually saved, with no indication anything
        // went wrong.
        setStatus(previous);
        toast.error(result.error);
        return;
      }
      if (next === "accepted" && !wasAccepted) setJustAccepted(true);
    });
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>{justAccepted ? <AcceptanceMoment universityName={universityName} /> : null}</AnimatePresence>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status</span>
        <Select value={status} onValueChange={(v) => v && changeStatus(v as ApplicationStatus)}>
          <SelectTrigger className="w-44" disabled={isPending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
