"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MapPin, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addTargetUniversity } from "@/app/(app)/universities/actions";
import type { University } from "@/types/database";

export function UniversityCard({ university, isSaved }: { university: University; isSaved: boolean }) {
  const [saved, setSaved] = useState(isSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border p-5">
      <div>
        <Link href={`/universities/${university.id}`} className="font-semibold hover:underline">
          {university.name}
        </Link>
        {(university.city || university.country) && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {[university.city, university.country].filter(Boolean).join(", ")}
          </p>
        )}
        {university.institution_type ? <p className="mt-1 text-xs text-muted-foreground">{university.institution_type}</p> : null}
      </div>
      <div className="flex items-center gap-2">
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
  );
}
