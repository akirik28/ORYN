import { describe, expect, test } from "vitest";
import { SignUpSchema } from "@/lib/validation/auth";
import {
  DATA_PROCESSORS_EN,
  DATA_PROCESSORS_TR,
  LAWYER_FLAGS,
  LEGAL_ROUTES,
  LEGAL_REVIEW_STATUS,
  legalCopyEn,
  legalCopyTr,
  getLegalCopy,
  getDataProcessors,
  isUnresolved,
  unresolved,
  type LegalCopy,
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

  // The schema itself can only ever produce its static English fallback — it's built once
  // at module load, before any request (and its locale) exists. actions.ts's signUp()
  // overrides this specific field's message with the locale-resolved one after parsing;
  // that override isn't exercised here (it needs a request-scoped cookie/locale to test),
  // but this pins down the fallback it overrides FROM, so a future edit can't silently
  // swap in the wrong string or lose the override's purpose.
  test("the schema's own fallback is the English copy module's message, not a raw Zod one", () => {
    const result = SignUpSchema.safeParse({ ...VALID, acceptedTerms: null });
    if (result.success) throw new Error("expected the parse to fail");
    const messages = result.error.flatten().fieldErrors.acceptedTerms;
    expect(messages).toEqual([legalCopyEn.signupConsent.checkboxRequiredError]);
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

describe("locale selection", () => {
  test("getLegalCopy picks the Turkish object only for \"tr\"", () => {
    expect(getLegalCopy("tr")).toBe(legalCopyTr);
    expect(getLegalCopy("en")).toBe(legalCopyEn);
  });

  test("getDataProcessors picks the Turkish array only for \"tr\"", () => {
    expect(getDataProcessors("tr")).toBe(DATA_PROCESSORS_TR);
    expect(getDataProcessors("en")).toBe(DATA_PROCESSORS_EN);
  });
});

describe("unresolved placeholders", () => {
  test("an unresolved value is recognisable, so it can never render as settled prose", () => {
    const value = unresolved("companyLegalName");
    expect(isUnresolved(value)).toBe(true);
    expect(value.labelKey).toBe("companyLegalName");
  });

  test("ordinary strings are not mistaken for placeholders", () => {
    expect(isUnresolved("Proxola Teknoloji A.Ş.")).toBe(false);
    expect(isUnresolved(null)).toBe(false);
    expect(isUnresolved(undefined)).toBe(false);
    expect(isUnresolved({})).toBe(false);
  });

  test("every labelKey used in COMPANY resolves in both locales' common strings", async () => {
    const { COMPANY } = await import("@/lib/legal/content");
    for (const [field, value] of Object.entries(COMPANY)) {
      if (!isUnresolved(value)) continue;
      expect(legalCopyEn.common[value.labelKey], `en.common.${value.labelKey} (COMPANY.${field})`).toBeTruthy();
      expect(legalCopyTr.common[value.labelKey], `tr.common.${value.labelKey} (COMPANY.${field})`).toBeTruthy();
    }
  });
});

describe.each([
  ["en", DATA_PROCESSORS_EN],
  ["tr", DATA_PROCESSORS_TR],
] as const)("data processor inventory (%s)", (locale, processors) => {
  test("every processor states what is sent, where, and for how long", () => {
    for (const processor of processors) {
      expect(processor.name.length, `${locale}/${processor.id} name`).toBeGreaterThan(0);
      expect(processor.dataSent.length, `${locale}/${processor.id} dataSent`).toBeGreaterThan(0);
      expect(processor.location.length, `${locale}/${processor.id} location`).toBeGreaterThan(0);
      expect(processor.retention.length, `${locale}/${processor.id} retention`).toBeGreaterThan(0);
      // A claim nobody can re-check is a claim that silently rots.
      expect(processor.verifiedIn.length, `${locale}/${processor.id} verifiedIn`).toBeGreaterThan(0);
    }
  });

  test("processor ids are unique — they are anchor targets and React keys", () => {
    const ids = processors.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the five services the founder asked to account for are all present", () => {
    const ids = processors.map((p) => p.id);
    expect(ids).toContain("supabase");
    expect(ids).toContain("anthropic");
    expect(ids).toContain("tavily");
    expect(ids).toContain("openalex");
    expect(ids).toContain("college-scorecard");
  });
});

// The EN/TR processor arrays are maintained as two independent literals (see the comment
// in lib/legal/content.ts on why: simplicity over de-duplicating five rows) — nothing at
// the type level stops them drifting apart on the FACTS (as opposed to the prose), which
// would be a real defect: e.g. Tavily silently marked personalData:true in one language
// and not the other. This is the guard.
describe("data processor inventory: EN/TR fact parity", () => {
  test("same ids, in the same order, in both languages", () => {
    expect(DATA_PROCESSORS_TR.map((p) => p.id)).toEqual(DATA_PROCESSORS_EN.map((p) => p.id));
  });

  test("personalData and verifiedIn are identical per id — these are facts, not prose", () => {
    for (const en of DATA_PROCESSORS_EN) {
      const tr = DATA_PROCESSORS_TR.find((p) => p.id === en.id);
      expect(tr, `${en.id} missing from Turkish array`).toBeDefined();
      expect(tr!.personalData, `${en.id} personalData`).toBe(en.personalData);
      expect(tr!.verifiedIn, `${en.id} verifiedIn`).toBe(en.verifiedIn);
    }
  });

  test("every prose field actually differs by language (nothing left untranslated)", () => {
    for (const en of DATA_PROCESSORS_EN) {
      const tr = DATA_PROCESSORS_TR.find((p) => p.id === en.id)!;
      for (const field of ["role", "dataSent", "location", "retention"] as const) {
        expect(tr[field], `${en.id}.${field} looks untranslated (identical to English)`).not.toBe(en[field]);
      }
    }
  });
});

describe.each([
  ["en", legalCopyEn],
  ["tr", legalCopyTr],
] as const)("legal documents (%s)", (locale, copy) => {
  const documents = Object.values(copy.documents);

  test("every route resolves to a document", () => {
    for (const route of LEGAL_ROUTES) {
      expect(copy.documents[route.slug], `${locale}/${route.slug}`).toBeDefined();
      expect(copy.documents[route.slug].slug).toBe(route.slug);
    }
  });

  test("section ids are unique within a document, so deep links and keys stay stable", () => {
    for (const document of documents) {
      const ids = document.sections.map((s) => s.id);
      expect(new Set(ids).size, `${locale}/${document.slug} has duplicate section ids`).toBe(ids.length);
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
        expect(hasContent, `${locale}/${document.slug}#${section.id} is empty`).toBe(true);
      }
    }
  });

  test("the processor inventory appears in both notices that promise it", () => {
    const showsTable = (slug: "privacy" | "terms" | "kvkk") =>
      copy.documents[slug].sections.some((s) => s.includesProcessorTable);
    expect(showsTable("privacy")).toBe(true);
    expect(showsTable("kvkk")).toBe(true);
  });
});

// The actual point of shipping a translation: the two languages must describe the SAME
// document (same sections, in the same order, with the same optional features attached to
// each one) so a reader switching languages mid-read lands on the equivalent section, and
// so `LegalDocumentView`'s single render path (one document + one locale prop) never has
// to special-case a shape mismatch. Prose length/wording is expected to differ — Turkish
// legal register runs longer than English — so only structure is compared here, not text.
describe("legal documents: EN/TR structural parity", () => {
  for (const slug of ["privacy", "terms", "kvkk"] as const) {
    test(`${slug}: same section ids, in the same order`, () => {
      const enIds = legalCopyEn.documents[slug].sections.map((s) => s.id);
      const trIds = legalCopyTr.documents[slug].sections.map((s) => s.id);
      expect(trIds).toEqual(enIds);
    });

    test(`${slug}: each section has the same bullet count and the same optional features`, () => {
      const enSections = legalCopyEn.documents[slug].sections;
      const trSections = legalCopyTr.documents[slug].sections;
      for (let i = 0; i < enSections.length; i++) {
        const en = enSections[i];
        const tr = trSections[i];
        expect(tr.bullets?.length ?? 0, `${slug}#${en.id} bullet count`).toBe(en.bullets?.length ?? 0);
        expect(tr.body.length, `${slug}#${en.id} paragraph count`).toBe(en.body.length);
        expect(Boolean(tr.includesProcessorTable), `${slug}#${en.id} includesProcessorTable`).toBe(
          Boolean(en.includesProcessorTable)
        );
        expect(tr.companyDetails, `${slug}#${en.id} companyDetails`).toBe(en.companyDetails);
      }
    });

    test(`${slug}: every translatable string actually differs from English (nothing left untranslated)`, () => {
      const enSections = legalCopyEn.documents[slug].sections;
      const trSections = legalCopyTr.documents[slug].sections;
      expect(legalCopyTr.documents[slug].title).not.toBe(legalCopyEn.documents[slug].title);
      expect(legalCopyTr.documents[slug].intro).not.toBe(legalCopyEn.documents[slug].intro);
      for (let i = 0; i < enSections.length; i++) {
        const en = enSections[i];
        const tr = trSections[i];
        expect(tr.heading, `${slug}#${en.id} heading`).not.toBe(en.heading);
        for (let p = 0; p < en.body.length; p++) {
          expect(tr.body[p], `${slug}#${en.id} body[${p}]`).not.toBe(en.body[p]);
        }
        for (let b = 0; b < (en.bullets?.length ?? 0); b++) {
          expect(tr.bullets?.[b], `${slug}#${en.id} bullets[${b}]`).not.toBe(en.bullets?.[b]);
        }
      }
    });
  }

  test("every flat common/footer/signupConsent/processorTable string differs from English", () => {
    const flatGroups: (keyof Pick<LegalCopy, "common" | "footer" | "signupConsent" | "processorTable">)[] = [
      "common",
      "footer",
      "signupConsent",
      "processorTable",
    ];
    for (const group of flatGroups) {
      const en = legalCopyEn[group] as Record<string, unknown>;
      const tr = legalCopyTr[group] as Record<string, unknown>;
      for (const key of Object.keys(en)) {
        const enValue = en[key];
        const trValue = tr[key];
        if (typeof enValue !== "string") continue; // skips copyright(), and dataSummary's array (checked below)
        expect(trValue, `${group}.${key}`).not.toBe(enValue);
      }
    }
    // dataSummary is a string[], not a flat string — same "must differ" check, per item.
    for (let i = 0; i < legalCopyEn.signupConsent.dataSummary.length; i++) {
      expect(legalCopyTr.signupConsent.dataSummary[i], `signupConsent.dataSummary[${i}]`).not.toBe(
        legalCopyEn.signupConsent.dataSummary[i]
      );
    }
  });

  test("draftBanner.label/body differ from English", () => {
    expect(legalCopyTr.draftBanner.label).not.toBe(legalCopyEn.draftBanner.label);
    expect(legalCopyTr.draftBanner.body).not.toBe(legalCopyEn.draftBanner.body);
  });

  test("copyright() renders the same format with the product name in both languages", () => {
    expect(legalCopyEn.footer.copyright(2027)).toBe("© 2027 Proxola");
    expect(legalCopyTr.footer.copyright(2027)).toBe("© 2027 Proxola");
  });
});

describe("review status", () => {
  // This is the guard on the whole deliverable: while `approved` is false the draft banner
  // renders — in both languages — and signup records that consent was given against
  // unapproved text. If someone flips it, this test fails and forces them to record who
  // approved it and when — which is the conversation that should happen before a legal
  // document stops calling itself a draft, in either language.
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

  test("the Turkish translation itself is flagged as an open review item", () => {
    const ids = LAWYER_FLAGS.map((f) => f.id);
    expect(ids).toContain("turkishLegalReview");
  });
});
