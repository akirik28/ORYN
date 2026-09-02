import { describe, expect, test } from "vitest";
import enMessages from "@/messages/en.json";

/**
 * Same bar as __tests__/settings/plan-tier-view.test.tsx's "no urgency language on the
 * trial, anywhere on the page" — CEO's explicit constraint on this assignment, carried over
 * to the comparison limit-reached state: point at /settings/plan, state the fact, no
 * urgency. Unlike PlanTierView (a Client Component, rendered directly via
 * @testing-library/react in that test), both compare pages are async Server Components
 * with Supabase/next-intl-server dependencies — rendering them in a unit test would mean
 * mocking most of the page. What would actually drift here is the CATALOG COPY itself, so
 * this pins that directly: the exact strings both compare pages' locked state renders via
 * t("limitReachedTitle"/"limitReachedDescription"/"limitReachedCta").
 *
 * English only, matching plan-tier-view.test.tsx's own scope — the banned words are
 * English-specific phrases, not meaningful to check against the Turkish catalog.
 */
const URGENCY_WORDS = ["limited time", "hurry", "act now", "today only", "don't miss", "expires"];

const SECTIONS = [
  { namespace: "universities", label: "universities.comparePage" },
  { namespace: "opportunities", label: "opportunities.comparePage" },
] as const;

describe("comparison limit-reached copy carries no urgency language", () => {
  for (const { namespace, label } of SECTIONS) {
    const comparePage = (enMessages as unknown as Record<string, { comparePage: Record<string, string> }>)[namespace].comparePage;

    test(`${label}: limitReachedTitle/Description/Cta exist and are non-empty`, () => {
      expect(comparePage.limitReachedTitle).toBeTruthy();
      expect(comparePage.limitReachedDescription).toBeTruthy();
      expect(comparePage.limitReachedCta).toBeTruthy();
    });

    test(`${label}: none of the three strings use urgency language`, () => {
      const combined = `${comparePage.limitReachedTitle} ${comparePage.limitReachedDescription} ${comparePage.limitReachedCta}`.toLowerCase();
      for (const word of URGENCY_WORDS) {
        expect(combined).not.toContain(word);
      }
    });

    test(`${label}: the description points at the real upgrade destination, not a vague "somewhere"`, () => {
      // The string itself doesn't carry the link (the page renders a real <Link
      // href="/settings/plan">), but the copy should still name what changes on Ultra
      // rather than just "you're blocked" — otherwise the CTA is the only thing explaining
      // why it's worth clicking.
      expect(comparePage.limitReachedDescription).toMatch(/ultra/i);
    });
  }
});
