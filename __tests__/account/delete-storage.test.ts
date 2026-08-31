import { describe, expect, test } from "vitest";
import {
  removeAllUserStorage,
  StorageCleanupError,
  USER_OWNED_STORAGE_BUCKETS,
  type StorageAdminClient,
} from "@/lib/account/delete-storage";

const USER_ID = "11111111-1111-1111-1111-111111111111";

/**
 * A minimal fake of the admin client's `.storage.from(bucket).list()/.remove()` surface —
 * `StorageAdminClient` is narrowed to exactly this slice for precisely this reason: no
 * real Supabase client, network call, or project credential is involved in these tests.
 * `listImpl`/`removeImpl` are called with the same arguments the real SDK would receive,
 * so a test can assert on them directly.
 */
function fakeAdmin(params: {
  listImpl: (
    bucket: string,
    prefix: string,
    opts: { limit: number; offset: number }
  ) => Promise<{ data: { name: string }[] | null; error: unknown }>;
  removeImpl?: (bucket: string, paths: string[]) => Promise<{ data: unknown; error: unknown }>;
}): StorageAdminClient {
  const removeImpl = params.removeImpl ?? (async () => ({ data: [], error: null }));
  return {
    storage: {
      from: (bucket: string) => ({
        list: (prefix: string, opts: { limit: number; offset: number }) => params.listImpl(bucket, prefix, opts),
        remove: (paths: string[]) => removeImpl(bucket, paths),
      }),
    },
  } as unknown as StorageAdminClient;
}

