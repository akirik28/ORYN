"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Landmark } from "lucide-react";

/**
 * University detail page hero. Same three-tier fallback as `UniversityCard`'s identity band
 * (verified campus photo → `logo_url` → a plain gradient mark), scaled up to a full banner —
 * previously this only had the first tier and rendered nothing at all otherwise, so most
 * university detail pages (photo coverage is real but partial) opened straight into
 * `PageHeader` with no visual anchor, while their own list card one screen away already had a
 * branded identity band. The outer banner shape is now unconditional — what fills it depends
 * on what data exists, but there's always something, matching every other page this session's
 * "premium, never-naked" hero rule (Discovery, Opportunity Detail).
 *
 * A Client Component only because `next/image`'s `onError` needs one; the parent page stays a
 * Server Component. `logo_url` renders through a plain `<img>`, not `next/image` — same reason
 * `UniversityCard` does: it can point at an arbitrary official university domain, and
 * `next/image` requires every remote host allow-listed ahead of time.
 */
export function DetailHeroImage({
  photoUrl,
  logoUrl,
  name,
  caption,
}: {
  photoUrl: string | null;
  logoUrl: string | null;
  name: string;
  caption?: ReactNode;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const showPhoto = photoUrl && !photoFailed;
  const showLogo = !showPhoto && logoUrl && !logoFailed;

  return (
    <div className="space-y-1.5">
      <div className="relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary-subtle to-brand-primary-soft sm:aspect-[3/1]">
        {showPhoto ? (
          <Image src={photoUrl} alt={`Main campus of ${name}`} fill sizes="100vw" priority className="object-cover" onError={() => setPhotoFailed(true)} />
        ) : showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="max-h-[40%] max-w-[50%] object-contain" onError={() => setLogoFailed(true)} />
        ) : (
          <Landmark className="size-12 text-brand-primary-strong/50" aria-hidden />
        )}
      </div>
      {/* The attribution/license caption only ever describes the verified photo tier — never
          shown under the logo or icon fallback, which have no such provenance to cite. */}
      {showPhoto ? caption : null}
    </div>
  );
}
