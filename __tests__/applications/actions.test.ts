import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Component-level coverage for app/(app)/applications/actions.ts — zero tests existed for
 * five server actions that all write student data, per CEO's assignment 2026-09-02.
 *
 * Mocking @/lib/supabase/server's createClient() the same way
 * __tests__/settings/delete-my-account.test.ts already does for deleteMyAccount() — a
 * request-scoped client backed by next/headers' cookies() has no live equivalent in this
 * environment, so every table interaction below is a configurable fake query builder, not
 * a real Postgres round trip. Each builder is `.from(table)`-keyed and PromiseLike (a bare
 * `await supabase.from(x).insert(y)` with no `.select()` must resolve, matching every
 * update/plain-insert call in the file under test), not just chainable.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: vi.fn() }));

type TableResult = { data?: unknown; error?: { message: string } | null };
type Resolved = { data: unknown; error: { message: string } | null };

interface TableBuilder extends PromiseLike<Resolved> {
  insert: ReturnType<typeof vi.fn<(payload: unknown) => TableBuilder>>;
  update: ReturnType<typeof vi.fn<(payload: unknown) => TableBuilder>>;
  select: ReturnType<typeof vi.fn<() => TableBuilder>>;
  eq: ReturnType<typeof vi.fn<(column: string, value: unknown) => TableBuilder>>;
  single: ReturnType<typeof vi.fn<() => Promise<Resolved>>>;
}

function makeTableBuilder(result: TableResult) {
  const eqCalls: [string, unknown][] = [];
  const resolved: Resolved = { data: result.data ?? null, error: result.error ?? null };
  const builder = {
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return builder;
    }),
    single: vi.fn(() => Promise.resolve(resolved)),
    then: <TResult1 = Resolved, TResult2 = never>(
      onFulfilled?: ((value: Resolved) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) => Promise.resolve(resolved).then(onFulfilled, onRejected),
  } as TableBuilder;
  return { builder, eqCalls };
}

/** One fake client per test: `tables` maps a table name to the canned result its builder
 * resolves to. `fromCalls` records every table name actually queried, in order — used to
 * assert the requirements insert never runs after a failed applications insert, and that
 * createApplication never queries target_universities at all (the ownership question). */
function makeSupabase(tables: Record<string, TableResult>) {
  const fromCalls: string[] = [];
  const builders = new Map<string, ReturnType<typeof makeTableBuilder>>();
  for (const [table, result] of Object.entries(tables)) {
    builders.set(table, makeTableBuilder(result));
  }
  return {
    client: {
      from: vi.fn((table: string) => {
        fromCalls.push(table);
        const found = builders.get(table);
        if (!found) throw new Error(`test setup gap: no builder configured for table "${table}"`);
        return found.builder;
      }),
    },
    fromCalls,
    eqCallsFor: (table: string) => builders.get(table)!.eqCalls,
  };
}

let currentSupabase: ReturnType<typeof makeSupabase>;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => currentSupabase.client,
}));

