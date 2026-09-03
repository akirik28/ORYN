import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
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
import type { StaticImageData } from "next/image";
import { PageHeader } from "@/components/proxola/page-header";
import { heroGradientStyle } from "@/components/proxola/hero-gradient";
import type { PlanTier } from "@/types/database";

// Statically imported, not referenced by string path. Next fingerprints each file into
// /_next/static/media/<name>.<contenthash>.webp, so replacing an illustration changes its
// URL and a returning browser can never keep serving the previous one from cache. String
// paths under /public keep a stable URL forever, which is exactly how a stale image
// survives a redeploy — hit live during this work: the files and every server response
// were already correct while two browsers kept painting the superseded art.
import imgCvGenerator from "@/public/features/cv-generator.webp";
import imgScanCv from "@/public/features/scan-cv.webp";
import imgStoryBank from "@/public/features/story-bank.webp";
import imgPortfolio from "@/public/features/portfolio.webp";
import imgDocuments from "@/public/features/documents.webp";
import imgPublicProfile from "@/public/features/public-profile.webp";
import imgWeeklyPlan from "@/public/features/weekly-plan.webp";
import imgProgress from "@/public/features/progress.webp";
import imgCompareUniversities from "@/public/features/compare-universities.webp";
import imgResearchIdeas from "@/public/features/research-ideas.webp";

/**
 * Everything Oryn can do, in one place.
 *
 * Exists because several real, finished tools were reachable only from a stack of small
 * text links in the Journey page's header — CV Generator, CV scanning, the Essay Story
 * Bank and Portfolio in particular (founder review, 2026-08-30: "cv oluştur cv okut gibi
 * özellikler kenarda köşede saklanmasın"). Nothing here is new functionality; every tile
 * links to a route that already exists. This is a discovery surface, not a feature.
 *
 * On imagery: each tile carries a generated abstract illustration (/public/features), with
 * its gradient + icon underneath as the loading/fallback ground. These are decorative
 * illustrations of tools inside this product, which is honest — deliberately NOT the same
 * call as OpportunityCard, where an image would stand in as evidence about a real-world
 * programme and Rule 4 forbids it. They are marked aria-hidden with empty alt: the tile's
 * heading and description already carry the meaning, so announcing the art would only add
 * noise for a screen reader.
 */
/** Matches a `catalog.features.<key>` entry in the message catalogs — see messages/en.json. */
type FeatureKey =
  | "cvGenerator"
  | "scanCv"
  | "storyBank"
  | "portfolio"
  | "documents"
  | "publicProfile"
  | "weeklyPlan"
  | "progress"
  | "compareUniversities"
  | "researchIdeas";

interface Feature {
  href: string;
  /** Statically imported tile illustration — see the import block above on why these are
   *  imports rather than /public string paths. */
  image: StaticImageData;
  /** Title and description live in the `catalog.features` message namespace, not here —
   *  this only says which entry. Kept as a key rather than the strings themselves so this
   *  table can stay locale-agnostic. */
  key: FeatureKey;
  icon: LucideIcon;
  /** Tailwind gradient stops for the tile header. Varied per feature so a grid of these
   *  doesn't read as one repeated card — founder direction, 2026-08-30. */
  tint: string;
  group: "Your record" | "Planning" | "Exploring";
}

const FEATURES: Feature[] = [
  {
    href: "/profile/cv",
    image: imgCvGenerator,
    key: "cvGenerator",
    icon: FileText,
    tint: "from-indigo-500/22 via-violet-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/profile/import",
    image: imgScanCv,
    key: "scanCv",
    icon: ScanLine,
    tint: "from-sky-500/22 via-cyan-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/profile/story-bank",
    image: imgStoryBank,
    key: "storyBank",
    icon: BookOpen,
    tint: "from-amber-500/22 via-orange-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/profile/portfolio",
    image: imgPortfolio,
    key: "portfolio",
    icon: FolderOpen,
    tint: "from-emerald-500/22 via-teal-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/documents",
    image: imgDocuments,
    key: "documents",
    icon: FolderClosed,
    tint: "from-slate-500/22 via-zinc-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/u/me",
    image: imgPublicProfile,
    key: "publicProfile",
    icon: Eye,
    tint: "from-fuchsia-500/22 via-pink-500/12 to-transparent",
    group: "Your record",
  },
  {
    href: "/plan",
    image: imgWeeklyPlan,
    key: "weeklyPlan",
    icon: ListChecks,
    tint: "from-violet-500/22 via-indigo-500/12 to-transparent",
    group: "Planning",
  },
  {
    href: "/profile/history",
    image: imgProgress,
    key: "progress",
    icon: TrendingUp,
    tint: "from-lime-500/22 via-green-500/12 to-transparent",
    group: "Planning",
  },
  {
    href: "/universities/compare",
    image: imgCompareUniversities,
    key: "compareUniversities",
    icon: Scale,
    tint: "from-blue-500/22 via-indigo-500/12 to-transparent",
    group: "Exploring",
  },
  {
    href: "/profile/research-ideas",
    image: imgResearchIdeas,
    key: "researchIdeas",
    icon: FlaskConical,
    tint: "from-rose-500/22 via-red-500/12 to-transparent",
    group: "Exploring",
  },
];

const GROUP_ORDER: Feature["group"][] = ["Your record", "Planning", "Exploring"];

// Rotated per-card so a grid doesn't pulse in unison — same technique the dashboard uses.
const GLOW_VARIANTS = ["glass-card", "glass-card-offset", "glass-card-fast", "glass-card-offset2"];

export async function FeaturesView({ userId, tier = "standard" }: { userId: string; tier?: PlanTier }) {
  const t = await getTranslations("catalog");

  return (
    <div className="space-y-10">
      <div
        className="dark relative overflow-hidden rounded-[28px] p-6 text-foreground md:p-8"
        style={heroGradientStyle(tier)}
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
          <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        </div>
      </div>

      {GROUP_ORDER.map((group) => {
        const items = FEATURES.filter((f) => f.group === group);
        // Every t() call here stays a string literal (not a computed key) on purpose —
        // see __tests__/i18n/translation-keys.test.ts, which can only verify literal keys.
        const groupLabel = group === "Your record" ? t("groups.yourRecord") : group === "Planning" ? t("groups.planning") : t("groups.exploring");
        return (
          <section key={group} className="space-y-4">
            <h2 className="text-[0.6875rem] font-medium tracking-[0.18em] text-ink-3 uppercase">{groupLabel}</h2>
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
                    {/* The gradient stays underneath as the tile's ground, so the card still
                        reads correctly while the illustration loads (and if one is ever
                        missing). The icon sits on top of it for the same reason — the image
                        covers both once it paints. */}
                    <div className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${feature.tint}`}>
                      <Icon className="size-8 text-ink-2" strokeWidth={1.4} aria-hidden="true" />
                      <Image
                        src={feature.image}
                        alt=""
                        aria-hidden="true"
                        fill
                        sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3 className="font-medium text-ink-1">{t(`features.${feature.key}.title`)}</h3>
                      <p className="text-sm leading-relaxed text-ink-2">{t(`features.${feature.key}.description`)}</p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm text-brand-primary">
                        {t("open")}
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
