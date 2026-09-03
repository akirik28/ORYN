"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Gauge, Scale, TrendingUp, Users, Wallet, Library, Telescope,
  MessagesSquare, ShieldCheck, Cpu, ScrollText, SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The control centre's own navigation — deliberately NOT the student sidebar.
 *
 * The founder rejected two earlier admin designs before this one, and the second rejection
 * was about kind rather than degree: "bu bir sayfa olmayacak, uygulama yönetme uygulaması
 * olacak... sol barda bambaşka şeyler olacak." A page inside the student shell, however many
 * controls it grew, kept reading as a page. So this is a separate rail in a separate route
 * group with its own ground.
 *
 * Twelve destinations, three groups, ordered by how often a founder actually needs them
 * rather than by system architecture — money and students before infrastructure. Each
 * carries an icon that describes its own job (a scale for profit and loss, a telescope for
 * research), not a decorative set: the same reason the card glyphs are a curated map and not
 * a hash. See docs/kumanda-merkezi-yapi-plani-2026-09-03.md.
 *
 * `max-height`/`overflow-y` are load-bearing, not defensive: twelve items plus the footer
 * overflow an 860px viewport, and the prototype silently cut off its last entry before this
 * was added.
 *
 * Below `lg` the rail is a horizontal scrolling strip, not a column. The approved prototype
 * did this and the behaviour was lost porting it to Tailwind, so until 2026-09-03 an admin
 * on anything narrower than a laptop scrolled past all twelve entries at full natural height
 * before reaching the first line of the page -- the sticky and max-height constraints were
 * `lg:`-only, so nothing capped it. Found by rendering at 375px and 768px, not by reading:
 * a column that works at one width says nothing about the others. The brand block and group
 * headers hide below `lg` because a horizontal strip has no room for them and the icons
 * already carry the distinction.
 */
// The full translation key rides on each entry rather than being assembled at the call
// site: next-intl types t() against the literal key set, so a `item.${string}` template
// is not assignable and would have to be cast away -- which would also throw away the
// compile-time check that every rail entry actually has a string in both locales.
type ItemKey = `item.${"overview" | "profitLoss" | "traffic" | "students" | "spend"
  | "catalog" | "research" | "community" | "moderation" | "system" | "ledger" | "settings"}`;
type GroupKey = `group.${"daily" | "content" | "infra"}`;
type Item = { href: string; key: ItemKey; icon: LucideIcon };

const GROUPS: { key: GroupKey; items: Item[] }[] = [
  {
    key: "group.daily",
    items: [
      { href: "/kumanda", key: "item.overview", icon: Gauge },
      { href: "/kumanda/kar-zarar", key: "item.profitLoss", icon: Scale },
      { href: "/kumanda/trafik", key: "item.traffic", icon: TrendingUp },
      { href: "/kumanda/ogrenciler", key: "item.students", icon: Users },
      { href: "/kumanda/harcama", key: "item.spend", icon: Wallet },
    ],
  },
  {
    key: "group.content",
    items: [
      { href: "/kumanda/katalog", key: "item.catalog", icon: Library },
      { href: "/kumanda/arastirma", key: "item.research", icon: Telescope },
      { href: "/kumanda/topluluk", key: "item.community", icon: MessagesSquare },
      { href: "/kumanda/moderasyon", key: "item.moderation", icon: ShieldCheck },
    ],
  },
  {
    key: "group.infra",
    items: [
      { href: "/kumanda/sistem", key: "item.system", icon: Cpu },
      { href: "/kumanda/defter", key: "item.ledger", icon: ScrollText },
      { href: "/kumanda/ayarlar", key: "item.settings", icon: SlidersHorizontal },
    ],
  },
];

/** Every destination the rail offers. Exported so app/(admin)/kumanda/[...slug]/page.tsx can
 *  distinguish a screen that is planned but not built yet from a URL that is simply wrong --
 *  without a second hand-maintained list that would drift from this one. */
export const CONTROL_DESTINATIONS: readonly string[] = GROUPS.flatMap((g) => g.items.map((i) => i.href));

export function ControlRail() {
  const t = useTranslations("admin.control");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navLabel")}
      className="flex shrink-0 flex-row gap-1 overflow-x-auto bg-[#132a1c] px-2 py-2 text-[#dcecdf] lg:flex-col lg:gap-0.5 lg:overflow-x-visible lg:overflow-y-auto lg:px-3 lg:py-4 lg:sticky lg:top-0 lg:max-h-svh lg:w-[246px]"
    >
      <div className="hidden items-center gap-2.5 px-2 pb-3 lg:flex">
        <span
          aria-hidden="true"
          className="size-7 shrink-0 rounded-lg"
          style={{ background: "conic-gradient(from 210deg,#54c087,#1f7a4d,#2f8f5c,#54c087)" }}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">Proxola</span>
          <span className="block text-[10px] uppercase tracking-[0.13em] text-[#8fb69d]">
            {t("brandSub")}
          </span>
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.key} className="contents">
          <p className="hidden px-2 pb-1 pt-3 text-[9.5px] uppercase tracking-[0.15em] text-[#8fb69d] lg:block">
            {t(group.key)}
          </p>
          {group.items.map(({ href, key, icon: Icon }) => {
            // Exact match for the index route, prefix match for the rest -- otherwise
            // /kumanda would highlight alongside every child it is a prefix of.
            const active = href === "/kumanda" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[9px] px-2 py-2 text-[13.5px] transition-colors",
                  "hover:bg-[#1b3a27] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4fbb83]",
                  active && "bg-[#1b3a27] shadow-[inset_2px_0_0_#4fbb83]",
                )}
              >
                <span
                  className={cn(
                    "grid size-[30px] shrink-0 place-items-center rounded-[7px] border border-white/10 bg-[#16281d]",
                    active ? "text-[#a8ecc6]" : "text-[#7fd7a6]",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[17px]" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1 truncate">{t(key)}</span>
              </Link>
            );
          })}
        </div>
      ))}

      <p className="mt-auto hidden border-t border-white/[0.07] px-2 pt-3 text-[10.5px] leading-relaxed text-[#8fb69d] lg:block">
        {t("footerNote")}
      </p>
    </nav>
  );
}
