"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MapPin, Bookmark, BookmarkCheck, Landmark, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addTargetUniversity } from "@/app/(app)/universities/actions";
import type { University } from "@/types/database";

// Larger, calmer card (founder direction: "fewer larger cards ... not a dense database
// row") — a visual identity band up top (the university's real `logo_url` when the data
// has one, never a fabricated photo otherwise — Rule 4 forbids inventing imagery this
// product has no actual source for) instead of packing every field into a small row.
export function UniversityCard({
  university,
  isSaved,
  qsRank,
}: {
  university: University;
  isSaved: boolean;
  /** QS 2027 rank_display for this university, when it has one (e.g. "1", "=2", "601-610"). */
  qsRank?: string | null;
}) {
  const [saved, setSaved] = useState(isSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-brand-primary-subtle to-brand-primary-soft">
        {university.logo_url ? (
          // Plain <img>, not next/image: logo_url can point at any official university
          // domain (unbounded, admin/sync-populated) — Next's <Image> requires every
          // remote hostname allow-listed in next.config.ts ahead of time, which doesn't
          // fit a source this open-ended without an overly broad wildcard. Next only
          // optimizes/proxies through its own remote-image pipeline; a plain <img> has no
          // such restriction and still renders the real logo when one exists.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={university.logo_url} alt="" className="max-h-full max-w-full object-contain p-6" />
        ) : (
          <Landmark className="size-9 text-brand-primary-strong/60" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="space-y-1">
          <Link href={`/universities/${university.id}`} className="font-heading text-lg font-medium leading-snug hover:underline">
            {university.name}
          </Link>
          {(university.city || university.country) && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {[university.city, university.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {(qsRank || university.student_size || university.institution_type) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {qsRank ? (
              <span className="flex items-center gap-1">
                <Trophy className="size-3.5 shrink-0" />
                QS #{qsRank}
              </span>
            ) : null}
            {university.student_size ? (
              <span className="flex items-center gap-1">
                <Users className="size-3.5 shrink-0" />
                {university.student_size.toLocaleString()} students
              </span>
            ) : null}
          </div>
        )}

        {university.institution_type ? (
          <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{university.institution_type}</span>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" render={<Link href={`/universities/${university.id}`} />} nativeButton={false}>
            Details
          </Button>
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            disabled={isPending || saved}
            onClick={() =>
              startTransition(async () => {
                const result = await addTargetUniversity(university.id);
                if (!result.error) setSaved(true);
              })
            }
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
