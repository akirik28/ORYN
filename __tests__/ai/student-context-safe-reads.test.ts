import { describe, expect, test, vi } from "vitest";
import { getPendingApplicationRequirements, getTargetUniversitiesForContext } from "@/lib/ai/student-context";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SupersessionMap } from "@/lib/universities/canonical";

/**
 * 2026-09-03: both functions below read several tables via `.data ?? []` with no `.error`
 * check, the same shape lib/scoring/assemble-facts.ts had — a failed read (RLS, a
 * transient error, a table briefly unreachable) was indistinguishable from "this student
 * genuinely has none of these." Both now route every read through lib/supabase/safe-read.ts's
 * readOr, this pattern's first consumer beyond assembleScoringFacts. These tests exercise
 * the real functions against a fake client (not just readOr in isolation) so the actual
 * wiring — category names, error propagation through the batch-fetch-and-zip chains — is
 * proven, not assumed.
 */

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

function fakeClient(perTable: Record<string, QueryResult>): SupabaseClient<Database> {
  const client = {
    from: (table: string) => {
      const result = perTable[table] ?? { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        limit: () => builder,
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

const NO_SUPERSESSION: SupersessionMap = new Map();

describe("getPendingApplicationRequirements", () => {
  test("returns [] and logs nothing when the read succeeds with genuinely no pending requirements", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getPendingApplicationRequirements(fakeClient({ application_requirements: { data: [], error: null } }), "user-1", NO_SUPERSESSION);
    expect(result).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed initial read returns [] but is logged by name, not swallowed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ application_requirements: { data: null, error: { message: "boom" } } });
    const result = await getPendingApplicationRequirements(client, "user-1", NO_SUPERSESSION);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("pendingApplicationRequirements");
    spy.mockRestore();
  });

  test("resolves a real pending requirement to its university name through the full batch-fetch-and-zip chain", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      application_requirements: { data: [{ title: null, requirement_type: "essay", application_id: "app-1" }], error: null },
      applications: { data: [{ id: "app-1", target_university_id: "target-1" }], error: null },
      target_universities: { data: [{ id: "target-1", university_id: "uni-1" }], error: null },
      universities: { data: [{ id: "uni-1", name: "Bocconi" }], error: null },
    });
    const result = await getPendingApplicationRequirements(client, "user-1", NO_SUPERSESSION);
    expect(result).toEqual([{ applicationTitle: "Bocconi", requirementTitle: null, requirementType: "essay" }]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a downstream failure (the universities lookup) still returns the requirement, falling back to the generic label, and is logged separately from the first read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      application_requirements: { data: [{ title: "Personal statement", requirement_type: "essay", application_id: "app-1" }], error: null },
      applications: { data: [{ id: "app-1", target_university_id: "target-1" }], error: null },
      target_universities: { data: [{ id: "target-1", university_id: "uni-1" }], error: null },
      universities: { data: null, error: { message: "timeout" } },
    });
    const result = await getPendingApplicationRequirements(client, "user-1", NO_SUPERSESSION);
    expect(result).toEqual([{ applicationTitle: "Application", requirementTitle: "Personal statement", requirementType: "essay" }]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("pendingApplicationRequirements.universities");
    spy.mockRestore();
  });
});

describe("getTargetUniversitiesForContext", () => {
  test("a failed initial read returns [] but is logged by name", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ target_universities: { data: null, error: { message: "boom" } } });
    const result = await getTargetUniversitiesForContext(client, "user-1", NO_SUPERSESSION);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("targetUniversities");
    spy.mockRestore();
  });

  test("a failed universities lookup still returns the target, name falling back to 'Unknown', logged with its own sub-category", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      target_universities: { data: [{ id: "target-1", status: "target", outlook: null, university_id: "uni-1", program_id: null }], error: null },
      universities: { data: null, error: { message: "timeout" } },
    });
    const result = await getTargetUniversitiesForContext(client, "user-1", NO_SUPERSESSION);
    expect(result).toEqual([{ id: "target-1", universityId: "uni-1", programId: null, name: "Unknown", status: "target", outlook: null }]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("targetUniversities.universities");
    spy.mockRestore();
  });
});
