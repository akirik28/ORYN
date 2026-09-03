import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { MockSupabaseClient, type MockTableConfig } from "@/__tests__/stubs/mock-supabase-table";

/**
 * Coverage for lib/parent/links.ts (CEO/oryn-45, 2026-09-04) — flagged in P4's own report as
 * the one untested module in the parent-invite feature, then escalated once it turned out to
 * be ALL six functions, not one: this is the code implementing §K3's double confirmation and
 * "asla ama asla" (never, ever) read-only guarantee. Every test here either proves a happy
 * path or, more importantly, proves a *degrade* path or a *security* boundary — see each
 * describe block for which.
 *
 * `parent_links` not existing live is the steady state in production today (migration 0116
 * staged, not applied as of this write) — every function's missing-table branch is a real,
 * currently-exercised path, not a hypothetical.
 */

const mockState = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockState.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockState.client,
}));

import { setAccountRole, setParentInviteEmail, createParentLink, getParentLinksForStudent, confirmParentLink, revokeParentLink } from "@/lib/parent/links";

const STUDENT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PARENT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STRANGER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function useMockClient(config: Record<string, MockTableConfig>): MockSupabaseClient {
  const client = new MockSupabaseClient(config);
  mockState.client = client as unknown as SupabaseClient<Database>;
  return client;
}

function pendingLink(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "link-1",
    parent_user_id: PARENT_A,
    student_user_id: STUDENT_A,
    status: "pending",
    invited_email: "parent@example.com",
    invited_at: new Date().toISOString(),
    confirmed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("setAccountRole", () => {
  test("happy path: writes account_role and returns no error", async () => {
    const profiles: Record<string, unknown>[] = [{ id: PARENT_A, account_role: "student" }];
    useMockClient({ profiles: { rows: profiles } });

    const result = await setAccountRole(PARENT_A, "parent");
    expect(result).toEqual({});
    expect(profiles[0].account_role).toBe("parent");
  });

  test("degrades silently when account_role column doesn't exist yet", async () => {
    useMockClient({ profiles: { rows: [{ id: PARENT_A }], missingColumns: ["account_role"] } });
    const result = await setAccountRole(PARENT_A, "parent");
    expect(result).toEqual({});
  });

  test("a real (non-degrade) DB error surfaces as an error, not silently", async () => {
    useMockClient({ profiles: { rows: [], forceError: { code: "53300", message: "too many connections" } } });
    const result = await setAccountRole(PARENT_A, "parent");
    expect(result.error).toBeTruthy();
  });
});

describe("setParentInviteEmail", () => {
  test("happy path: writes parent_invite_email, no pending links to touch", async () => {
    const profiles = [{ id: STUDENT_A, parent_invite_email: null }];
    const client = useMockClient({
      profiles: { rows: profiles },
      parent_links: { rows: [] },
    });
    const result = await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, "new@example.com");
    expect(result).toEqual({});
    expect(profiles[0].parent_invite_email).toBe("new@example.com");
  });

  test("degrades silently when parent_invite_email column doesn't exist yet, never touches parent_links", async () => {
    const client = useMockClient({
      profiles: { rows: [{ id: STUDENT_A }], missingColumns: ["parent_invite_email"] },
      parent_links: { rows: [], missing: true },
    });
    const result = await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, "new@example.com");
    expect(result).toEqual({});
  });

  test("CEO's decision: changing the address revokes a stale PENDING link to the old address", async () => {
    const links = [pendingLink({ invited_email: "old@example.com" })];
    const client = useMockClient({
      profiles: { rows: [{ id: STUDENT_A }] },
      parent_links: { rows: links },
    });
    await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, "new@example.com");
    expect(links[0].status).toBe("revoked");
  });

  test("re-saving the SAME address does not revoke the still-good pending link", async () => {
    const links = [pendingLink({ invited_email: "same@example.com" })];
    const client = useMockClient({
      profiles: { rows: [{ id: STUDENT_A }] },
      parent_links: { rows: links },
    });
    await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, "same@example.com");
    expect(links[0].status).toBe("pending");
  });

  test("CEO's decision, the safety half: an ACTIVE link is never touched by an address change", async () => {
    const links = [pendingLink({ status: "active", invited_email: "old@example.com", confirmed_at: new Date().toISOString() })];
    const client = useMockClient({
      profiles: { rows: [{ id: STUDENT_A }] },
      parent_links: { rows: links },
    });
    await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, "new@example.com");
    expect(links[0].status).toBe("active");
  });

  test("clearing the address (null) revokes every pending link unconditionally", async () => {
    const links = [pendingLink({ id: "link-1", invited_email: "one@example.com" }), pendingLink({ id: "link-2", invited_email: "two@example.com" })];
    const client = useMockClient({
      profiles: { rows: [{ id: STUDENT_A }] },
      parent_links: { rows: links },
    });
    await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, null);
    expect(links.every((l) => l.status === "revoked")).toBe(true);
  });

  test("parent_links missing entirely: the email still saves, the cleanup step degrades silently", async () => {
    const profiles = [{ id: STUDENT_A, parent_invite_email: null }];
    const client = useMockClient({
      profiles: { rows: profiles },
      parent_links: { rows: [], missing: true },
    });
    const result = await setParentInviteEmail(client as unknown as SupabaseClient<Database>, STUDENT_A, "new@example.com");
    expect(result).toEqual({});
    expect(profiles[0].parent_invite_email).toBe("new@example.com");
  });
});

