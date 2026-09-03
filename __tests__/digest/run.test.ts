import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/digest/run.ts — the periodic email digest batch runner
 * (docs/digest-email-design-2026-09-03.md). buildDigestContent is mocked directly (it has its
 * own coverage, __tests__/digest/build.test.ts) — this suite's job is proving the batch
 * runner's own contract: dry run writes nothing, a real run writes exactly one thing
 * (last_digest_sent_at), opted-out students are skipped before content is even built, and —
 * the single most important guarantee for a feature that isn't supposed to exist in production
 * yet — no code path here calls anything that could be an email-sending API. There is nothing
 * to mock for that because nothing in the module calls it; this suite proves the *shape* of
 * that guarantee (only ever a `profiles` update, never anything else) rather than asserting an
 * absence that can't be named in advance.
 */

interface Profile {
  id: string;
  digest_email_enabled: boolean;
  last_digest_sent_at: string | null;
}

const { buildDigestContentMock, profilesRef, updateMock } = vi.hoisted(() => ({
  buildDigestContentMock: vi.fn(),
  profilesRef: { current: [] as Profile[] },
  updateMock: vi.fn(),
}));

vi.mock("@/lib/digest/build", () => ({ buildDigestContent: buildDigestContentMock }));

function mockAdminClient() {
  return {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            limit: async () => ({ data: profilesRef.current, error: null }),
            in: (_col: string, ids: string[]) => ({
              limit: async () => ({ data: profilesRef.current.filter((p) => ids.includes(p.id)), error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              updateMock({ id, payload });
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`mockAdminClient: unhandled table "${table}"`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mockAdminClient() }));

const DIGEST_CONTENT = { deadlines: [{ title: "Economics Challenge", date: "2026-09-20", href: "/x" }], newMatches: [] };

beforeEach(() => {
  profilesRef.current = [];
  buildDigestContentMock.mockReset();
  buildDigestContentMock.mockResolvedValue(DIGEST_CONTENT);
  updateMock.mockClear();
});

describe("runDigestPass with dryRun: true (the default)", () => {
  test("builds real content but writes nothing at all", async () => {
    profilesRef.current = [{ id: "u-1", digest_email_enabled: true, last_digest_sent_at: null }];
    const { runDigestPass } = await import("@/lib/digest/run");

    const result = await runDigestPass({ dryRun: true, candidateIds: ["u-1"] });

    expect(buildDigestContentMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
    expect(result.wouldSend).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.rows).toEqual([{ userId: "u-1", outcome: "would_send", content: DIGEST_CONTENT }]);
  });

  test("the identical mocked setup DOES write when dryRun is false, so the first test can't pass by construction", async () => {
    profilesRef.current = [{ id: "u-1", digest_email_enabled: true, last_digest_sent_at: null }];
    const { runDigestPass } = await import("@/lib/digest/run");

    const result = await runDigestPass({ dryRun: false, candidateIds: ["u-1"] });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const call = updateMock.mock.calls[0][0] as { id: string; payload: Record<string, unknown> };
    expect(call.id).toBe("u-1");
    // Exactly one key, on exactly the one column this module is allowed to touch — a future
    // change that starts writing anything else here (or that starts calling a send API) would
    // need to change this assertion, which is the point: it can't happen silently.
    expect(Object.keys(call.payload)).toEqual(["last_digest_sent_at"]);
    expect(result.sent).toBe(1);
    expect(result.rows).toBeUndefined(); // same "rows only on a dry run" contract as retention.ts
  });
});

describe("runDigestPass — opted-out students never reach content building", () => {
  test("digest_email_enabled: false skips before buildDigestContent is even called", async () => {
    profilesRef.current = [{ id: "u-optout", digest_email_enabled: false, last_digest_sent_at: null }];
    const { runDigestPass } = await import("@/lib/digest/run");

    const result = await runDigestPass({ dryRun: true, candidateIds: ["u-optout"] });

    expect(buildDigestContentMock).not.toHaveBeenCalled();
    expect(result.skippedOptedOut).toBe(1);
    expect(result.rows).toEqual([{ userId: "u-optout", outcome: "skipped_opted_out", content: null }]);
  });
});

describe("runDigestPass — no content to send", () => {
  test("a student with nothing to report is skipped, not sent an empty digest", async () => {
    profilesRef.current = [{ id: "u-nothing", digest_email_enabled: true, last_digest_sent_at: null }];
    buildDigestContentMock.mockResolvedValue(null);
    const { runDigestPass } = await import("@/lib/digest/run");

    const result = await runDigestPass({ dryRun: true, candidateIds: ["u-nothing"] });

    expect(result.skippedNoContent).toBe(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("runDigestPass — this module never touches anything but the profiles table", () => {
  test("mockAdminClient throws on any table access this module doesn't expect — proves no hidden call to an email/messaging table exists", async () => {
    // mockAdminClient() above throws for any table name other than "profiles" — a real send
    // mechanism (an email queue table, a provider client) would necessarily call .from() on
    // something else, which would fail this entire suite immediately rather than silently
    // passing. All four tests above already exercise this implicitly; stated as its own test
    // so the guarantee has a name, not just an accidental side effect of the other assertions.
    profilesRef.current = [{ id: "u-1", digest_email_enabled: true, last_digest_sent_at: null }];
    const { runDigestPass } = await import("@/lib/digest/run");
    await expect(runDigestPass({ dryRun: false, candidateIds: ["u-1"] })).resolves.toBeDefined();
  });
});
