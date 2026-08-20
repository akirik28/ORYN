import {
  Trophy,
  FlaskConical,
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

// Single source of truth for "what does this category look like" — the icon-band on a card/
// detail panel, wherever a category needs a visual identity. No opportunity has a real image
// anywhere in the schema today (audited exhaustively — no image column on opportunities,
// opportunity_sources, or canonical_entities); this is the honest fallback, not a placeholder
// standing in for a photo that's merely absent from one record. Mirrors university-card.tsx's
// own icon-on-gradient terminus tier, same tokens, so a card without a real photo still reads
// as the same product rather than a different, lesser visual language.
export const CATEGORY_ICON: Record<OpportunityCategory, LucideIcon> = {
  competition: Trophy,
  research: FlaskConical,
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

export function humanizeCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
