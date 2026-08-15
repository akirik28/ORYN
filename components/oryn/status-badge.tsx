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
  className,
}: {
  label: string;
  tone?: StatusTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      {label}
    </span>
  );
}
