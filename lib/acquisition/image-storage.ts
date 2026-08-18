/**
 * Storage + optimization layer for acquired university images.
 *
 * Database rows never hold image bytes — Postgres/PostgREST rows stay metadata-only (a URL plus
 * provenance), per the image-acquisition spec's explicit "don't store blobs in the core DB"
 * rule. This module is the only place that touches actual image bytes: resize/re-encode via
 * `sharp`, hash for dedup, and upload to a dedicated public Supabase Storage bucket.
 *
 * No RLS/signed-URL layer the way evidence/cv-uploads have one (see 0015_storage_buckets.sql):
 * these are public campus photos and institution logos, the same "global public data" carve-out
 * `universities` itself already gets (Phase 31 — private-by-default is a rule about *student*
 * data, not public institutional marketing imagery).
 *
 * The bucket is created via the Storage Admin API (`storage.createBucket`), not a SQL migration
 * — an authenticated HTTP call through the service-role key, so this works even in a session
 * with no direct Postgres/DDL access (see docs/founder-blocked-backlog.md). Idempotent: safe to
 * call at the start of every run.
 *
 * Deliberately NOT `server-only` — used from a plain `tsx` acquisition script, same constraint
 * as ror.ts/wikimedia.ts/opengraph.ts.
 */

import { createHash } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

export const UNIVERSITY_IMAGES_BUCKET = "university-images";
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

export interface OptimizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  /** sha256 of the ORIGINAL downloaded bytes, before resize/re-encode — so two acquisitions of
   * the exact same source photo (e.g. the same Commons file mistakenly linked from two
   * universities' Wikidata items) hash identically regardless of this run's own output
   * settings. The duplicate-assignment check in the acquisition script relies on this. */
  checksum: string;
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Downscale-only resize (never upscales a smaller source), EXIF orientation applied then
 * stripped on output, re-encoded to WebP. One derivative serves both the card and the
 * detail-page hero — next/image's own on-demand optimizer handles further responsive resizing
 * from this single source (see next.config.ts's remotePatterns), so a second explicit "hero"
 * derivative isn't needed.
 */
export async function optimizeImage(original: Buffer, maxWidth = MAX_WIDTH): Promise<OptimizedImage> {
  const checksum = sha256Hex(original);
  const oriented = sharp(original).rotate();
  const metadata = await oriented.metadata();
  const pipeline = (metadata.width ?? 0) > maxWidth ? oriented.resize({ width: maxWidth, withoutEnlargement: true }) : oriented;
  const { data, info } = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height, checksum };
}

/** Idempotent bucket creation — treats "already exists" as success rather than an error. */
export async function ensureUniversityImagesBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(UNIVERSITY_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/webp"],
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Couldn't ensure the ${UNIVERSITY_IMAGES_BUCKET} storage bucket exists: ${error.message}`);
  }
}

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Uploads optimized bytes and returns the public URL to store as `primary_image_url` (or, for a
 * logo, to write directly into `universities.logo_url`). `kind` only picks the storage path
 * convention — a university's campus and logo images never collide. `upsert: true` so a re-run
 * (a corrected candidate, or a scheduled refresh) replaces the existing file at the same stable
 * path rather than accumulating orphaned versions.
 */
export async function uploadUniversityImage(admin: SupabaseClient, universityId: string, kind: "campus" | "logo", buffer: Buffer): Promise<UploadResult> {
  const storagePath = `${universityId}/${kind}.webp`;
  const { error } = await admin.storage.from(UNIVERSITY_IMAGES_BUCKET).upload(storagePath, buffer, {
    contentType: "image/webp",
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
  const { data } = admin.storage.from(UNIVERSITY_IMAGES_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

type HeadFetch = (url: string, init?: { method?: string }) => Promise<{ ok: boolean }>;

/**
 * Confirms the just-uploaded public URL actually serves before it's written as a fact anywhere
 * — this is the mechanism that keeps "Broken: 0" true structurally rather than by hope. A
 * university whose upload fails this check gets no `primary_image_url` row at all this run
 * (falls back to logo/placeholder in the UI) instead of a URL nothing has confirmed works.
 */
export async function verifyPublicUrlServes(url: string, fetchImpl: HeadFetch = globalThis.fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
