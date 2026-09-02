import { describe, expect, test, vi, beforeEach } from "vitest";

// 2026-09-01 — the weekly backstop for admission-outlook staleness. Read-time refresh
// (lib/universities/queries.ts) is the primary mechanism; this sweep exists for a student who
// never revisits the dashboard or Saved list after their profile changes. refreshAdmissionOutlook
// is mocked — its own gate/scoring logic is covered elsewhere.

vi.mock("@/lib/admissions/persist", () => ({ refreshAdmissionOutlook: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanStaleOutlooks } from "@/lib/admissions/scan";

/** target_universities' own query never calls `.in()` (see lib/admissions/scan.ts — it pages
 *  with `.order().range()` only); the shared `profilesResult` lookup lives in the separate
 *  `profiles` handler in makeAdmin below, not here. */
function builder(pages: Array<{ data: unknown; error?: unknown }>) {
  let call = 0;
  const b: Record<string, unknown> = {
    select: () => b,
    order: () => b,
    range: () => {
      const result = pages[call] ?? { data: [], error: null };
      call++;
      return Promise.resolve({ error: null, ...result });
    },
  };
  return b;
}

let profilesResult: { data: unknown; error?: unknown } = { data: [], error: null };

function makeAdmin(opts: { targetPages: Array<{ data: unknown; error?: unknown }>; profiles: unknown[] }) {
  profilesResult = { data: opts.profiles, error: null };
  // Built once per test and reused across every `.from("target_universities")` call — the scan
  // loop calls `.from()` fresh on each page, so a builder created *inside* that closure would
  // reset its own page-index counter every iteration and always hand back page 1, looping
  // forever whenever a page's length equals pageSize. Cost a real OOM crash to find.
  const targetUniversitiesBuilder = builder(opts.targetPages);
  return {
    from: (table: string) => {
      if (table === "target_universities") return targetUniversitiesBuilder;
      if (table === "profiles") return { select: () => ({ in: () => Promise.resolve(profilesResult) }) };
      return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
    },
  };
}

beforeEach(() => {
  vi.mocked(refreshAdmissionOutlook).mockReset();
  vi.mocked(createAdminClient).mockReset();
});

describe("scanStaleOutlooks", () => {
  test("refreshes a row whose outlook_calculated_at predates the student's profiles.updated_at", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        targetPages: [{ data: [{ id: "t1", user_id: "u1", outlook_calculated_at: "2026-08-01T00:00:00.000Z" }] }],
        profiles: [{ id: "u1", updated_at: "2026-08-20T00:00:00.000Z" }],
      }) as never
    );
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue({ outlook: "reach" } as never);

    const result = await scanStaleOutlooks();

    expect(refreshAdmissionOutlook).toHaveBeenCalledWith("t1", "u1", undefined, expect.anything());
    expect(result).toEqual({ checked: 1, refreshed: 1, refused: 0, failed: 0 });
  });

  test("skips a row whose outlook is newer than the profile", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        // outlook_model_version included and matching -- a genuinely fresh row is fresh on
        // both counts; omitting it here would make this row indistinguishable from the new
        // version-mismatch case below, which must NOT skip.
        targetPages: [{ data: [{ id: "t1", user_id: "u1", outlook_calculated_at: "2026-09-01T00:00:00.000Z", outlook_model_version: "admission_model_v1" }] }],
        profiles: [{ id: "u1", updated_at: "2026-08-20T00:00:00.000Z" }],
      }) as never
    );

    const result = await scanStaleOutlooks();

    expect(refreshAdmissionOutlook).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, refreshed: 0, refused: 0, failed: 0 });
  });

  test("counts a null (honesty-gate-refused) result separately from a failure", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        targetPages: [{ data: [{ id: "t1", user_id: "u1", outlook_calculated_at: null }] }],
        profiles: [{ id: "u1", updated_at: "2026-08-20T00:00:00.000Z" }],
      }) as never
    );
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue(null);

    const result = await scanStaleOutlooks();

    expect(result).toEqual({ checked: 1, refreshed: 0, refused: 1, failed: 0 });
  });

  test("one row throwing does not stop the rest of the page from being processed", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        targetPages: [
          {
            data: [
              { id: "t1", user_id: "u1", outlook_calculated_at: null },
              { id: "t2", user_id: "u2", outlook_calculated_at: null },
            ],
          },
        ],
        profiles: [
          { id: "u1", updated_at: "2026-08-20T00:00:00.000Z" },
          { id: "u2", updated_at: "2026-08-20T00:00:00.000Z" },
        ],
      }) as never
    );
    vi.mocked(refreshAdmissionOutlook).mockImplementation(async (id: string) => {
      if (id === "t1") throw new Error("transient DB error");
      return { outlook: "likely" } as never;
    });

    const result = await scanStaleOutlooks();

    expect(result).toEqual({ checked: 2, refreshed: 1, refused: 0, failed: 1 });
  });

  test("a target row with no matching profile is skipped rather than guessed at", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        targetPages: [{ data: [{ id: "t1", user_id: "orphan-user", outlook_calculated_at: null }] }],
        profiles: [], // no profile row for orphan-user
      }) as never
    );

    const result = await scanStaleOutlooks();

    expect(refreshAdmissionOutlook).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, refreshed: 0, refused: 0, failed: 0 });
  });

  // 2026-09-02, the version-tracking gap: mirrors the identical case added to
  // queries-outlook-refresh.test.ts for the read-time path -- both refresh paths share
  // lib/admissions/staleness.ts's isOutlookStale now, so both must catch this the same way.
  test("refreshes a fresh-timestamped row under a different model version — a profile OLDER than the row proves the version check, not the timestamp check, triggered it", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        targetPages: [{ data: [{ id: "t1", user_id: "u1", outlook_calculated_at: "2026-09-01T00:00:00.000Z", outlook_model_version: "admission_model_v0_hypothetical" }] }],
        profiles: [{ id: "u1", updated_at: "2026-08-01T00:00:00.000Z" }],
      }) as never
    );
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue({ outlook: "reach" } as never);

    const result = await scanStaleOutlooks();

    expect(refreshAdmissionOutlook).toHaveBeenCalledWith("t1", "u1", undefined, expect.anything());
    expect(result).toEqual({ checked: 1, refreshed: 1, refused: 0, failed: 0 });
  });

  test("paginates across multiple pages of target_universities", async () => {
    // scanStaleOutlooks(pageSize) takes an explicit page size specifically so a test can prove
    // real pagination without constructing hundreds of rows to hit the production default (500).
    const page1 = [
      { id: "t0", user_id: "u1", outlook_calculated_at: null },
      { id: "t1", user_id: "u1", outlook_calculated_at: null },
    ];
    const page2 = [{ id: "t2", user_id: "u1", outlook_calculated_at: null }];
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin({
        targetPages: [{ data: page1 }, { data: page2 }],
        profiles: [{ id: "u1", updated_at: "2026-08-20T00:00:00.000Z" }],
      }) as never
    );
    vi.mocked(refreshAdmissionOutlook).mockResolvedValue({ outlook: "likely" } as never);

    const result = await scanStaleOutlooks(2);

    expect(result.checked).toBe(3);
    expect(result.refreshed).toBe(3);
  });
});
