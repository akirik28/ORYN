import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyReview } from "@/lib/scoring/monthly-review";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";

export const metadata = { title: "Progress" };

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3.5" /> 0
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
      {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {positive ? "+" : ""}
      {delta}
    </span>
  );
}

export default async function ProgressPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const review = await getMonthlyReview(supabase, session.userId!);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Progress</h1>
        <p className="mt-1 text-muted-foreground">How your profile has changed over the last {review.windowDays} days.</p>
      </div>

      {!review.hasHistory ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Not enough history yet — check back after your profile has had a chance to change over a few weeks.
            {review.overallAfter !== null ? ` Your current Career Profile score is ${review.overallAfter}/100.` : ""}
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-card p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall Career Profile</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-semibold tracking-tight">{review.overallAfter}</span>
              <span className="text-sm text-muted-foreground">was {review.overallBefore}</span>
              {review.overallDelta !== null ? <DeltaBadge delta={review.overallDelta} /> : null}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">By dimension</h2>
            <ul className="divide-y rounded-xl border">
              {review.dimensionDeltas.map((d) => (
                <li key={d.dimension} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{DIMENSION_LABELS[d.dimension]}</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    {d.before} → {d.after}
                    <DeltaBadge delta={d.delta} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-5">
              <p className="text-2xl font-semibold tracking-tight">{review.projectsCompletedRecently}</p>
              <p className="text-sm text-muted-foreground">Projects marked complete in the last {review.windowDays} days</p>
            </div>
            <div className="rounded-xl border p-5">
              <p className="text-2xl font-semibold tracking-tight">{review.applicationsSubmittedRecently}</p>
              <p className="text-sm text-muted-foreground">Applications submitted or updated in the last {review.windowDays} days</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
