import { Paperclip, BadgeCheck, CircleDashed, type LucideIcon } from "lucide-react";
import type { StatusTone } from "@/components/proxola/status-badge";
import type { EvidenceStatus } from "@/types/database";

/**
 * How each evidence_status renders, wherever an achievement item is shown (Journey,
 * AchievementSection) — spec Phase 11/21's four-state vocabulary made visible, not just
 * stored. Deliberately a pure mapping rather than a component: `StatusBadge`'s label
 * needs a translated string, and this needs to be callable from both a Server Component
 * (JourneyTimeline, via getTranslations) and a Client Component (AchievementSection, via
 * useTranslations) — two incompatible ways to resolve one, so the caller resolves the
 * label itself (it already has a `t` in scope either way) and this only supplies which
 * key, tone, and icon go with which status.
 *
 * `self_reported` (and `null`, for tables that don't track it) map to `null` — no badge
 * at all, on purpose. It's the default nearly every item will carry forever, and on a
 * list of a dozen achievements a badge repeated a dozen times stops being information
 * and starts being wallpaper — worse, it risks reading as "here's what's missing" on
 * every single row, which is exactly the nagging tone the spec rules out. Silence is the
 * one presentation that cannot be misread as a deficiency notice.
 *
 * `evidence_added` and `verified` are deliberately NOT the same tone or icon — Phase 21
 * is explicit that a file existing is not verification, and that line has to hold in the
 * UI, not just in the copy. `evidence_added` stays `neutral` (a paperclip, not a check —
 * an acknowledgment that something was attached, not a claim about it) so it can never
 * be mistaken for the stronger, currently-unreachable `verified` state, which gets the
 * one `success`-toned badge in this whole mapping because it is the one state that has
 * actually earned it.
 *
 * `verification_rejected` (also currently unreachable — nothing in the product sets
 * either of the last two states yet) stays neutral rather than an error/destructive
 * tone: this product's users are minors, "rejected" already reads harshly as an enum
 * name, and a mistaken or unconfirmable claim is not the same as a violation. Calm and
 * factual, not punitive.
 */
export interface EvidenceStatusPresentation {
  tone: StatusTone;
  icon: LucideIcon;
  /** Key under the `evidenceStatus` i18n namespace — resolve with the caller's own `t`. */
  labelKey: "evidenceAdded" | "verified" | "notConfirmed";
}

export function evidenceStatusPresentation(status: EvidenceStatus | null | undefined): EvidenceStatusPresentation | null {
  switch (status) {
    case "evidence_added":
      return { tone: "neutral", icon: Paperclip, labelKey: "evidenceAdded" };
    case "verified":
      return { tone: "success", icon: BadgeCheck, labelKey: "verified" };
    case "verification_rejected":
      return { tone: "neutral", icon: CircleDashed, labelKey: "notConfirmed" };
    case "self_reported":
    case null:
    case undefined:
      return null;
  }
}