import { createApplication, updateApplicationStatus, updateRequirementStatus, updateApplicationNotes, updateRequirementNotes } from "@/app/(app)/applications/actions";
import { requireUser } from "@/lib/security/dal";
import { logEvent } from "@/lib/analytics/log";
import { revalidatePath } from "next/cache";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const APPLICATION_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  vi.mocked(logEvent).mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("createApplication", () => {
  test("both inserts succeed: returns the new id, no error logged", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    currentSupabase = makeSupabase({
      applications: { data: { id: APPLICATION_ID } },
      application_requirements: { data: null },
    });

    const result = await createApplication({ targetUniversityId: "target-1", applicationType: "regular_decision", deadline: "2027-01-15" });

    expect(result).toEqual({ applicationId: APPLICATION_ID });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("applications insert fails: returns the generic error, never attempts the requirements insert", async () => {
    currentSupabase = makeSupabase({
      applications: { data: null, error: { message: "insert violates not-null constraint" } },
      application_requirements: { data: null },
    });

    const result = await createApplication({ targetUniversityId: "target-1", applicationType: "regular_decision", deadline: null });

    expect(result).toEqual({ error: "Couldn't create application." });
    expect(currentSupabase.fromCalls).toEqual(["applications"]);
  });

  test("applications insert succeeds but the default-checklist insert fails: the application is still reported created — the best-effort degrade CEO asked to verify, not just trust", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    currentSupabase = makeSupabase({
      applications: { data: { id: APPLICATION_ID } },
      application_requirements: { data: null, error: { message: "connection reset" } },
    });

    const result = await createApplication({ targetUniversityId: "target-1", applicationType: "regular_decision", deadline: null });

    expect(result).toEqual({ applicationId: APPLICATION_ID });
    expect(consoleError).toHaveBeenCalledWith(
      "[applications] application created, but default checklist failed to save",
      expect.objectContaining({ applicationId: APPLICATION_ID, error: "connection reset" })
    );
    consoleError.mockRestore();
  });

  test("the default checklist is exactly the eight Phase 22 requirement types, each not_started with no title/notes", async () => {
    currentSupabase = makeSupabase({
      applications: { data: { id: APPLICATION_ID } },
      application_requirements: { data: null },
    });

    await createApplication({ targetUniversityId: "target-1", applicationType: "early_decision", deadline: null });

    const requirementsBuilder = currentSupabase.client.from("application_requirements");
    const insertedRows = vi.mocked(requirementsBuilder.insert).mock.calls[0][0] as { requirement_type: string; status: string; title: unknown; notes: unknown; application_id: string; user_id: string }[];
    expect(insertedRows).toHaveLength(8);
    expect(insertedRows.map((r) => r.requirement_type)).toEqual(["application", "transcript", "test_score", "essay", "recommendation", "portfolio", "interview", "financial_aid"]);
    expect(insertedRows.every((r) => r.status === "not_started" && r.title === null && r.notes === null && r.application_id === APPLICATION_ID && r.user_id === USER_ID)).toBe(true);
  });

  test("does not verify that targetUniversityId belongs to the caller — no query against target_universities happens at all", async () => {
    // Documents the finding from CEO's ownership question rather than leaving it as a
    // claim in a chat message: createApplication trusts params.targetUniversityId
    // unconditionally. Real coverage that this is CURRENT behavior, not a guess about it —
    // if a future edit adds an ownership check, this test fails and has to be updated
    // deliberately, which is the point. The actual mitigation lives one layer down, in
    // target_universities' RLS ("owner full access", user_id = auth.uid()) blocking any
    // read-back of a foreign target — not in this function, and not in the FK
    // (applications_target_university_id_fkey only guarantees the row exists, not who
    // owns it) — confirmed live against oryn-qa-scratch, not assumed.
    currentSupabase = makeSupabase({
      applications: { data: { id: APPLICATION_ID } },
      application_requirements: { data: null },
    });

    await createApplication({ targetUniversityId: "someone-elses-target-row", applicationType: "regular_decision", deadline: null });

    expect(currentSupabase.fromCalls).not.toContain("target_universities");
  });
});

