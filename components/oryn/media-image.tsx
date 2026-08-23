"use client";

import { useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The product's one image surface (UI-V3 § 19/30). Imagery here comes from sources we
 * don't control — a re-hosted campus photo, an organizer's logo on their own domain, a
 * programme's own page — so "the image 404s" is a normal state, not an exception, and
 * every call site needs the same three-step answer to it.
 *
 * The chain is deliberate and never fabricates:
 *   1. `src`         — a verified photo of the actual place/programme.
 *   2. `fallbackSrc` — an institutional logo. Rendered as a plain `<img>`, contained not
 *                      cropped: these live on arbitrary official domains, and `next/image`
 *                      requires every remote host allow-listed in next.config.ts up front,
 *                      which this source is too open-ended for without a wildcard we don't
 *                      want. (Carried over from university-card, where this was learned.)
 *   3. designed fallback — a brand-washed field with a monogram or icon.
 *
 * Step 3 is the point of the component. The rule from the brief is "no broken image
 * placeholders", and the tempting shortcut — a generic stock photo of students, or a grey
 * box — breaks a different rule: it implies we have a picture of this thing when we don't.
 * A monogram is honestly nothing-but-identity, so it can never mislead.
 *
 * Callers set the aspect ratio via `className` on the wrapper (e.g. `aspect-[3/2]`) so one
 * component serves a card thumbnail and a detail hero without a size enum.
 */
export function MediaImage({
  src,
  fallbackSrc,
  alt,
  monogram,
  icon: Icon,
  sizes = "100vw",
  priority = false,
  className,
  imageClassName,
}: {
  src?: string | null;
  /** Usually a logo. Contained, not cropped — a cropped logo reads as a broken image. */
  fallbackSrc?: string | null;
  /** Empty string is correct when the image is decorative beside a visible label. */
  alt: string;
  /** Initials for the designed fallback. Trimmed to two characters. */
  monogram?: string | null;
  /** Shown instead of a monogram when there's no sensible name to reduce. */
  icon?: LucideIcon;
  sizes?: string;
  priority?: boolean;
  /** Set the aspect ratio and any rounding here. */
  className?: string;
  imageClassName?: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const showPhoto = Boolean(src) && !photoFailed;
  const showLogo = !showPhoto && Boolean(fallbackSrc) && !logoFailed;
  const initials = (monogram ?? "").trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-brand-primary-subtle to-brand-primary-soft",
        className,
      )}
    >
      {showPhoto ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imageClassName)}
          onError={() => setPhotoFailed(true)}
        />
      ) : showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackSrc!}
          alt={alt}
          className="max-h-[70%] max-w-[70%] object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : initials ? (
        // aria-hidden: the monogram is a visual stand-in for a name the surrounding card
        // already states in full. Announcing "LS" before "London School of Economics"
        // is noise, not information.
        <span aria-hidden="true" className="font-display text-3xl text-brand-primary-strong/45 select-none">
          {initials}
        </span>
      ) : Icon ? (
        <Icon className="size-8 text-brand-primary-strong/45" aria-hidden="true" />
      ) : null}
    </div>
  );
}
