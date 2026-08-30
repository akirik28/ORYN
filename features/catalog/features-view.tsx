import Link from "next/link";
import {
  FileText,
  ScanLine,
  BookOpen,
  FolderOpen,
  TrendingUp,
  Scale,
  ListChecks,
  FolderClosed,
  FlaskConical,
  Eye,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";

/**
 * Everything Oryn can do, in one place.
 *
 * Exists because several real, finished tools were reachable only from a stack of small
 * text links in the Journey page's header — CV Generator, CV scanning, the Essay Story
 * Bank and Portfolio in particular (founder review, 2026-08-30: "cv oluştur cv okut gibi
 * özellikler kenarda köşede saklanmasın"). Nothing here is new functionality; every tile
 * links to a route that already exists. This is a discovery surface, not a feature.
 *
 * On imagery: these tiles carry an icon over a tinted gradient, not photographs. That is
 * deliberate and is *not* the same call as OpportunityCard's placeholder — a feature tile
 * is illustrating a tool in this product, where decorative treatment is honest; an
 * opportunity card's image would be standing in as evidence about a real-world programme,
 * which is what Rule 4 forbids.
 */
interface Feature {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the tile header. Varied per feature so a grid of these
   *  doesn't read as one repeated card — founder direction, 2026-08-30. */
  tint: string;
  group: "Your record" | "Planning" | "Exploring";
}

const FEATURES: Feature[] = [
  {
    href: "/profile/cv",
    title: "CV Generator",
    description:
      "Build a CV from what's already in your Journey — choose what to include, then print or save as PDF. Nothing is invented.",
    icon: FileText,
    tint: "from-indigo-500/22 via-violet-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/profile/import",
    title: "Scan a CV",
    description:
      "Upload a CV or résumé and Oryn extracts your activities, awards and education. You review every item before anything is saved.",
    icon: ScanLine,
    tint: "from-sky-500/22 via-cyan-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/profile/story-bank",
    title: "Essay Story Bank",
    description:
      "The moments behind your achievements, kept in your own words — raw material for application essays, never auto-written for you.",
    icon: BookOpen,
    tint: "from-amber-500/22 via-orange-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/profile/portfolio",
    title: "Portfolio",
    description: "Everything you've done in one place, as a timeline or grouped by category.",
    icon: FolderOpen,
    tint: "from-emerald-500/22 via-teal-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/documents",
    title: "Documents",
    description:
      "Certificates and evidence files, attached to the achievements they belong to. Private by default — never public.",
    icon: FolderClosed,
    tint: "from-slate-500/22 via-zinc-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/u/me",
    title: "Public profile",
    description:
      "A shareable version of your record. Off by default; grades and school details are never included.",
    icon: Eye,
    tint: "from-fuchsia-500/22 via-pink-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/plan",
    title: "Weekly plan",
    description:
      "Your three highest-value actions for the week, sized to the time you actually have.",
    icon: ListChecks,
    tint: "from-violet-500/22 via-indigo-500/12 to-transparent",
    group: "Planning",
  },
  {
    href: "/profile/history",
    title: "Progress",
    description:
      "How your profile has changed month to month, and which areas actually moved.",
    icon: TrendingUp,
    tint: "from-lime-500/22 via-green-500/12 to-transparent",
    group: "Planning",
  },
  {
    href: "/universities/compare",
    title: "Compare universities",
    description:
      "Put two to four universities side by side. Unknown figures read \"—\", never a guess.",
    icon: Scale,
    tint: "from-blue-500/22 via-indigo-500/12 to-transparent",
    group: "Exploring",
  },
  {
    href: "/profile",
    title: "Research idea generator",
    description:
      "Project ideas scaled to your level and interests, built from real academic literature — achievable, not impressive-sounding.",
    icon: FlaskConical,
    tint: "from-rose-500/22 via-red-500/12 to-transparent",
    group: "Exploring",
  },
];

const GROUP_ORDER: Feature["group"][] = ["Your record", "Planning", "Exploring"];

// Rotated per-card so a grid doesn't pulse in unison — same technique the dashboard uses.
const GLOW_VARIANTS = ["glass-card", "glass-card-offset", "glass-card-fast", "glass-card-offset2"];

export function FeaturesView({ userId }: { userId: string }) {
  return (
    <div className="space-y-10">
      <div
        className="dark relative overflow-hidden rounded-[28px] p-6 text-foreground md:p-8"
        style={{ background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-20 size-[360px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(107,100,240,0.5) 0%, rgba(107,100,240,0) 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 size-[280px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(184,106,0,0.4) 0%, rgba(184,106,0,0) 70%)" }}
        />
        <div className="relative">
          <PageHeader
            eyebrow="Features"
            title="Everything Oryn can do."
            description="Tools that work from the record you've already built — not separate things to fill in again."
          />
        </div>
      </div>

      {GROUP_ORDER.map((group) => {
        const items = FEATURES.filter((f) => f.group === group);
        return (
          <section key={group} className="space-y-4">
            <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">{group}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((feature, i) => {
                const Icon = feature.icon;
                // "/u/me" is a stand-in in the table above — the real public profile lives
                // at the student's own id, which is only known at request time.
                const href = feature.href === "/u/me" ? `/u/${userId}` : feature.href;
                return (
                  <Link
                    key={feature.href}
                    href={href}
                    className={`${GLOW_VARIANTS[i % GLOW_VARIANTS.length]} group flex flex-col overflow-hidden rounded-2xl border border-white/65 bg-white/45 backdrop-blur-2xl transition-transform duration-(--duration-fast) hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`}
                  >
                    <div className={`flex h-24 items-center justify-center bg-gradient-to-br ${feature.tint}`}>
                      <Icon className="size-8 text-ink-2" strokeWidth={1.4} aria-hidden="true" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="font-medium text-ink-1">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-ink-2">{feature.description}</p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm text-brand-primary">
                        Open
                        <ArrowRight className="size-3.5 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
