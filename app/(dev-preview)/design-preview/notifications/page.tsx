import { notFound } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationList } from "@/features/notifications/notification-list";
import { Pagination } from "@/components/oryn/pagination";
import { EmptyState } from "@/components/oryn/empty-state";
import { Button } from "@/components/ui/button";
import { FILTERABLE_CATEGORIES } from "@/features/notifications/categories";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";
import type { Notification } from "@/types/database";

// Static, labeled snapshots of every state the real page (app/(app)/notifications/page.tsx)
// can render — not a working filter/pagination UI (there's no real searchParams handler
// here), just every visual state stacked so it can all be checked in one screenshot pass.
// Only 2 of the 7 live categories (weekly_plan, new_opportunity) have ever produced a real
// row on oryn-qa-scratch as of 2026-09-02 (docs/notification-settings-gap-2026-09-02.md's
// live count) — deadline, profile_update, university_data_changed, connection, and message
// are all real code paths with real writers but zero rows yet, so this fixture set is still
// the only way to see mixed-category content rendered together.
const FIXTURES: Notification[] = [
  {
    id: "p1",
    user_id: "u1",
    category: "deadline",
    title: "4 deadlines coming up",
    body: "University of Pennsylvania — tomorrow; International Economics Challenge 2027 — 3 days; London School of Economics — Economics, personal statement — 7 days; Youth Research Fellows Programme — 14 days",
    link: "/dashboard",
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "p2",
    user_id: "u1",
    category: "profile_update",
    title: "Your profile score changed",
    body: "Research +8; Community Impact +3; Entrepreneurship -2; Awards & Distinction +6; Leadership -5; Academics +5; Your profile is now 75% complete",
    link: "/profile/history",
    read_at: null,
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: "p3",
    user_id: "u1",
    category: "new_opportunity",
    title: "New match: International Economics Challenge 2027",
    body: "A strong fit for your target field, closing in 6 days.",
    link: "/opportunities",
    read_at: null,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p4",
    user_id: "u1",
    category: "connection",
    title: "Mira accepted your connection request",
    body: null,
    link: "/connections",
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p5",
    user_id: "u1",
    category: "message",
    title: "New message from Mira",
    body: "Hey — did you end up applying to the Rotterdam program?",
    link: "/messages/mira",
    read_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "p6",
    user_id: "u1",
    category: "weekly_plan",
    title: "Your weekly plan is ready",
    body: "Finish your economics dataset, apply to the Economics Challenge, write your research conclusion.",
    link: "/plan",
    read_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
  },
  {
    // Was a second `deadline` row (duplicating p1's category) rather than
    // `university_data_changed` — the section below claims "every category," and until this
    // fix it wasn't: university_data_changed had no fixture at all, six distinct categories
    // shown for a claimed seven. Title/body shape matches
    // lib/universities/data-change-scan.ts's buildUniversityChangeNotification single-hit
    // case exactly (messages/en.json's universityDataChangedTitle: "{name} — information
    // updated", body always null for a single hit — only the digest case has a body).
    id: "p7",
    user_id: "u1",
    category: "university_data_changed",
    title: "Bocconi University — information updated",
    body: null,
    link: "/universities/uni1",
    read_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
];

export default function NotificationsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-2">Filter pills — active vs. inactive</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm">
              All
            </Button>
            {FILTERABLE_CATEGORIES.map((c) => (
              <Button key={c} variant="outline" size="sm">
                {c}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-2">Mixed list — 7 items, every category, read and unread</h2>
          <NotificationList notifications={FIXTURES} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-2">Pagination — page 2 of 5</h2>
          <Pagination currentPage={2} totalPages={5} buildHref={(p) => `#page-${p}`} ariaLabel="Pagination" previousLabel="Previous" nextLabel="Next" pageLabel="Page 2 of 5" />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-2">Empty — no notifications ever</h2>
          <EmptyState icon={Bell} title="Nothing here yet" description="Deadlines, new opportunities, and profile changes will show up here as they happen." />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-2">Empty — this filter has nothing (but other categories do)</h2>
          <EmptyState
            icon={Bell}
            title="Nothing in this category"
            description="Try a different filter, or view everything."
            action={
              <Button variant="outline" size="sm">
                All
              </Button>
            }
          />
        </section>
      </div>
    </PreviewShell>
  );
}
