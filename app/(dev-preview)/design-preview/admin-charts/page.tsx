import { notFound } from "next/navigation";
import { LineAreaChart, BarChart, StackedBarChart, Sparkline, RatioRing, BurnChart } from "@/components/proxola/charts";
import type { SeriesPoint } from "@/components/proxola/charts";

/**
 * Dev-only reference for the admin chart kit (2026-09-02) — synthetic fixture data, not a
 * live query, since this page exists to show the API and the admin theme rendering
 * correctly, not to exercise a real data path (each real chart lives inside its own admin
 * section once a lane wires it up). Every series below includes at least one deliberate
 * `y: null` gap specifically so the "a gap looks like a gap" rule is visible here, not just
 * asserted in a comment.
 */
export default function AdminChartsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const days = Array.from({ length: 14 }, (_, i) => `9/${i + 1}`);
  const spend: SeriesPoint[] = days.map((d, i) => ({ x: d, y: i === 5 ? null : Math.round(20 + Math.sin(i / 2) * 8 + i * 3) }));
  const tokens: SeriesPoint[] = days.map((d, i) => ({ x: d, y: i === 9 ? null : Math.round(1000 + i * 60 + Math.cos(i / 3) * 200) }));

  return (
    <div data-surface="admin" className="min-h-screen p-4 md:p-8">
      <p className="mb-6 rounded-lg border px-4 py-2 text-xs" style={{ borderColor: "var(--admin-border-strong)", color: "var(--admin-ink-2)" }}>
        Dev-only reference for components/proxola/charts — synthetic data, admin theme applied
        directly on this page (real admin pages get it from app/(app)/admin/layout.tsx).
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="admin-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            LineAreaChart (area, one series, one gap)
          </h2>
          <LineAreaChart series={[{ id: "spend", label: "Daily spend", data: spend }]} area a11y={{ title: "Daily AI spend, last 14 days" }} />
        </div>

        <div className="admin-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            LineAreaChart (two series, no area)
          </h2>
          <LineAreaChart
            series={[
              { id: "spend", label: "Spend", data: spend },
              { id: "tokens", label: "Tokens (÷40)", data: tokens.map((p) => ({ x: p.x, y: p.y === null ? null : Math.round(p.y / 40) })) },
            ]}
            a11y={{ title: "Spend vs token volume, last 14 days" }}
          />
        </div>

        <div className="admin-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            BarChart (categorical)
          </h2>
          <BarChart
            series={{
              id: "categories",
              label: "Opportunities by category",
              data: [
                { x: "Competitions", y: 42 },
                { x: "Research", y: 18 },
                { x: "Internships", y: null },
                { x: "Fellowships", y: 9 },
                { x: "Volunteering", y: 27 },
              ],
            }}
            a11y={{ title: "Opportunities by category" }}
          />
        </div>

        <div className="admin-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            StackedBarChart (composition)
          </h2>
          <StackedBarChart
            categories={["Mon", "Tue", "Wed", "Thu", "Fri"]}
            series={[
              { id: "advisor", label: "Advisor", data: [{ x: "Mon", y: 12 }, { x: "Tue", y: 15 }, { x: "Wed", y: 9 }, { x: "Thu", y: null }, { x: "Fri", y: 14 }] },
              { id: "research", label: "Research ideas", data: [{ x: "Mon", y: 4 }, { x: "Tue", y: 6 }, { x: "Wed", y: 5 }, { x: "Thu", y: 7 }, { x: "Fri", y: 3 }] },
            ]}
            a11y={{ title: "AI calls by feature, this week" }}
          />
        </div>

        <div className="admin-panel flex flex-col items-center rounded-xl p-4">
          <h2 className="mb-3 self-start text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            RatioRing (donut/gauge) — under, over, unknown
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <RatioRing value={620} max={1000} label="Budget used" formatValue={(v) => `$${v}`} a11y={{ title: "Monthly budget used" }} />
            <RatioRing value={1240} max={1000} label="Over budget" formatValue={(v) => `$${v}`} a11y={{ title: "Monthly budget, over capacity" }} />
            <RatioRing value={null} max={1000} label="Not yet known" a11y={{ title: "Starting balance not entered" }} />
          </div>
        </div>

        <div className="admin-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            BurnChart (actual vs budget ceiling)
          </h2>
          <BurnChart actual={spend.map((p, i) => ({ x: p.x, y: p.y === null ? null : spend.slice(0, i + 1).reduce((s, q) => s + (q.y ?? 0), 0) }))} budget={280} a11y={{ title: "Cumulative spend vs monthly budget" }} />
        </div>

        <div className="admin-panel rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--admin-ink-1)" }}>
            Sparkline (inline, next to a number)
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold" style={{ color: "var(--admin-ink-1)" }}>
              $284
            </span>
            <Sparkline data={spend} a11y={{ title: "Spend trend, last 14 days" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
