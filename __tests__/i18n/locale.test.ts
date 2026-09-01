import { describe, expect, test } from "vitest";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { LOCALES, LOCALE_LABELS, INTL_LOCALES, DEFAULT_LOCALE, isLocale, toLocale } from "@/lib/i18n/config";
import { formatRelativeTime } from "@/lib/i18n/date";

describe("isLocale", () => {
  test("accepts every shipped locale", () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
  });

  test("rejects values that are not shipped locales", () => {
    // "de" is the interesting case: a plausible language code we simply have no catalog
    // for. `preferred_language` is unconstrained `text`, so this is reachable from data.
    for (const value of ["de", "EN", "en-US", "", null, undefined]) {
      expect(isLocale(value)).toBe(false);
    }
  });
});

describe("toLocale", () => {
  test("passes through a supported locale", () => {
    expect(toLocale("tr")).toBe("tr");
  });

  /**
   * The guard that keeps a bad row from becoming a 500. `profiles.preferred_language` has
   * no CHECK constraint and no enum (supabase/migrations/0002_profiles.sql), so it can
   * hold anything — a language we dropped, a hand-edited row, a typo. Rendering English is
   * the correct response; throwing on a missing catalog key is not.
   */
  test("falls back to the default for anything unsupported", () => {
    for (const value of ["de", "tr-TR", "", "  ", null, undefined]) {
      expect(toLocale(value)).toBe(DEFAULT_LOCALE);
    }
  });

  test("the default locale is one this build actually ships a catalog for", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});

describe("message catalogs", () => {
  const flatten = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null
      ? Object.entries(value).flatMap(([key, child]) => flatten(child, `${prefix}${key}.`))
      : [prefix.slice(0, -1)];

  /**
   * The regression guard that matters for translation work. English is the shape of
   * record: a key added to en.json without a Turkish counterpart would otherwise surface
   * to a student as the raw key ("nav.plan") at runtime, on a page nobody re-tested.
   */
  test("every locale defines exactly the same keys", () => {
    const expected = flatten(en).sort();
    for (const [locale, catalog] of Object.entries({ en, tr })) {
      expect({ locale, keys: flatten(catalog).sort() }).toEqual({ locale, keys: expected });
    }
  });

  /**
   * `flatten` above already recurses to arbitrary depth (it has to, for "every locale
   * defines exactly the same keys" to mean anything once a namespace nests — see
   * profile.page.sections.*.title). This test used to check only two levels deep
   * (`Object.values(catalog).flatMap((group) => Object.values(group))`), which happened to
   * work while every namespace was flat and started asserting real, non-empty nested
   * *objects* were somehow non-empty *strings* the moment one wasn't — caught adding
   * profile.page.sections. Reuses the same recursive walk as the key-parity test above so
   * the two can't disagree about what a "message" is.
   */
  test("no message is left empty", () => {
    const leaf = (value: unknown, prefix = ""): [string, unknown][] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([key, child]) => leaf(child, `${prefix}${key}.`))
        : [[prefix.slice(0, -1), value]];

    for (const [locale, catalog] of Object.entries({ en, tr })) {
      for (const [key, value] of leaf(catalog)) {
        expect({ locale, key, ok: typeof value === "string" && value.trim().length > 0 }).toEqual({ locale, key, ok: true });
      }
    }
  });

  test("Turkish is actually translated, not copied from English", () => {
    // Guards the failure mode where a catalog is scaffolded by duplicating en.json and
    // never filled in. Scans the whole catalog, not just `nav` — a namespace added later
    // (profile.*, and whatever follows it) gets the same guard without this test needing a
    // per-namespace copy. Each entry below is a confirmed, deliberate loanword, shared
    // proper noun, or locale-independent notation, not an untranslated copy-paste — "Plan"
    // and "Mentor" are genuinely the same word in Turkish, "(n={size})" is statistical
    // sample-size notation with no language to translate, "AP"/"IB"/"A-Level" are the
    // real, internationally-recognized names of those curricula, "Program" is a
    // standard, fully-naturalized Turkish loanword (identically spelled) — not English
    // words with a Turkish equivalent, and "Regular Decision"/"Early Decision"/"Early
    // Action"/"Rolling" (applications.newDialog.typeOptions) are the literal category
    // names the Common App and US universities use on the actual application forms — the
    // same reasoning as the curricula above, decided during the applications/documents
    // i18n pass (2026-09-01): a Turkish student applying to a US school needs to recognize
    // these on the real form, and a translated label they'd have to mentally reverse would
    // work against that, not for it. "Other" in the same option list is a plain word and is
    // translated. A new identical pair failing this test is the guard working: confirm it's
    // deliberate before adding it here, don't add speculatively.
    const enFlat = new Map(flatten(en).map((key) => [key, key.split(".").reduce<unknown>((o, part) => (o as Record<string, unknown>)?.[part], en)]));
    const trFlat = new Map(flatten(tr).map((key) => [key, key.split(".").reduce<unknown>((o, part) => (o as Record<string, unknown>)?.[part], tr)]));
    // Sorted, because this is a set comparison and key order is incidental: it follows
    // whatever order the namespaces happen to sit in, which changes when two branches adding
    // different namespaces are merged. That is not a fact about translation quality, and it
    // failed this test once for exactly that reason.
    const shared = [...enFlat.keys()].filter((key) => enFlat.get(key) === trFlat.get(key)).sort();
    expect(shared).toEqual(
      [
      "nav.plan",
      "onboarding.wizard.curriculumOptions.ap",
      "onboarding.wizard.curriculumOptions.ib",
      "onboarding.wizard.curriculumOptions.aLevel",
      "profile.peerBenchmark.cohortSize",
      "profile.recommendations.relationships.mentor",
      "universities.detail.programFallback",
      "universities.adminForm.program",
      "applications.newDialog.typeOptions.regular_decision",
      "applications.newDialog.typeOptions.early_decision",
      "applications.newDialog.typeOptions.early_action",
      "applications.newDialog.typeOptions.rolling",
      ].sort(),
    );
  });

  test("every shipped locale has a label and an Intl tag", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale]?.length).toBeGreaterThan(0);
      expect(INTL_LOCALES[locale]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});