describe("removeAllUserStorage", () => {
  test("every user-owned bucket is attempted when all are empty — no remove() call needed", async () => {
    const listCalls: string[] = [];
    const removeCalls: string[] = [];
    const admin = fakeAdmin({
      listImpl: async (bucket) => {
        listCalls.push(bucket);
        return { data: [], error: null };
      },
      removeImpl: async (bucket) => {
        removeCalls.push(bucket);
        return { data: [], error: null };
      },
    });

    await expect(removeAllUserStorage(admin, USER_ID)).resolves.toBeUndefined();
    expect(listCalls).toEqual([...USER_OWNED_STORAGE_BUCKETS]);
    expect(removeCalls).toEqual([]); // nothing to remove, so remove() is never called
  });

  test("removes every listed object, building the full {userId}/{name} path", async () => {
    const removedPaths: Record<string, string[]> = {};
    const admin = fakeAdmin({
      listImpl: async (bucket) =>
        bucket === "evidence"
          ? { data: [{ name: "1787-cert.pdf" }, { name: "1788-award.pdf" }], error: null }
          : { data: [], error: null },
      removeImpl: async (bucket, paths) => {
        removedPaths[bucket] = paths;
        return { data: [], error: null };
      },
    });

    await removeAllUserStorage(admin, USER_ID);

    expect(removedPaths["evidence"]).toEqual([`${USER_ID}/1787-cert.pdf`, `${USER_ID}/1788-award.pdf`]);
    expect(removedPaths["cv-uploads"]).toBeUndefined(); // empty bucket, remove() never called for it
  });

  test("paginates: a full first page triggers a second list() call, and both pages' objects are removed together", async () => {
    const listOffsets: number[] = [];
    const removedPaths: string[] = [];
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({ name: `file-${i}.pdf` }));

    const admin = fakeAdmin({
      listImpl: async (bucket, _prefix, opts) => {
        if (bucket !== "evidence") return { data: [], error: null };
        listOffsets.push(opts.offset);
        // First page: exactly 1000 (the page size) -> must trigger a second call.
        // Second page: short of 1000 -> that's the pagination-complete signal.
        return opts.offset === 0 ? { data: fullPage, error: null } : { data: [{ name: "last.pdf" }], error: null };
      },
      removeImpl: async (_bucket, paths) => {
        removedPaths.push(...paths);
        return { data: [], error: null };
      },
    });

    await removeAllUserStorage(admin, USER_ID);

    expect(listOffsets).toEqual([0, 1000]); // exactly two pages fetched
    expect(removedPaths).toHaveLength(1001); // 1000 from page 1 + 1 from page 2
    expect(removedPaths).toContain(`${USER_ID}/last.pdf`);
  });

  test("chunks remove() calls rather than sending an unbounded array in one request", async () => {
    const removeCallSizes: number[] = [];
    const manyFiles = Array.from({ length: 250 }, (_, i) => ({ name: `f${i}.pdf` }));
    const admin = fakeAdmin({
      listImpl: async (bucket) => (bucket === "evidence" ? { data: manyFiles, error: null } : { data: [], error: null }),
      removeImpl: async (_bucket, paths) => {
        removeCallSizes.push(paths.length);
        return { data: [], error: null };
      },
    });

    await removeAllUserStorage(admin, USER_ID);

    expect(removeCallSizes).toEqual([100, 100, 50]); // 250 objects, chunk size 100
  });

  test("a list() failure throws StorageCleanupError and never calls remove()", async () => {
    let removeCalled = false;
    const admin = fakeAdmin({
      listImpl: async (bucket) =>
        bucket === "evidence" ? { data: null, error: new Error("network blip") } : { data: [], error: null },
      removeImpl: async () => {
        removeCalled = true;
        return { data: [], error: null };
      },
    });

    await expect(removeAllUserStorage(admin, USER_ID)).rejects.toBeInstanceOf(StorageCleanupError);
    expect(removeCalled).toBe(false);
  });

  test("a remove() failure throws StorageCleanupError with the failing bucket and stage", async () => {
    const admin = fakeAdmin({
      listImpl: async (bucket) =>
        bucket === "cv-uploads" ? { data: [{ name: "cv.pdf" }], error: null } : { data: [], error: null },
      removeImpl: async (bucket) =>
        bucket === "cv-uploads" ? { data: null, error: new Error("permission denied") } : { data: [], error: null },
    });

    const result = removeAllUserStorage(admin, USER_ID);
    await expect(result).rejects.toBeInstanceOf(StorageCleanupError);
    await result.catch((error: StorageCleanupError) => {
      expect(error.bucket).toBe("cv-uploads");
      expect(error.stage).toBe("remove");
    });
  });

  test("a failure on the first bucket stops processing — later buckets are never even listed", async () => {
    // USER_OWNED_STORAGE_BUCKETS is ["evidence", "cv-uploads", "post-media"]; failing on
    // "evidence" (the first) must mean "cv-uploads" and "post-media" are never touched.
    // This is the behavior deleteMyAccount() depends on to know cleanup is all-or-nothing
    // per call, not "some buckets silently succeeded, one didn't."
    const attemptedBuckets: string[] = [];
    const admin = fakeAdmin({
      listImpl: async (bucket) => {
        attemptedBuckets.push(bucket);
        if (bucket === "evidence") return { data: null, error: new Error("down") };
        return { data: [], error: null };
      },
    });

    await expect(removeAllUserStorage(admin, USER_ID)).rejects.toThrow();
    expect(attemptedBuckets).toEqual(["evidence"]);
  });

  test("USER_OWNED_STORAGE_BUCKETS includes post-media even though that feature is switched off — the schema-as-designed, not today's live subset", () => {
    expect(USER_OWNED_STORAGE_BUCKETS).toContain("post-media");
    expect(USER_OWNED_STORAGE_BUCKETS).toContain("evidence");
    expect(USER_OWNED_STORAGE_BUCKETS).toContain("cv-uploads");
  });
});

describe("StorageCleanupError", () => {
  test("carries the bucket, stage, and original cause for logging", () => {
    const cause = new Error("boom");
    const error = new StorageCleanupError("evidence", "list", cause);
    expect(error.bucket).toBe("evidence");
    expect(error.stage).toBe("list");
    expect(error.cause).toBe(cause);
    expect(error.message).toContain("evidence");
  });
});
