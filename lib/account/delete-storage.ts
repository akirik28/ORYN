import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every Storage bucket whose objects are scoped to `{userId}/...` — the folder-prefix-
 * equals-owner convention every one of these buckets' RLS policies actually enforces (see
 * supabase/migrations/0015_storage_buckets.sql for evidence/cv-uploads,
 * 0058_social_posts.sql for post-media). `post-media` is included even though the posts
 * feature is currently switched off (lib/social/posts-feature-flag.ts) and the bucket
 * doesn't exist on every environment yet — this list describes the schema as designed, not
 * today's live subset, so the feature flag flipping on doesn't silently reopen this gap.
 *
 * Not derived automatically from the schema — nothing enforces this list staying complete
 * other than this comment and DATA_RIGHTS_AUDIT.md. Add a bucket here in the same commit
 * that gives it this same per-user-folder convention.
 *
 * `opportunity-images`/`university-images` are deliberately excluded: they're global,
 * foldered by opportunity/entity id rather than by student, and unrelated to any one
 * account's data.
 */
export const USER_OWNED_STORAGE_BUCKETS = ["evidence", "cv-uploads", "post-media"] as const;

/** The minimal slice of the admin Supabase client this module actually touches — narrowed
 * from the full `createAdminClient()` return type so a test can pass a plain object
 * implementing just `.storage.from(bucket).list()/.remove()` instead of a real client. */
export type StorageAdminClient = Pick<ReturnType<typeof createAdminClient>, "storage">;

/** One page's worth of names is more than any real account will ever have, but list()
 * defaults to 100 and this codebase should never silently stop at a default. */
const LIST_PAGE_SIZE = 1000;

/** `remove()` takes an unbounded array; chunking anyway rather than trusting an
 * undocumented server-side limit on how many paths one call can carry. */
const REMOVE_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export class StorageCleanupError extends Error {
  constructor(
    public readonly bucket: string,
    public readonly stage: "list" | "remove",
    cause: unknown
  ) {
    super(`Failed to ${stage} objects in "${bucket}" while cleaning up an account's storage.`, { cause });
  }
}

/**
 * Removes every Storage object under `{userId}/` in every user-owned bucket.
 *
 * Must run BEFORE the auth user (and therefore every database row that says which file
 * paths belonged to them) is deleted — reversed, there is no way left to know which paths
 * to remove, which is exactly the gap DATA_RIGHTS_AUDIT.md found: `deleteMyAccount()`
 * deleted the account and left every uploaded file behind, unreachable and unaccounted
 * for, forever.
 *
 * Throws `StorageCleanupError` on the first failure — listing or removing — rather than
 * skipping ahead to the next bucket or swallowing the error. The caller (`deleteMyAccount`)
 * must not proceed to delete the auth user when this throws: a partial cleanup reported to
 * the student as a complete deletion is worse than a deletion that visibly failed and can
 * be retried.
 */
export async function removeAllUserStorage(admin: StorageAdminClient, userId: string): Promise<void> {
  for (const bucket of USER_OWNED_STORAGE_BUCKETS) {
    const paths: string[] = [];
    let offset = 0;

    // Paginate rather than trust one page — a page short of LIST_PAGE_SIZE is the only
    // reliable "that was the last one" signal this API gives.
    for (;;) {
      const { data: objects, error: listError } = await admin.storage
        .from(bucket)
        .list(userId, { limit: LIST_PAGE_SIZE, offset });
      if (listError) throw new StorageCleanupError(bucket, "list", listError);

      for (const object of objects) paths.push(`${userId}/${object.name}`);
      if (objects.length < LIST_PAGE_SIZE) break;
      offset += LIST_PAGE_SIZE;
    }

    for (const batch of chunk(paths, REMOVE_CHUNK_SIZE)) {
      const { error: removeError } = await admin.storage.from(bucket).remove(batch);
      if (removeError) throw new StorageCleanupError(bucket, "remove", removeError);
    }
  }
}