describe("createParentLink", () => {
  test("happy path: inserts a pending row", async () => {
    const links: Record<string, unknown>[] = [];
    useMockClient({ parent_links: { rows: links } });
    const result = await createParentLink({ parentUserId: PARENT_A, studentUserId: STUDENT_A, invitedEmail: "parent@example.com" });
    expect(result).toEqual({});
    expect(links).toHaveLength(1);
    expect(links[0].status).toBe("pending");
  });

  test("degrades to a silent success when parent_links doesn't exist yet", async () => {
    useMockClient({ parent_links: { rows: [], missing: true } });
    const result = await createParentLink({ parentUserId: PARENT_A, studentUserId: STUDENT_A, invitedEmail: "parent@example.com" });
    expect(result).toEqual({});
  });

  test("the 23505 case CEO named specifically: an existing (parent, student) pair is treated as already-linked, not an error", async () => {
    const links = [pendingLink()];
    useMockClient({
      parent_links: {
        rows: links,
        uniqueConstraints: [{ name: "parent_links_parent_user_id_student_user_id_key", columns: ["parent_user_id", "student_user_id"] }],
      },
    });
    const result = await createParentLink({ parentUserId: PARENT_A, studentUserId: STUDENT_A, invitedEmail: "different@example.com" });
    expect(result).toEqual({ alreadyLinked: true });
    expect(links).toHaveLength(1); // no second row inserted
  });

  test("a genuinely different unique-constraint name is NOT swallowed as already-linked", async () => {
    useMockClient({
      parent_links: {
        rows: [],
        forceError: { code: "23505", message: 'duplicate key value violates unique constraint "some_other_constraint"' },
      },
    });
    const result = await createParentLink({ parentUserId: PARENT_A, studentUserId: STUDENT_A, invitedEmail: "parent@example.com" });
    expect(result.alreadyLinked).toBeUndefined();
    expect(result.error).toBeTruthy();
  });
});

describe("getParentLinksForStudent", () => {
  test("returns only this student's links, newest-shaped data intact, computes isExpired", async () => {
    const oldInvite = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days ago, past the 14-day window
    const recentInvite = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    useMockClient({
      parent_links: {
        rows: [
          pendingLink({ id: "link-old", invited_at: oldInvite }),
          pendingLink({ id: "link-recent", invited_at: recentInvite }),
          pendingLink({ id: "link-other-student", student_user_id: STUDENT_B }),
        ],
      },
    });
    const result = await getParentLinksForStudent(STUDENT_A);
    expect(result.map((r) => r.id).sort()).toEqual(["link-old", "link-recent"]);
    expect(result.find((r) => r.id === "link-old")!.isExpired).toBe(true);
    expect(result.find((r) => r.id === "link-recent")!.isExpired).toBe(false);
  });

  test("an active link is never marked expired regardless of age", async () => {
    const oldInvite = new Date(Date.now() - 999 * 24 * 60 * 60 * 1000).toISOString();
    useMockClient({
      parent_links: { rows: [pendingLink({ status: "active", invited_at: oldInvite, confirmed_at: oldInvite })] },
    });
    const result = await getParentLinksForStudent(STUDENT_A);
    expect(result[0].isExpired).toBe(false);
  });

  test("degrades to an empty list when parent_links doesn't exist yet", async () => {
    useMockClient({ parent_links: { rows: [], missing: true } });
    const result = await getParentLinksForStudent(STUDENT_A);
    expect(result).toEqual([]);
  });
});

