import type { StatusTone } from "@/components/oryn/status-badge";

// Single source of truth for turning a numeric match score into the categorical, explained
// label the product shows students (never a bare percentage — see AGENTS.md's opportunity-fit
// guidance). Server-safe on purpose: OpportunityCard is a "use client" module (useState/
// useTransition for save/apply actions), so anything a Server Component also needs to call
// directly — like the dashboard's compact opportunity preview — has to live outside that
// client boundary.
export function tierFor(score: number): { label: string; tone: StatusTone; cardClassName: string } {
  if (score >= 80) return { label: "Exceptional match", tone: "brand", cardClassName: "border-brand-primary bg-brand-primary-subtle" };
  if (score >= 60) return { label: "Strong match", tone: "brand", cardClassName: "border-brand-primary-border" };
  if (score >= 40) return { label: "Worth a look", tone: "neutral", cardClassName: "border-border" };
  return { label: "Low priority", tone: "neutral", cardClassName: "border-border opacity-70" };
}
