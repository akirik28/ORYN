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
    // sample-size notation with no language to translate, and "AP"/"IB"/"A-Level" are the
    // real, internationally-recognized names of those curricula, not English words with a
    // Turkish equivalent. A new identical pair failing this test is the guard working:
    // confirm it's deliberate before adding it here, don't add speculatively.
    const enFlat = new Map(flatten(en).map((key) => [key, key.split(".").reduce<unknown>((o, part) => (o as Record<string, unknown>)?.[part], en)]));
    const trFlat = new Map(flatten(tr).map((key) => [key, key.split(".").reduce<unknown>((o, part) => (o as Record<string, unknown>)?.[part], tr)]));
    const shared = [...enFlat.keys()].filter((key) => enFlat.get(key) === trFlat.get(key));
    expect(shared).toEqual([
      "nav.plan",
      "onboarding.wizard.curriculumOptions.ap",
      "onboarding.wizard.curriculumOptions.ib",
      "onboarding.wizard.curriculumOptions.aLevel",
      "profile.peerBenchmark.cohortSize",
      "profile.recommendations.relationships.mentor",
    ]);
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