describe("confirmParentLink — the student's consent switch", () => {
  test("happy path: the actual student confirms their own pending link", async () => {
    const links = [pendingLink()];
    useMockClient({ parent_links: { rows: links } });
    const result = await confirmParentLink("link-1", STUDENT_A);
    expect(result).toEqual({});
    expect(links[0].status).toBe("active");
    expect(links[0].confirmed_at).not.toBeNull();
  });

  /**
   * CEO's specific ask, 2026-09-04: "can confirmParentLink be reached by anyone other than
   * the student? ... a parent self-activating is the single transition 44 built their
   * policies specifically to prevent." This proves the CODE's own ownership filter agrees —
   * independent of, not a substitute for, 44's RLS policy (supabase/tests/parent_links_rls_
   * manual.sql covers the database layer; this covers the application layer this file owns).
   */
  test("a parent cannot self-activate their own pending link by calling confirm with their own id", async () => {
    const links = [pendingLink()];
    useMockClient({ parent_links: { rows: links } });
    const result = await confirmParentLink("link-1", PARENT_A);
    expect(result.error).toBeTruthy();
    expect(links[0].status).toBe("pending"); // unchanged — the write never matched a row
    expect(links[0].confirmed_at).toBeNull();
  });

  test("a third party (neither parent nor student on this link) cannot confirm it either", async () => {
    const links = [pendingLink()];
    useMockClient({ parent_links: { rows: links } });
    const result = await confirmParentLink("link-1", STRANGER);
    expect(result.error).toBeTruthy();
    expect(links[0].status).toBe("pending");
  });

  test("an already-active link cannot be re-confirmed (stale double-click is a no-op, not a reset)", async () => {
    const originalConfirmedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const links = [pendingLink({ status: "active", confirmed_at: originalConfirmedAt })];
    useMockClient({ parent_links: { rows: links } });
    const result = await confirmParentLink("link-1", STUDENT_A);
    expect(result.error).toBeTruthy();
    expect(links[0].confirmed_at).toBe(originalConfirmedAt); // not overwritten
  });

  test("confirming a link id that doesn't exist returns an error", async () => {
    useMockClient({ parent_links: { rows: [] } });
    const result = await confirmParentLink("no-such-link", STUDENT_A);
    expect(result.error).toBeTruthy();
  });

  test("degrades to an honest error when parent_links doesn't exist yet", async () => {
    useMockClient({ parent_links: { rows: [], missing: true } });
    const result = await confirmParentLink("link-1", STUDENT_A);
    expect(result.error).toBeTruthy();
  });
});

describe("revokeParentLink — either side can end it, no one else can", () => {
  test("the student can revoke their own link", async () => {
    const links = [pendingLink()];
    useMockClient({ parent_links: { rows: links } });
    const result = await revokeParentLink("link-1", STUDENT_A);
    expect(result).toEqual({});
    expect(links[0].status).toBe("revoked");
  });

  test("the parent can revoke the same link from their own side", async () => {
    const links = [pendingLink()];
    useMockClient({ parent_links: { rows: links } });
    const result = await revokeParentLink("link-1", PARENT_A);
    expect(result).toEqual({});
    expect(links[0].status).toBe("revoked");
  });

  test("a third party cannot revoke a link they're not part of", async () => {
    const links = [pendingLink()];
    useMockClient({ parent_links: { rows: links } });
    const result = await revokeParentLink("link-1", STRANGER);
    expect(result.error).toBeTruthy();
    expect(links[0].status).toBe("pending"); // unchanged
  });

  test("revoking a link id that doesn't exist returns an error", async () => {
    useMockClient({ parent_links: { rows: [] } });
    const result = await revokeParentLink("no-such-link", STUDENT_A);
    expect(result.error).toBeTruthy();
  });

  test("degrades to an honest error when parent_links doesn't exist yet", async () => {
    useMockClient({ parent_links: { rows: [], missing: true } });
    const result = await revokeParentLink("link-1", STUDENT_A);
    expect(result.error).toBeTruthy();
  });
});
