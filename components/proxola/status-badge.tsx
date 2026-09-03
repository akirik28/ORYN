import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "brand" | "success" | "warning" | "error" | "info" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  brand: "border-brand-primary-border bg-brand-primary-soft text-brand-primary-strong",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/15 text-[oklch(0.42_0.13_75)] dark:text-warning",
  error: "border-error/25 bg-error/10 text-error",
  info: "border-info/25 bg-info/10 text-info",
  neutral: "border-border bg-muted text-muted-foreground",
};

// The one place status color means anything in this app. Every status pill — outlook,
// application status, evidence status, opportunity tier — should render through this
// rather than picking its own Tailwind color, so "what does amber mean here?" always has
// one answer.
export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
  wrap = false,
  className,
}: {
  label: string;
  tone?: StatusTone;
  icon?: LucideIcon;
  /**
   * Let the label wrap onto more than one line. Off by default, because a status *is* a
   * short word and a pill that reflows stops reading as one. Turn it on for the rare case
   * where the tone system is right but the text is a sentence — the counselor's
   * "Oryn can't check this without your birth year" caveat is the one today. Without it
   * such a label rode `whitespace-nowrap` straight off the right edge of a phone, where
   * the shell's `overflow-x-hidden` cut it off unreadably (founder report, 2026-08-31).
   */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex gap-1.5 border text-xs font-medium",
        wrap
          ? // Squarer corners and top-aligned: a full-radius pill around three lines of text
            // reads as a mistake, and the icon belongs beside the first line, not centred
            // against the whole block.
            "items-start rounded-lg px-2.5 py-1.5 leading-relaxed"
          : "items-center rounded-full px-2.5 py-0.5 whitespace-nowrap",
        TONE_CLASS[tone],
        className
      )}
    >
      {Icon ? <Icon className={cn("size-3 shrink-0", wrap && "mt-0.5")} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
