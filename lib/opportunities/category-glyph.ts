import {
  Trophy,
  Microscope,
  Briefcase,
  Sun,
  Award,
  GraduationCap,
  HeartHandshake,
  Rocket,
  Code2,
  BookOpen,
  Laptop,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { OpportunityCategory } from "@/types/database";

/**
 * One deliberately-chosen glyph per category, for the honest placeholder band
 * (features/opportunities/opportunity-card.tsx) an opportunity shows until — or in place of,
 * for the 128 organizer pages that publish no `og:image` at all — a real acquired photo.
 *
 * Founder correction, 2026-09-03: "sen bana rapor tarzı bir şey yapıyorsun... istediğimi
 * ultra yapayım basıp bir tuşa" was the admin-panel complaint that started this session's
 * admin work; the opportunity-image half of the same night's work is the founder's separate,
 * still-open "fotoğrafları bile eksik" (even the photos are missing). Measuring first
 * (docs/opportunity-image-licensing.md-adjacent — see the memory this session wrote) showed
 * the acquisition pipeline had already run once, completely, to a real ~23% ceiling — the
 * remaining ~77% is bounded by organizer pages that structurally publish no preview image,
 * not by a bug. oryn-a7's call: build a category-keyed generated placeholder (closes the
 * whole gap, needs no licensing sign-off, since there is no third-party content) rather than
 * keep re-hosting third-party images under an unresolved legal basis.
 *
 * A curated mapping, not a hash — the opposite instinct from lib/ui/placeholder-tint.ts's
 * FNV-1a colour choice, deliberately: colour needs even distribution and no meaning, category
 * iconography needs the reverse. A competition and a summer programme must never land on the
 * same glyph by coincidence, which a hash cannot promise and a fixed map can. `CATEGORY_GLYPH`
 * is exhaustively typed (`Record<OpportunityCategory, LucideIcon>`), so a future addition to
 * the enum in types/database.ts fails this file's own type check rather than silently
 * falling through to a generic icon.
 */
export const CATEGORY_GLYPH: Record<OpportunityCategory, LucideIcon> = {
  competition: Trophy,
  research: Microscope,
  internship: Briefcase,
  summer_program: Sun,
  fellowship: Award,
  scholarship: GraduationCap,
  volunteering: HeartHandshake,
  entrepreneurship: Rocket,
  hackathon: Code2,
  academic_program: BookOpen,
  online_program: Laptop,
  conference: Presentation,
  student_program: Users,
};

export function categoryGlyph(category: OpportunityCategory): LucideIcon {
  return CATEGORY_GLYPH[category];
}
