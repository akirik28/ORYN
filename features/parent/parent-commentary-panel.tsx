"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateParentCommentaryIfDue } from "@/lib/parent/commentary-actions";
import type { ParentCommentaryEntry } from "@/lib/parent/commentary";
import type { Locale } from "@/lib/i18n/config";

/**
 * B3a/B3b (2026-09-04) -- the monthly commentary display CEO asked for on this page,
 * specifically NOT generated during the server render (measured: first token 20-58s away,
 * a parent cannot stare at a blank page that long). This component receives the server's own
 * verdict on whether generation is due (`entry`/`due`, computed in
 * app/parent/(dashboard)/progress/page.tsx) and, only when `due` is true, calls the Server
 * Action itself and shows an explicit "preparing" state until it resolves -- never a spinner
 * with no explanation, never a silent retry.
 *
 * `router.refresh()` after the action resolves re-runs the server page (which re-reads the
 * now-freshly-stored entry via getLatestParentCommentary), rather than this component holding
 * its own copy of the generated content -- one source of truth for what's actually stored,
 * matching the "show the recorded one, never regenerate within the window" instruction:
 * a second mount of this same component (e.g. a tab duplicated mid-generation) reads the same
 * due-or-not verdict from the server, not from anything cached client-side.
 */
export function ParentCommentaryPanel({
  entry,
  due,
  locale,
}: {
  entry: ParentCommentaryEntry | null;
  due: boolean;
  locale: Locale;
}) {
  const tr = locale === "tr";
  const router = useRouter();
  const [outcome, setOutcome] = useState<"not_premium" | "error" | null>(null);
  // A ref, not state -- a "run this once" guard is an external/imperative concern (has the
  // effect already fired), not a value the render function itself needs; setting it inside
  // the effect body as state would trip react-hooks/set-state-in-effect (a synchronous
  // setState at the top of an effect forces an extra render before the async work even
  // starts). A ref mutation triggers no re-render, which is exactly what this guard needs.
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!due || triggeredRef.current) return;
    triggeredRef.current = true;
    generateParentCommentaryIfDue().then((result) => {
      if (result.generated) {
        router.refresh();
      } else if (result.reason === "not_premium") {
        setOutcome("not_premium");
      } else if (!result.reason) {
        setOutcome("error");
      }
      // reason "no_link"/"not_due": the server already gated `due` correctly, so this
      // branch would mean the two disagreed -- leave the existing `entry` (if any) showing
      // rather than replacing it with a state the server-computed `due` didn't predict.
    });
  }, [due, router]);

  if (due && !outcome) {
    return (
      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--role-accent), var(--card) 92%)" }}
      >
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles className="size-4 animate-pulse" style={{ color: "var(--role-accent)" }} />
          {tr ? "Aylık özet hazırlanıyor" : "Preparing your monthly update"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {entry
            ? tr
              ? "Yeni bir özet hazırlanıyor, birazdan burada görünecek."
              : "A new update is on its way and will appear here shortly."
            : tr
              ? "Henüz ilk özet oluşmadı. Bir dakikadan kısa sürecek."
              : "There's no update yet — this should take less than a minute."}
        </p>
      </section>
    );
  }

  if (outcome === "not_premium") {
    return (
      <section className="rounded-2xl border p-6" style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--card), transparent 20%)" }}>
        <h2 className="mb-2 text-base font-semibold text-foreground">{tr ? "Aylık özet" : "Monthly update"}</h2>
        <p className="text-sm text-muted-foreground">
          {tr ? "Bu içerik şu anda kullanılabilir değil." : "This isn't currently available."}
        </p>
      </section>
    );
  }

  if (!entry) {
    return (
      <section className="rounded-2xl border p-6" style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--card), transparent 20%)" }}>
        <h2 className="mb-2 text-base font-semibold text-foreground">{tr ? "Aylık özet" : "Monthly update"}</h2>
        <p className="text-sm text-muted-foreground">
          {tr ? "Henüz ilk özet oluşmadı." : "There's no update yet."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border p-6" style={{ borderColor: "var(--role-surface-border)", background: "color-mix(in oklch, var(--card), transparent 20%)" }}>
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
        <Sparkles className="size-4" style={{ color: "var(--role-accent)" }} />
        {tr ? "Aylık özet" : "Monthly update"}
      </h2>
      <p className="text-sm text-muted-foreground">{entry.narrative}</p>
    </section>
  );
}
