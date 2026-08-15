import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Gauge, Compass, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightVariant = "gap" | "avoid" | "strength" | "neutral";

const VARIANT: Record<InsightVariant, { icon: LucideIcon; className: string; iconClassName: string }> = {
  gap: {
    icon: Gauge,
    className: "border-brand-primary-border bg-brand-primary-subtle",
    iconClassName: "bg-brand-primary-soft text-brand-primary-strong",
  },
  // "Avoid for now" is a strategic call, not a warning — same restrained brand tint as
  // `gap`, distinguished by icon and copy alone. Never give this variant a red/amber
  // tone; the spec is explicit that this should never read as alarming.
  avoid: {
    icon: Compass,
    className: "border-border bg-muted/50",
    iconClassName: "bg-muted text-foreground/70",
  },
  strength: {
    icon: TrendingUp,
    className: "border-success/20 bg-success/[0.06]",
    iconClassName: "bg-success/15 text-success",
  },
  neutral: {
    icon: Sparkles,
    className: "border-border bg-card",
    iconClassName: "bg-muted text-muted-foreground",
  },
};

export function InsightCard({
  variant = "neutral",
  eyebrow,
  title,
  children,
  action,
  className,
}: {
  variant?: InsightVariant;
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const config = VARIANT[variant];
  const Icon = config.icon;

  return (
    <section className={cn("rounded-2xl border p-5 md:p-6", config.className, className)}>
      <div className="flex gap-4">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", config.iconClassName)}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
          <p className="font-heading text-lg leading-snug font-medium text-balance">{title}</p>
          {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