describe("updateApplicationStatus", () => {
  test("success: scopes the update to id AND user_id, logs the event, revalidates both paths", async () => {
    currentSupabase = makeSupabase({ applications: { data: null } });

    const result = await updateApplicationStatus(APPLICATION_ID, "submitted");

    expect(result).toEqual({});
    expect(currentSupabase.eqCallsFor("applications")).toEqual([
      ["id", APPLICATION_ID],
      ["user_id", USER_ID],
    ]);
    expect(logEvent).toHaveBeenCalledWith(USER_ID, "application_updated", { applicationId: APPLICATION_ID, status: "submitted" });
    expect(revalidatePath).toHaveBeenCalledWith("/applications");
    expect(revalidatePath).toHaveBeenCalledWith(`/applications/${APPLICATION_ID}`);
  });

  test("failure: returns the error, never logs the event or revalidates", async () => {
    currentSupabase = makeSupabase({ applications: { data: null, error: { message: "row not found" } } });

    const result = await updateApplicationStatus(APPLICATION_ID, "submitted");

    expect(result).toEqual({ error: "Couldn't update status." });
    expect(logEvent).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateRequirementStatus", () => {
  const REQUIREMENT_ID = "33333333-3333-3333-3333-333333333333";

  test("success: scopes to id AND user_id, revalidates the layout", async () => {
    currentSupabase = makeSupabase({ application_requirements: { data: null } });

    const result = await updateRequirementStatus(REQUIREMENT_ID, "completed");

    expect(result).toEqual({});
    expect(currentSupabase.eqCallsFor("application_requirements")).toEqual([
      ["id", REQUIREMENT_ID],
      ["user_id", USER_ID],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/applications", "layout");
  });

  test("failure: returns the error, does not revalidate", async () => {
    currentSupabase = makeSupabase({ application_requirements: { data: null, error: { message: "row not found" } } });

    const result = await updateRequirementStatus(REQUIREMENT_ID, "completed");

    expect(result).toEqual({ error: "Couldn't update requirement." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateApplicationNotes", () => {
  test("trims whitespace before saving", async () => {
    currentSupabase = makeSupabase({ applications: { data: null } });

    await updateApplicationNotes(APPLICATION_ID, "  applying with a strong SAT score  ");

    const builder = currentSupabase.client.from("applications");
    expect(vi.mocked(builder.update).mock.calls[0][0]).toEqual({ notes: "applying with a strong SAT score" });
  });

  test("an empty-after-trim string saves as null, not an empty string — the single representation of \"no note\"", async () => {
    currentSupabase = makeSupabase({ applications: { data: null } });

    await updateApplicationNotes(APPLICATION_ID, "    ");

    const builder = currentSupabase.client.from("applications");
    expect(vi.mocked(builder.update).mock.calls[0][0]).toEqual({ notes: null });
  });

  test("failure: returns the notes-specific error", async () => {
    currentSupabase = makeSupabase({ applications: { data: null, error: { message: "row not found" } } });

    const result = await updateApplicationNotes(APPLICATION_ID, "note");

    expect(result).toEqual({ error: "Couldn't save your note." });
  });
});

describe("updateRequirementNotes", () => {
  const REQUIREMENT_ID = "33333333-3333-3333-3333-333333333333";

  test("trims whitespace and scopes to id AND user_id", async () => {
    currentSupabase = makeSupabase({ application_requirements: { data: null } });

    await updateRequirementNotes(REQUIREMENT_ID, "  need to request this from my counselor  ");

    const builder = currentSupabase.client.from("application_requirements");
    expect(vi.mocked(builder.update).mock.calls[0][0]).toEqual({ notes: "need to request this from my counselor" });
    expect(currentSupabase.eqCallsFor("application_requirements")).toEqual([
      ["id", REQUIREMENT_ID],
      ["user_id", USER_ID],
    ]);
  });

  test("an empty-after-trim string saves as null", async () => {
    currentSupabase = makeSupabase({ application_requirements: { data: null } });

    await updateRequirementNotes(REQUIREMENT_ID, "   ");

    const builder = currentSupabase.client.from("application_requirements");
    expect(vi.mocked(builder.update).mock.calls[0][0]).toEqual({ notes: null });
  });

  test("failure: returns the notes-specific error", async () => {
    currentSupabase = makeSupabase({ application_requirements: { data: null, error: { message: "row not found" } } });

    const result = await updateRequirementNotes(REQUIREMENT_ID, "note");

    expect(result).toEqual({ error: "Couldn't save your note." });
  });
});
