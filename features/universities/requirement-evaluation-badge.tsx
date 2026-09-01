import { Check, CheckCheck, X, CircleHelp, Eye } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/oryn/status-badge";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { RequirementEvaluationStatus } from "@/types/database";

// Five genuinely different states, five genuinely different tone+icon pairs — deliberate,
// per docs/chat-1-handoff.md: "unknown and needs_manual_review are meaningfully different
// states from not_met" (Phase 68 — Oryn should know when it doesn't know enough, not
// report a flat completion state). `likely_met` gets `info` rather than a second, weaker
// shade of `success` so it can't be mistaken for a confirmed `met` at a glance.
const STATUS_CONFIG: Record<RequirementEvaluationStatus, { label: string; tone: StatusTone; icon: typeof Check }> = {
  met: { label: "Met", tone: "success", icon: CheckCheck },
  likely_met: { label: "Likely met", tone: "info", icon: Check },
  not_met: { label: "Not met", tone: "error", icon: X },
  unknown: { label: "Unknown", tone: "neutral", icon: CircleHelp },
  needs_manual_review: { label: "Needs review", tone: "warning", icon: Eye },
};

const STATUS_LABEL_TR: Record<RequirementEvaluationStatus, string> = {
  met: "Karşılandı",
  likely_met: "Muhtemelen karşılandı",
  not_met: "Karşılanmadı",
  unknown: "Bilinmiyor",
  needs_manual_review: "İnceleme gerekiyor",
};

/** Both callers (this page's own RequirementGroup and calendar-bound-fact-card.tsx's sibling
 * badge below) are Server Components, so `locale` arrives as a plain prop rather than through
 * useLocale() — defaulted so a caller that hasn't been touched yet still compiles and renders
 * exactly today's English.
 *
 * Phase 69 — never renders a bare boolean; always the reasoning behind it too, since a
 * met/not_met call here is Oryn's own inference against a requirement's stated rule, not
 * an official admissions decision. */
export function RequirementEvaluationBadge({ status, locale = DEFAULT_LOCALE }: { status: RequirementEvaluationStatus; locale?: Locale }) {
  const config = STATUS_CONFIG[status];
  const label = locale === "tr" ? STATUS_LABEL_TR[status] : config.label;
  return <StatusBadge label={label} tone={config.tone} icon={config.icon} />;
}