describe("formatRelativeTime", () => {
  const threeDaysAgo = () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  test("renders English with a suffix", () => {
    expect(formatRelativeTime(threeDaysAgo(), "en")).toBe("3 days ago");
  });

  test("renders Turkish with a suffix", () => {
    expect(formatRelativeTime(threeDaysAgo(), "tr")).toBe("3 gün önce");
  });

  test("accepts the ISO strings that come back from the database", () => {
    // Every call site passes a raw `created_at`/`last_checked_at` column value.
    expect(formatRelativeTime(threeDaysAgo().toISOString(), "tr")).toBe("3 gün önce");
  });
});

/**
 * ICU's `#` renders the count with the *active* locale's number format, while everything
 * else in the product goes through `formatNumber`, pinned to en-US by
 * `NUMBER_FORMAT_LOCALE` until that decision is reviewed separately. So the two disagree
 * above 999: the universities browse page rendered "1.010 üniversite" in Turkish while every
 * other figure on the page said "1,010" (found live, 2026-09-01, by reading DOM text — a
 * screenshot could not distinguish "." from "," at that size).
 *
 * This is not a ban. `#` is idiomatic ICU, and once the en-US pin is lifted the two paths
 * agree again. What it stops is a *new* `#` slipping in on a count that can exceed 999
 * without anyone weighing it — every entry below was checked to be bounded far under that
 * (areas of a nine-dimension profile, items in one CV, entries in one student's timeline).
 *
 * If you are adding one: if the count can plausibly reach four digits, pass a pre-formatted
 * string into the plural branches instead, the way universities.browse now does. If it
 * cannot, add the key here with the reason.
 */
describe("ICU plural counts that bypass formatNumber are deliberate", () => {
  const BOUNDED_BELOW_1000 = [
    "onboarding.import.foundItems",
    "profile.cvImport.addItemsToProfile",
    "profile.cvImport.addedNotice",
    "profile.cvImport.foundItems",
    "profile.journeyTimeline.entryCount",
    "profile.page.journeyNote.gapBodyWithAwaiting",
    "profile.progress.developing",
    "profile.progress.movedForward",
    // Universities a single student is tracking applications to — bounded by how many
    // schools one person can realistically apply to, nowhere near four digits.
    "applications.hero.universityCount",
    // How many of a student's own profile dimensions are strong/assessed — bounded by
    // DIMENSION_ORDER's fixed length (9 today, lib/scoring/labels.ts), never close to
    // needing a thousands separator.
    "appShell.userMenu.areasAssessed",
    "appShell.userMenu.areasStrong",
  ];

  test("no un-reviewed `#` inside a plural block", () => {
    const offenders = new Set<string>();
    const scan = (node: unknown, path = ""): void => {
      if (typeof node === "string") {
        if (node.includes("plural,") && node.includes("#")) offenders.add(path);
        return;
      }
      if (node && typeof node === "object") {
        for (const [key, child] of Object.entries(node)) scan(child, path ? `${path}.${key}` : key);
      }
    };
    scan(en);
    scan(tr);
    expect([...offenders].sort()).toEqual(BOUNDED_BELOW_1000.slice().sort());
  });
});
