"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";

/**
 * University detail page hero — a verified campus photo (`primary_image_url`) plus its
 * attribution/license caption, rendered as one unit so a failed image load hides both rather
 * than leaving an orphaned caption under nothing (P0 "broken image protection"). A Client
 * Component only because `next/image`'s `onError` needs one; the parent page stays a Server
 * Component and simply doesn't render this at all when there's no verified photo yet — no
 * placeholder banner, matching how every other optional section on this page already behaves.
 */
export function DetailHeroImage({ src, alt, caption }: { src: string; alt: string; caption?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="space-y-1.5">
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[3/1]">
        <Image src={src} alt={alt} fill sizes="100vw" priority className="object-cover" onError={() => setFailed(true)} />
      </div>
      {caption}
    </div>
  );
}
