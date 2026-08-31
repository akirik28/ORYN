import { describe, expect, test } from "vitest";
import { SignUpSchema } from "@/lib/validation/auth";
import {
  DATA_PROCESSORS,
  LAWYER_FLAGS,
  LEGAL_ROUTES,
  LEGAL_REVIEW_STATUS,
  legalCopy,
  isUnresolved,
  unresolved,
} from "@/lib/legal/content";

const VALID = {
  displayName: "Ada K",
  email: "student@example.com",
  password: "abcd1234",
};

describe("signup consent gate", () => {
  // The whole point of the checkbox. An unticked box submits NO field at all rather than
  // `false`, so `null` — not `false` — is the shape that actually arrives from a browser,
  // and it is the case a naive `z.boolean().optional()` would wave straight through.
  test("rejects a signup with no acceptance field, as an unticked box submits", () => {
    const result = SignUpSchema.safeParse({ ...VALID, acceptedTerms: null });
    expect(result.success).toBe(false);
  });

  test("rejects an explicit false", () => {
    expect(SignUpSchema.safeParse({ ...VALID, acceptedTerms: false }).success).toBe(false);
  });

  test("rejects a value that is neither the checkbox's nor a boolean", () => {
    expect(SignUpSchema.safeParse({ ...VALID, acceptedTerms: "maybe" }).success).toBe(false);
    expect(SignUpSchema.safeParse({ ...VALID, acceptedTerms: 1 }).success).toBe(false);
  });

  test("surfaces the copy module's message, not a raw Zod one", () => {
    const result = SignUpSchema.safeParse({ ...VALID, acceptedTerms: null });
    if (result.success) throw new Error("expected the parse to fail");
    const messages = result.error.flatten().fieldErrors.acceptedTerms;
    expect(messages).toEqual([legalCopy.signupConsent.checkboxRequiredError]);
  });

  test('accepts the "on" a ticked checkbox actually sends, and normalizes it to true', () => {
    const result = SignUpSchema.safeParse({ ...VALID, acceptedTerms: "on" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.acceptedTerms).toBe(true);
  });

  test("still enforces every other field — consent does not substitute for validation", () => {
    const result = SignUpSchema.safeParse({ ...VALID, password: "short", acceptedTerms: "on" });
    expect(result.success).toBe(false);
  });
});

describe("unresolved placeholders", () => {
  test("an unresolved value is recognisable, so it can never render as settled prose", () => {
    const value = unresolved("Registered company name");
    expect(isUnresolved(value)).toBe(true);
    expect(value.label).toBe("Registered company name");
  });

  test("ordinary strings are not mistaken for placeholders", () => {
    expect(isUnresolved("Oryn Teknoloji A.Ş.")).toBe(false);
    expect(isUnresolved(null)).toBe(false);
    expect(isUnresolved(undefined)).toBe(false);
    expect(isUnresolved({})).toBe(false);
  });
});

describe("data processor inventory", () => {
  test("every processor states what is sent, where, and for how long", () => {
    for (const processor of DATA_PROCESSORS) {
      expect(processor.name.length, `${processor.id} name`).toBeGreaterThan(0);
      expect(processor.dataSent.length, `${processor.id} dataSent`).toBeGreaterThan(0);
      expect(processor.location.length, `${processor.id} location`).toBeGreaterThan(0);
      expect(processor.retention.length, `${processor.id} retention`).toBeGreaterThan(0);
      // A claim nobody can re-check is a claim that silently rots.
      expect(processor.verifiedIn.length, `${processor.id} verifiedIn`).toBeGreaterThan(0);
    }
  });

  test("processor ids are unique — they are anchor targets and React keys", () => {
    const ids = DATA_PROCESSORS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the four services the founder asked to account for are all present", () => {
    const ids = DATA_PROCESSORS.map((p) => p.id);
    expect(ids).toContain("supabase");
    expect(ids).toContain("anthropic");
    expect(ids).toContain("tavily");
    expect(ids).toContain("openalex");
  });
});

describe("legal documents", () => {
  const documents = Object.values(legalCopy.documents);

  test("every route resolves to a document", () => {
    for (const route of LEGAL_ROUTES) {
      expect(legalCopy.documents[route.slug], route.slug).toBeDefined();
      expect(legalCopy.documents[route.slug].slug).toBe(route.slug);
    }
  });

  test("section ids are unique within a document, so deep links and keys stay stable", () => {
    for (const document of documents) {
      const ids = document.sections.map((s) => s.id);
      expect(new Set(ids).size, `${document.slug} has duplicate section ids`).toBe(ids.length);
    }
  });

  test("no section is a heading with nothing under it", () => {
    for (const document of documents) {
      for (const section of document.sections) {
        const hasContent =
          section.body.length > 0 ||
          (section.bullets?.length ?? 0) > 0 ||
          Boolean(section.includesProcessorTable) ||
          Boolean(section.companyDetails);
        expect(hasContent, `${document.slug}#${section.id} is empty`).toBe(true);
      }
    }
  });

  test("the processor inventory appears in both notices that promise it", () => {
    const showsTable = (slug: "privacy" | "terms" | "kvkk") =>
      legalCopy.documents[slug].sections.some((s) => s.includesProcessorTable);
    expect(showsTable("privacy")).toBe(true);
    expect(showsTable("kvkk")).toBe(true);
  });
});

describe("review status", () => {
  // This is the guard on the whole deliverable: while `approved` is false the draft banner
  // renders and signup records that consent was given against unapproved text. If someone
  // flips it, this test fails and forces them to record who approved it and when — which
  // is the conversation that should happen before a legal document stops calling itself a
  // draft.
  test("approval is accompanied by a reviewer and a date", () => {
    if (LEGAL_REVIEW_STATUS.approved) {
      expect(LEGAL_REVIEW_STATUS.reviewedBy).toBeTruthy();
      expect(LEGAL_REVIEW_STATUS.reviewedOn).toBeTruthy();
    } else {
      expect(LEGAL_REVIEW_STATUS.reviewedBy).toBeNull();
      expect(LEGAL_REVIEW_STATUS.reviewedOn).toBeNull();
    }
  });

  test("every open question records what the product does today", () => {
    expect(LAWYER_FLAGS.length).toBeGreaterThan(0);
    for (const flag of LAWYER_FLAGS) {
      expect(flag.question.length, `${flag.id} question`).toBeGreaterThan(0);
      expect(flag.currentState.length, `${flag.id} currentState`).toBeGreaterThan(0);
    }
    const ids = LAWYER_FLAGS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
