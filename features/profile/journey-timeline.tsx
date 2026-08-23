import {
  Award as AwardIcon,
  BookOpen,
  Briefcase,
  FlaskConical,
  GraduationCap,
  HandHeart,
  Hammer,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { EmptyState } from "@/components/oryn/empty-state";
import { groupJourneyByYear, type JourneyEntry, type JourneyKind } from "@/lib/profile/journey";

const KIND_ICON: Record<JourneyKind, LucideIcon> = {
  leadership: Users,
  activity: Sparkles,
  research: FlaskConical,
  project: Hammer,
  work: Briefcase,
  volunteering: HandHeart,
  sport: Medal,
  award: Trophy,
  certification: AwardIcon,
  course: BookOpen,
  test_score: GraduationCap,
  education: GraduationCap,
};

const KIND_LABEL: Record<JourneyKind, string> = {
  leadership: "Leadership",
  activity: "Activity",
  research: "Research",
  project: "Project",
  work: "Work",
  volunteering: "Volunteering",
  sport: "Sport",
  award: "Award",
  certification: "Certification",
  course: "Coursework",
  test_score: "Test score",
  education: "Education",
};

/**
 * The Journey timeline (UI-V3 § 16).
 *
 * Explicitly *not* "one line down the page plus identical cards". Years are the anchors,
 * and each record renders at the weight its type earns:
 *
 * - `story`     — leadership, research, projects. Display-face title, description shown.
 * - `experience`— work, volunteering, activities, sport, education. Organisation-led.
 * - `achievement`— awards. Their own compact, distinct treatment.
 * - `compact`   — coursework, test scores, certifications. One dense line each.
 *
 * The differentiation is the point: a page where a two-year leadership role and an AP
 * course look the same tells a student nothing about what carries weight. The shared rail
 * and the year anchors are what keep it one system rather than four stacked lists.
 */
export function JourneyTimeline({ entries }: { entries: JourneyEntry[] }) {
  const groups = groupJourneyByYear(entries);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Your journey starts as soon as you add something"
        description="Courses, activities, projects, awards, work — anything you've done. Oryn builds this timeline from the sections below, and reads it to work out what to recommend next."
      />
    );
  }

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section key={group.year ?? "undated"} aria-label={group.year ? String(group.year) : "No date recorded"}>
          <div className="flex items-baseline gap-4">
            <h3 className="font-display text-2xl leading-none tabular-nums md:text-3xl">
              {group.year ?? "Undated"}
            </h3>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            <span className="text-xs text-ink-4 tabular-nums">
              {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {/* One rail per year, so differently-weighted records still read as one spine. */}
          <ul className="mt-6 space-y-0 border-l border-border">
            {group.entries.map((entry) => (
              <JourneyRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function JourneyRow({ entry }: { entry: JourneyEntry }) {
  const Icon = KIND_ICON[entry.kind];
  const isStory = entry.weight === "story";
  const isCompact = entry.weight === "compact";
  const isAchievement = entry.weight === "achievement";

  return (
    <li
      className={cn(
        "relative pl-6 sm:pl-8",
        isStory ? "py-6" : isCompact ? "py-2" : "py-4",
        // The node on the rail. Stories get a filled brand node; everything else a quiet
        // ring, so the eye can find the substantial records while scanning a year.
        "before:absolute before:left-0 before:-translate-x-1/2 before:rounded-full before:content-['']",
        isStory
          ? "before:top-7 before:size-2.5 before:bg-brand-primary"
          : "before:top-[1.15rem] before:size-1.5 before:bg-border-strong before:ring-2 before:ring-background",
        isCompact && "before:top-3.5",
      )}
    >
      <div className={cn("flex items-baseline gap-3", isCompact && "flex-wrap")}>
        <Icon
          aria-hidden="true"
          className={cn("shrink-0 translate-y-0.5", isStory ? "size-4 text-brand-primary" : "size-3.5 text-ink-4")}
        />
        <div className="min-w-0 flex-1">
          {isStory ? <Eyebrow rule={false} tone="brand">{KIND_LABEL[entry.kind]}</Eyebrow> : null}
          <p
            className={cn(
              "text-balance",
              isStory
                ? "mt-1.5 font-display text-xl leading-snug md:text-2xl"
                : isAchievement
                  ? "font-medium text-ink-1"
                  : isCompact
                    ? "text-sm text-ink-2"
                    : "font-medium text-ink-1",
            )}
          >
            {entry.title}
          </p>

          <p
            className={cn(
              "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-ink-3",
              isStory ? "mt-2 text-sm" : "mt-1 text-xs",
            )}
          >
            {entry.organization ? <span className="min-w-0">{entry.organization}</span> : null}
            {entry.organization && entry.dateLabel ? (
              <span aria-hidden="true" className="text-ink-4">
                ·
              </span>
            ) : null}
            {entry.dateLabel ? <span className="tabular-nums">{entry.dateLabel}</span> : null}
            {!isStory && !isCompact ? (
              <span className="text-ink-4">· {KIND_LABEL[entry.kind]}</span>
            ) : null}
          </p>

          {/* Only stories carry their description. Everything else stays scannable; the
              full record is always one click away in the sections below. */}
          {isStory && entry.description ? (
            <p className="mt-3 max-w-2xl line-clamp-3 leading-relaxed text-ink-2">{entry.description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
