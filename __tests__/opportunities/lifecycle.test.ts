import { describe, expect, test } from "vitest";
import {
  INSUFFICIENT_VERIFICATION_REASON,
  MAX_VERIFICATION_AGE_DAYS,
  NEEDS_VERIFICATION_LABEL,
  NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES,
  type OpportunityVerificationFacts,
  deriveCycleStatusForPassedDeadline,
  filterActionableOpportunities,
  hasAnyVerificationRecord,
  hasDeadlineCommitment,
  insufficientVerificationReason,
  isOpportunityActionable,
  isOpportunityRecommendable,
  isOpportunitySufficientlyVerified,
  nonActionableOpportunityReason,
  resolveStoredEligibility,
} from "@/lib/opportunities/lifecycle";
import type { Opportunity } from "@/types/database";

const REFERENCE_DATE = new Date("2026-08-22T00:00:00");

function row(
  overrides: Partial<Pick<Opportunity, "status" | "cycle_status" | "deadline">> = {}
): Pick<Opportunity, "status" | "cycle_status" | "deadline"> {
  return {
    // Defaults to the only moderation state a student should ever be shown, so every
    // pre-existing case in this file keeps testing what it was written to test.
    status: "active",
    cycle_status: "unverified",
    deadline: null,
    ...overrides,
  };
}

/**
 * The moderation half of the gate, added 2026-08-31 after finding it was never enforced on
 * the recommendation path. `browse.ts` filtered `status = 'active'` in SQL so Browse was
 * clean, but "For you" reads `opportunity_matches`, fetches the referenced rows by id, and
 * re-checks them with `isOpportunityActionable` — which could not see `status` at all.
 * `refreshOpportunityMatches` only ever upserts, so every match row written before a record
 * was disabled survived and kept rendering.
 *
 * Live measurement that day: 67 match rows pointed at non-active opportunities, 59 passed the
 * check, across all 8 onboarded accounts — including a table-row fragment scraped as a title
 * ("Time: 4:30pm - 5:30pm (Hong Kong time)"), a bare course code, a 2023 cycle, and the
 * professional Stockholm Water Prize. Every one had been disabled by a researcher days
 * earlier and was still shown as "Strong match. It addresses a current gap in your profile."
 */
describe("isOpportunityActionable — moderation status", () => {
  test("a disabled opportunity is never actionable, however healthy its cycle looks", () => {
    expect(
      isOpportunityActionable(row({ status: "disabled", cycle_status: "open", deadline: "2027-01-01" }), REFERENCE_DATE)
    ).toBe(false);
  });

  test("under_review is excluded too — not yet vetted is not ready to recommend", () => {
    expect(
      isOpportunityActionable(
        row({ status: "under_review", cycle_status: "upcoming", deadline: "2027-04-01" }),
        REFERENCE_DATE
      )
    ).toBe(false);
  });

  test("expired is excluded", () => {
    expect(isOpportunityActionable(row({ status: "expired", cycle_status: "open" }), REFERENCE_DATE)).toBe(false);
  });

  test("only active passes — the exact shape that was leaking", () => {
    // Stockholm Water Prize as stored: disabled, but with a cycle_status and deadline that
    // the pre-fix check waved straight through.
    const leaked = { status: "disabled" as const, cycle_status: "unverified" as const, deadline: null };
    expect(isOpportunityActionable(leaked, REFERENCE_DATE)).toBe(false);
    expect(isOpportunityActionable({ ...leaked, status: "active" }, REFERENCE_DATE)).toBe(true);
  });

  test("filterActionableOpportunities drops non-active rows", () => {
    const rows = [
      row({ status: "active", cycle_status: "open" }),
      row({ status: "disabled", cycle_status: "open" }),
      row({ status: "under_review", cycle_status: "open" }),
    ];
    expect(filterActionableOpportunities(rows, REFERENCE_DATE)).toHaveLength(1);
  });

  test("the reason for a hidden row blames neither the student nor the programme", () => {
    const reason = nonActionableOpportunityReason(row({ status: "disabled", cycle_status: "open" }));
    // It must not claim the cycle closed or the deadline passed — both would be fabrications
    // about the programme — nor tell the student they don't qualify.
    expect(reason).not.toMatch(/closed|deadline has passed|not eligible|ineligible/i);
  });
});

describe("isOpportunityActionable", () => {
  test("is actionable when cycle_status is open and deadline is in the future", () => {
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-09-15" }), REFERENCE_DATE)).toBe(true);
  });

  test("is actionable when cycle_status is unverified and there is no deadline", () => {
    expect(isOpportunityActionable(row({ cycle_status: "unverified", deadline: null }), REFERENCE_DATE)).toBe(true);
  });

  test("is actionable when cycle_status is upcoming and there is no deadline yet", () => {
    expect(isOpportunityActionable(row({ cycle_status: "upcoming", deadline: null }), REFERENCE_DATE)).toBe(true);
  });

  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`is never actionable when cycle_status is '${cycleStatus}', even with a future deadline`, () => {
      expect(isOpportunityActionable(row({ cycle_status: cycleStatus, deadline: "2027-01-01" }), REFERENCE_DATE)).toBe(false);
    });

    test(`is never actionable when cycle_status is '${cycleStatus}' with no deadline at all`, () => {
      expect(isOpportunityActionable(row({ cycle_status: cycleStatus, deadline: null }), REFERENCE_DATE)).toBe(false);
    });
  }

  test("is not actionable once its deadline has passed, even if cycle_status was never updated (the Boston University Tanglewood case)", () => {
    // Confirmed live 2026-08-22: this exact row already carries cycle_status='historical' in
    // production, but the read-time date check must independently catch a passed deadline on
    // any row whose cycle_status hasn't (yet) been corrected -- that's the whole point of
    // defense in depth rather than trusting a single field.
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-01-25" }), REFERENCE_DATE)).toBe(false);
  });

  test("treats the deadline as actionable through the end of its own day", () => {
    const sameDayAsReference = new Date("2026-08-22T23:00:00");
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-08-22" }), sameDayAsReference)).toBe(true);
  });

  test("is not actionable the instant the deadline day has fully elapsed", () => {
    const dayAfter = new Date("2026-08-23T00:00:01");
    expect(isOpportunityActionable(row({ cycle_status: "open", deadline: "2026-08-22" }), dayAfter)).toBe(false);
  });

  test("cannot detect a closed cycle from stored data alone when cycle_status is unverified and deadline is null (the Stanford SASI case)", () => {
    // Confirmed live 2026-08-22: Stanford Anesthesia Summer Institute is active,
    // cycle_status='upcoming', deadline null, while its own page says all three 2026 tracks
    // are "APPLICATIONS NOW CLOSED." This is the honest limit of a stored-data-only rule --
    // it reads as actionable here because nothing in the row says otherwise.
    expect(isOpportunityActionable(row({ cycle_status: "upcoming", deadline: null }), REFERENCE_DATE)).toBe(true);
  });
});

describe("NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES", () => {
  test("contains exactly the three cycle_status values that mean a real, correctly-sourced but non-actionable record", () => {
    expect([...NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES].sort()).toEqual(["closed", "discontinued", "historical"]);
  });

  test("does not include disabled/under_review semantics -- those live on `status`, not `cycle_status`", () => {
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("unverified")).toBe(false);
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("open")).toBe(false);
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("upcoming")).toBe(false);
    expect(NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has("date_not_announced")).toBe(false);
  });
});

describe("deriveCycleStatusForPassedDeadline", () => {
  test("derives 'closed' once a deadline has passed and cycle_status hasn't caught up", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "open", deadline: "2026-02-01" }), REFERENCE_DATE)).toBe("closed");
  });

  test("derives 'closed' from 'unverified' once a deadline has passed", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "unverified", deadline: "2026-02-01" }), REFERENCE_DATE)).toBe("closed");
  });

  test("proposes no change when the deadline is still in the future", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "open", deadline: "2027-01-01" }), REFERENCE_DATE)).toBeNull();
  });

  test("proposes no change when there is no deadline to reason from", () => {
    expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: "unverified", deadline: null }), REFERENCE_DATE)).toBeNull();
  });

  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`never overwrites an already non-actionable cycle_status ('${cycleStatus}')`, () => {
      expect(deriveCycleStatusForPassedDeadline(row({ cycle_status: cycleStatus, deadline: "2026-02-01" }), REFERENCE_DATE)).toBeNull();
    });
  }

  test("never invents 'historical' or 'discontinued' -- a passed date alone only ever proposes 'closed'", () => {
    const result = deriveCycleStatusForPassedDeadline(row({ cycle_status: "open", deadline: "2020-01-01" }), REFERENCE_DATE);
    expect(result).toBe("closed");
  });
});

describe("nonActionableOpportunityReason", () => {
  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`names the cycle status when that is the reason ('${cycleStatus}')`, () => {
      expect(nonActionableOpportunityReason(row({ cycle_status: cycleStatus }))).toBe(
        `This opportunity's current cycle is ${cycleStatus}.`
      );
    });
  }

  test("names the passed deadline, never the cycle status, when the cycle status is still actionable", () => {
    // The GENIUS Olympiad case: describing this row by its cycle_status would produce "next
    // dates not announced" -- true, and no help at all in explaining why the student can't act.
    const reason = nonActionableOpportunityReason(row({ cycle_status: "date_not_announced", deadline: "2026-03-07" }));
    expect(reason).toBe("This opportunity's application deadline has passed.");
  });

  test("never claims a cycle is open one sentence away from an ineligible verdict", () => {
    expect(nonActionableOpportunityReason(row({ cycle_status: "open", deadline: "2020-01-01" }))).not.toMatch(/current cycle is open/i);
  });

  test("renders a multi-word cycle status readably rather than as a raw enum value", () => {
    expect(nonActionableOpportunityReason(row({ cycle_status: "historical" }))).not.toMatch(/_/);
  });

  test("omitting locale is identical to passing 'en' explicitly (default-locale backward compatibility)", () => {
    expect(nonActionableOpportunityReason(row({ cycle_status: "closed" }))).toBe(nonActionableOpportunityReason(row({ cycle_status: "closed" }), "en"));
  });

  describe("locale: tr", () => {
    for (const [cycleStatus, label] of [
      ["closed", "kapandı"],
      ["historical", "artık düzenlenmiyor"],
      ["discontinued", "iptal edildi"],
    ] as const) {
      test(`names the cycle status in Turkish ('${cycleStatus}')`, () => {
        expect(nonActionableOpportunityReason(row({ cycle_status: cycleStatus }), "tr")).toBe(`Bu fırsatın mevcut dönemi: ${label}.`);
      });
    }

    test("names the passed deadline in Turkish", () => {
      expect(nonActionableOpportunityReason(row({ cycle_status: "date_not_announced", deadline: "2026-03-07" }), "tr")).toBe(
        "Bu fırsatın başvuru son tarihi geçti."
      );
    });

    test("names a hidden/moderated row in Turkish without blaming the student or the programme", () => {
      const reason = nonActionableOpportunityReason(row({ status: "disabled", cycle_status: "open" }), "tr");
      expect(reason).toBe("Proxola bu fırsatı şu anda göstermiyor.");
    });
  });
});

describe("insufficientVerificationReason", () => {
  test("English branch returns the exact same string as the INSUFFICIENT_VERIFICATION_REASON constant", () => {
    expect(insufficientVerificationReason()).toBe(INSUFFICIENT_VERIFICATION_REASON);
    expect(insufficientVerificationReason("en")).toBe(INSUFFICIENT_VERIFICATION_REASON);
  });

  test("Turkish branch is a distinct, real Turkish sentence", () => {
    const tr = insufficientVerificationReason("tr");
    expect(tr).not.toBe(INSUFFICIENT_VERIFICATION_REASON);
    expect(tr).toMatch(/doğrulamadı/);
    expect(tr).toMatch(/resmi sayfayı kontrol edin/);
  });
});

/**
 * The read-time gate over a stored opportunity_matches verdict. persist-matches.ts never
 * deletes a match row once its opportunity stops being actionable, so `eligible: true` written
 * before a cycle closed persists indefinitely -- 74 opportunities across 259 (student,
 * opportunity) pairs live on 2026-08-23.
 */
// 2026-09-03 (eligibility_notes -> codes): `stored.notes` is EligibilityNote[] now, not
// arbitrary prose -- `resolveStoredEligibility`'s actionable branch renders it via
// renderEligibilityNotes/eligibilityMessages, so these assertions check real, predictable
// rendered output for a real code, not a hand-typed string the function used to pass through
// untouched. `referenceDate` stays positional arg 3, unchanged -- `locale` was added after it,
// not before, specifically so every call here keeps working with no argument-order edit.
describe("resolveStoredEligibility", () => {
  test("passes an actionable opportunity's stored eligible verdict through untouched", () => {
    const resolved = resolveStoredEligibility(row({ cycle_status: "open", deadline: "2026-09-15" }), { eligible: true, notes: [] }, REFERENCE_DATE);
    // eligibilityGap: null (2026-09-05, CEO's badge-collapse finding) -- classifyEligibilityGap
    // of an empty notes array is always null, see its own dedicated tests in matching.test.ts.
    expect(resolved).toEqual({ eligible: true, notes: null, notActionable: false, eligibilityGap: null });
  });

  test("renders an actionable opportunity's stored INELIGIBLE verdict -- the gate only ever removes a claim, it doesn't rewrite a real one", () => {
    const resolved = resolveStoredEligibility(
      row({ cycle_status: "open", deadline: "2026-09-15" }),
      { eligible: false, notes: [{ code: "country_not_eligible", params: { studentCountry: "Turkey" } }] },
      REFERENCE_DATE
    );
    // eligibilityGap stays null here too -- country_not_eligible is a genuine confirmed
    // exclusion, not one of the two "unknown" codes classifyEligibilityGap looks for.
    expect(resolved).toEqual({ eligible: false, notes: "Not currently open to students from Turkey.", notActionable: false, eligibilityGap: null });
  });

  test("renders an actionable opportunity's unknown-eligibility note from its stored code", () => {
    const resolved = resolveStoredEligibility(row({ cycle_status: "upcoming", deadline: null }), { eligible: true, notes: [{ code: "country_unknown" }] }, REFERENCE_DATE);
    expect(resolved.eligible).toBe(true);
    expect(resolved.notes).toBe("Restricted by country — add your country to check.");
  });

  for (const cycleStatus of ["closed", "historical", "discontinued"] as const) {
    test(`overrides a stale eligible: true once the cycle is '${cycleStatus}'`, () => {
      const resolved = resolveStoredEligibility(row({ cycle_status: cycleStatus }), { eligible: true, notes: [] }, REFERENCE_DATE);
      expect(resolved.eligible).toBe(false);
      expect(resolved.notes).toBe(`This opportunity's current cycle is ${cycleStatus}.`);
      expect(resolved.notActionable).toBe(true);
    });
  }

  test("overrides a stale eligible: true once the deadline has passed, even with an actionable cycle_status", () => {
    const resolved = resolveStoredEligibility(row({ cycle_status: "date_not_announced", deadline: "2026-03-07" }), { eligible: true, notes: [] }, REFERENCE_DATE);
    expect(resolved.eligible).toBe(false);
    expect(resolved.notes).toBe("This opportunity's application deadline has passed.");
    expect(resolved.notActionable).toBe(true);
  });

  test("replaces a stale per-student note with the lifecycle reason rather than showing both", () => {
    const resolved = resolveStoredEligibility(row({ cycle_status: "closed" }), { eligible: true, notes: [{ code: "country_unknown" }] }, REFERENCE_DATE);
    expect(resolved.notes).toBe("This opportunity's current cycle is closed.");
  });

  test("marks notActionable only for the lifecycle case, so a genuine per-student mismatch still reads as 'not eligible'", () => {
    const lifecycle = resolveStoredEligibility(row({ cycle_status: "closed" }), { eligible: true, notes: [] }, REFERENCE_DATE);
    const perStudent = resolveStoredEligibility(
      row({ cycle_status: "open", deadline: "2026-09-15" }),
      { eligible: false, notes: [{ code: "grade_not_eligible", params: { eligibleGrades: "11, 12", currentGrade: 10 } }] },
      REFERENCE_DATE
    );
    expect(lifecycle.notActionable).toBe(true);
    expect(perStudent.notActionable).toBe(false);
  });

  test("agrees with isOpportunityActionable on the deadline boundary -- still eligible through the end of the deadline day", () => {
    const sameDay = new Date("2026-08-22T23:00:00");
    expect(resolveStoredEligibility(row({ cycle_status: "open", deadline: "2026-08-22" }), { eligible: true, notes: [] }, sameDay).eligible).toBe(true);
    const dayAfter = new Date("2026-08-23T00:00:01");
    expect(resolveStoredEligibility(row({ cycle_status: "open", deadline: "2026-08-22" }), { eligible: true, notes: [] }, dayAfter).eligible).toBe(false);
  });

  // 2026-09-05, CEO's badge-collapse finding: this is the exact function both
  // features/opportunities/opportunity-card.tsx and app/(app)/opportunities/[id]/page.tsx
  // read `eligibilityGap` from to decide the badge — proven once here rather than only at the
  // card's own render-test layer, since the detail page shares this function and has no
  // dedicated render test of its own (a full page-level harness is a much larger undertaking
  // than this fix; see __tests__/opportunities/opportunity-card-eligibility-badge.test.tsx's
  // own header for the fuller reasoning C7 already established for this kind of tradeoff).
  describe("eligibilityGap", () => {
    test("classifies a student-side unknown as profile_incomplete on the actionable branch", () => {
      const resolved = resolveStoredEligibility(row({ cycle_status: "open", deadline: "2026-09-15" }), { eligible: true, notes: [{ code: "age_unknown" }] }, REFERENCE_DATE);
      expect(resolved.eligibilityGap).toBe("profile_incomplete");
    });

    test("classifies a researched-but-silent note as checked_not_stated on the actionable branch", () => {
      const resolved = resolveStoredEligibility(
        row({ cycle_status: "open", deadline: "2026-09-15" }),
        { eligible: true, notes: [{ code: "age_eligibility_checked_not_stated", params: { checkedAt: "" } }] },
        REFERENCE_DATE
      );
      expect(resolved.eligibilityGap).toBe("checked_not_stated");
    });

    test("is always null on the non-actionable (closed/historical/discontinued/past-deadline) branch, regardless of the stored notes", () => {
      const resolved = resolveStoredEligibility(row({ cycle_status: "closed" }), { eligible: true, notes: [{ code: "age_unknown" }] }, REFERENCE_DATE);
      expect(resolved.eligibilityGap).toBeNull();
    });
  });
});

describe("filterActionableOpportunities", () => {
  test("removes closed-cycle and expired-deadline rows while keeping actionable ones", () => {
    const rows = [
      { id: "a", ...row({ cycle_status: "open", deadline: "2026-09-01" }) },
      { id: "b", ...row({ cycle_status: "closed", deadline: "2027-01-01" }) },
      { id: "c", ...row({ cycle_status: "open", deadline: "2026-01-01" }) },
      { id: "d", ...row({ cycle_status: "unverified", deadline: null }) },
    ];
    const result = filterActionableOpportunities(rows, REFERENCE_DATE);
    expect(result.map((r) => r.id)).toEqual(["a", "d"]);
  });

  test("returns an empty array unchanged", () => {
    expect(filterActionableOpportunities([], REFERENCE_DATE)).toEqual([]);
  });
});

/**
 * The third lifecycle gate: evidence, not dates.
 *
 * `isOpportunityActionable` can only see what a date tells it, and lifecycle.ts's own comment
 * names the blind spot it cannot close — an opportunity that quietly closed with no deadline
 * ever recorded.
 *
 * The gate as first shipped (#143) read `last_verified_at IS NULL` as "never verified." That
 * premise was false. `opportunities` carries TWO verification timestamps — `last_verified_at`
 * (migration 0008) and `verified_at` (migration 0041) — and measured across all 392 rows on
 * 2026-08-23, the number with BOTH null is zero. `last_verified_at IS NULL` selected the 85 rows
 * written by the 0041-era research pipeline, which recorded into `verified_at` instead; all 85
 * carry `verification_state='verified_current'`. So the gate excluded 51 verified, high-confidence
 * opportunities on the basis of which pipeline generation wrote them.
 *
 * These tests pin both halves of the corrected rule: a legacy-generation row is NOT gated, and
 * a row with genuinely no evidence of any kind still is — plus the three distinctions that make
 * the gate honest rather than a new lie: the row is NOT closed, the student is NOT ineligible,
 * the evidence is insufficient.
 */
function freshnessRow(
  overrides: Partial<OpportunityVerificationFacts> = {}
): OpportunityVerificationFacts {
  return { deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null, ...overrides };
}

describe("isOpportunitySufficientlyVerified", () => {
  // Coverage requirement 1 — a verified, current opportunity still surfaces normally.
  test("a verified opportunity with a real deadline is sufficiently verified", () => {
    expect(
      isOpportunitySufficientlyVerified(freshnessRow({ deadline: "2026-09-15", last_verified_at: "2026-08-20T00:00:00Z" }))
    ).toBe(true);
  });

  // Coverage requirement 2 — no deadline AND no verification record of ANY kind is the gated
  // shape. Note both timestamps must be absent: `freshnessRow` defaults `verified_at` to null.
  test("a row with no deadline and no verification record of any kind is NOT sufficiently verified", () => {
    expect(
      isOpportunitySufficientlyVerified(freshnessRow({ deadline: null, last_verified_at: null, verified_at: null }))
    ).toBe(false);
  });

  test("either leg alone is enough to pass -- the gate needs BOTH absences, so it stays narrow", () => {
    // A deadline on file is a dated commitment about this cycle, verified or not.
    expect(isOpportunitySufficientlyVerified(freshnessRow({ deadline: "2026-12-01", last_verified_at: null }))).toBe(true);
    // A verification timestamp means a human or job actually looked at the source page.
    expect(isOpportunitySufficientlyVerified(freshnessRow({ deadline: null, last_verified_at: "2026-08-15T00:00:00Z" }))).toBe(true);
  });

  test("undefined timestamps are treated the same as null -- a row predating a column is not evidence", () => {
    // Read defensively, the same way eligibility.ts reads eligible_citizenships: a row fetched
    // from an environment whose migration hasn't run genuinely has no key at all.
    const legacy = { deadline: null } as OpportunityVerificationFacts;
    expect(isOpportunitySufficientlyVerified(legacy)).toBe(false);
  });

  test("no maximum verification age is enforced today, and the corpus proves an age rule would be a no-op", () => {
    // Measured 2026-08-23: oldest last_verified_at across the whole corpus is 2026-08-15 and
    // zero rows are older than 30 days. Shipping an age threshold now would look like a
    // working guard while excluding nothing. The seam exists; the threshold is explicitly off.
    expect(MAX_VERIFICATION_AGE_DAYS).toBeNull();
    const ancient = freshnessRow({ deadline: null, last_verified_at: "2019-01-01T00:00:00Z" });
    expect(isOpportunitySufficientlyVerified(ancient)).toBe(true);
  });
});

/**
 * Regression (#143 follow-up) — the gate must fire on absence of evidence, never on which
 * pipeline generation wrote the row.
 *
 * `opportunities` carries two verification timestamps. `last_verified_at` arrived in migration
 * 0008 (Phase 29 freshness); `verified_at` arrived in migration 0041 alongside
 * `verification_state`. Different generations of the ingest pipeline wrote different ones.
 *
 * Measured live 2026-08-23 across all 392 rows:
 *   - both timestamps null ............................. 0
 *   - `last_verified_at` null, `verified_at` set ....... 85  (all `verified_current`)
 *   - excluded by the gate as first shipped ............ 51  (all `verified_current`, all
 *                                                            `source_confidence='high'`,
 *                                                            all verified 2026-08-15..08-21)
 *
 * The 85 are precisely `source='official_primary'` rows — the corpus's highest-provenance
 * pipeline (156 rows, 156 `verified_current`). Meanwhile 199 rows that DO carry
 * `last_verified_at` are not `verified_current` at all, and `lib/opportunities/discover.ts`
 * stamps `last_verified_at` at insert time straight from a Tavily web search. So the original
 * predicate was not merely mis-targeted, it was anti-correlated with provenance quality:
 * it blocked hand-researched rows and waved through unattended search results.
 *
 * These tests would all have passed a `verified_at ?? last_verified_at` substitution too, so
 * they are deliberately paired with the age tests below: `verified_at` is weak provenance
 * (138 of its 201 values are exactly midnight UTC — hand-entered dates) and must never be
 * treated as a freshness measurement. Its presence is used here as a floor against total
 * absence of evidence, and for nothing else.
 */
describe("Regression -- a legacy-generation row is not gated on pipeline lineage", () => {
  // The exact live shape: no deadline, no `last_verified_at`, but a real `verified_at` and
  // `verification_state='verified_current'`. 51 rows in the catalogue looked like this.
  const legacyGeneration = {
    status: "active" as const,
    deadline: null,
    last_verified_at: null,
    verified_at: "2026-08-18T00:00:00Z",
    source_verified_at: null,
  };

  test("a row verified through `verified_at` alone is sufficiently verified", () => {
    expect(isOpportunitySufficientlyVerified(legacyGeneration)).toBe(true);
  });

  test("it is recommendable when its cycle is otherwise fine -- the 51 stop being excluded", () => {
    expect(isOpportunityRecommendable({ ...legacyGeneration, cycle_status: "upcoming" }, REFERENCE_DATE)).toBe(true);
    expect(isOpportunityRecommendable({ ...legacyGeneration, cycle_status: "open" }, REFERENCE_DATE)).toBe(true);
    expect(
      isOpportunityRecommendable({ ...legacyGeneration, cycle_status: "date_not_announced" }, REFERENCE_DATE)
    ).toBe(true);
  });

  test("the gate still fires when there is genuinely no evidence at all -- the mechanism survives", () => {
    // Zero rows in today's corpus, which is the truth about this corpus rather than a reason to
    // delete the rule. Both columns are nullable with NULL defaults, so the shape is
    // constructible, and Phase 30 (docs/opportunity-reverification-job-design-2026-08-23.md)
    // is what gives this seam a real signal.
    expect(
      isOpportunityRecommendable(
        { status: "active" as const, cycle_status: "upcoming", deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null },
        REFERENCE_DATE
      )
    ).toBe(false);
  });

  test("lineage is not freshness: an ANCIENT `verified_at` is still not excluded on age", () => {
    // The guard against re-introducing the same bug in the other direction. `verified_at` is
    // hand-entered midnight data; turning it into an age measurement would manufacture the
    // certainty this fix exists to remove. No age rule may run against either legacy column.
    expect(MAX_VERIFICATION_AGE_DAYS).toBeNull();
    expect(
      isOpportunitySufficientlyVerified({ deadline: null, last_verified_at: null, verified_at: "2019-01-01T00:00:00Z", source_verified_at: null })
    ).toBe(true);
  });

  test("#140/#141 still exclude a legacy-generation row -- the older rules are untouched", () => {
    // A rescued row is rescued only from the FRESHNESS gate. A closed cycle or a passed
    // deadline must still exclude it, or this fix would have widened the hole #140/#141 closed.
    expect(isOpportunityRecommendable({ ...legacyGeneration, cycle_status: "closed" }, REFERENCE_DATE)).toBe(false);
    expect(isOpportunityRecommendable({ ...legacyGeneration, cycle_status: "historical" }, REFERENCE_DATE)).toBe(false);
    expect(isOpportunityRecommendable({ ...legacyGeneration, cycle_status: "discontinued" }, REFERENCE_DATE)).toBe(false);
    expect(
      isOpportunityRecommendable(
        { ...legacyGeneration, cycle_status: "open", deadline: "2026-01-01" },
        REFERENCE_DATE
      )
    ).toBe(false);
  });
});

/**
 * The existence check itself, kept honest: neither timestamp outranks the other, and neither is
 * ever measured. They differ by which pipeline generation wrote the row, not by trustworthiness.
 */
describe("hasAnyVerificationRecord", () => {
  test("either timestamp alone counts as a record, and both-absent does not", () => {
    expect(hasAnyVerificationRecord(freshnessRow({ last_verified_at: "2026-08-20T00:00:00Z" }))).toBe(true);
    expect(hasAnyVerificationRecord(freshnessRow({ verified_at: "2026-08-18T00:00:00Z" }))).toBe(true);
    expect(hasAnyVerificationRecord(freshnessRow({ last_verified_at: null, verified_at: null }))).toBe(false);
  });

  test("a row missing the keys entirely is not evidence -- read defensively, not type-trustingly", () => {
    // A row fetched from an environment whose migration hasn't run has no key at all.
    expect(hasAnyVerificationRecord({ deadline: null } as OpportunityVerificationFacts)).toBe(false);
  });
});

/**
 * The Phase 30 seam. `MAX_VERIFICATION_AGE_DAYS` is null today, so these pin the CONTRACT rather
 * than live behaviour: when a real number is eventually set, it must be measured against a
 * machine check and never against the two legacy columns, and it must not mass-exclude rows the
 * job simply hasn't reached yet (docs/opportunity-reverification-job-design-2026-08-23.md §3.3).
 */
describe("the age threshold is wired to a machine check, not to the legacy columns", () => {
  test("no age gating happens at all while the threshold is off", () => {
    expect(MAX_VERIFICATION_AGE_DAYS).toBeNull();
    expect(
      isOpportunitySufficientlyVerified({
        deadline: null,
        last_verified_at: null,
        verified_at: "2019-01-01T00:00:00Z",
        source_verified_at: "2019-01-01T00:00:00Z",
      })
    ).toBe(true);
  });

  test("`source_verified_at` is null on every row until the reverification job runs, so the seam is inert", () => {
    // Migration 0103 -- a real, required column now (not the bolted-on optional field this
    // used to be), but design doc §8.6's "no backfill" means it starts null on every row and
    // stays null until lib/opportunities/reverification/'s job writes a real P1 outcome. A
    // null here must never read as stale (§7.2a's corollary) -- pinned here even though the
    // column is now real, because its MEANING while null is unchanged from before it existed.
    const row: OpportunityVerificationFacts = { deadline: null, last_verified_at: null, verified_at: "2026-08-18T00:00:00Z", source_verified_at: null };
    expect(row.source_verified_at).toBeNull();
    expect(isOpportunitySufficientlyVerified(row)).toBe(true);
  });
});

/**
 * Coverage requirement 4 — a verified ROLLING opportunity can pass, written against the seam
 * rather than against a schema concept that does not exist yet.
 *
 * `deadline_mode` is approved in principle and deliberately not implemented, so `Opportunity`
 * has no such column. `hasDeadlineCommitment` is the seam: it asks "is there a dated
 * commitment about intake on file?", of which a `deadline` is one form and an explicit
 * no-single-date declaration is the other. It reads `deadline_mode` defensively (optional key,
 * same pattern eligibility.ts already uses for eligible_citizenships), so these assertions hold
 * today and keep holding, unchanged, once the column is real.
 */
describe("hasDeadlineCommitment -- the rolling seam", () => {
  test("a concrete deadline is a commitment", () => {
    expect(hasDeadlineCommitment(freshnessRow({ deadline: "2026-11-01" }))).toBe(true);
  });

  test("no deadline and no declared mode is NOT a commitment -- this is the gap the gate detects", () => {
    expect(hasDeadlineCommitment(freshnessRow({ deadline: null }))).toBe(false);
  });

  test("an explicit rolling declaration is a commitment even with a null deadline", () => {
    // The distinction the seam exists to draw: "no deadline because there isn't one" is a
    // researched fact; "no deadline because nobody looked" is the absence of one.
    expect(hasDeadlineCommitment({ deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null, deadline_mode: "rolling" })).toBe(true);
  });

  test("a verified rolling opportunity passes the freshness gate", () => {
    expect(
      isOpportunitySufficientlyVerified({
        deadline: null,
        last_verified_at: "2026-08-20T00:00:00Z",
        verified_at: null,
        source_verified_at: null,
        deadline_mode: "rolling",
      })
    ).toBe(true);
  });

  test("a rolling declaration rescues a row even with no verification record at all", () => {
    // The two legs are independent: an explicit "there is no single date, by design" is itself
    // a researched commitment, so it passes without either timestamp.
    expect(
      isOpportunitySufficientlyVerified({ deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null, deadline_mode: "rolling" })
    ).toBe(true);
  });

  test("an unrecognized deadline_mode is not silently treated as a commitment", () => {
    expect(hasDeadlineCommitment({ deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null, deadline_mode: "sometime" })).toBe(false);
    expect(hasDeadlineCommitment({ deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null, deadline_mode: null })).toBe(false);
  });
});

describe("isOpportunityRecommendable -- the composed gate every recommendation path calls", () => {
  const verifiedAndOpen = {
    status: "active" as const,
    cycle_status: "open" as const,
    deadline: "2026-09-15",
    last_verified_at: "2026-08-20T00:00:00Z",
    verified_at: null,
    source_verified_at: null,
  };

  test("a verified, current opportunity is recommendable", () => {
    expect(isOpportunityRecommendable(verifiedAndOpen, REFERENCE_DATE)).toBe(true);
  });

  test("the freshness gate composes with -- never replaces -- the two existing rules", () => {
    // Regression guard for #140/#141: each existing rule must still exclude on its own.
    expect(isOpportunityRecommendable({ ...verifiedAndOpen, cycle_status: "closed" }, REFERENCE_DATE)).toBe(false);
    expect(isOpportunityRecommendable({ ...verifiedAndOpen, deadline: "2026-01-01" }, REFERENCE_DATE)).toBe(false);
    expect(isOpportunityRecommendable({ ...verifiedAndOpen, status: "disabled" }, REFERENCE_DATE)).toBe(false);
    expect(
      isOpportunityRecommendable(
        { status: "active" as const, cycle_status: "upcoming", deadline: null, last_verified_at: null, verified_at: null, source_verified_at: null },
        REFERENCE_DATE
      )
    ).toBe(false);
  });
});

/**
 * Coverage requirement 5 (the shared half) — the wording. A gated opportunity is not closed and
 * the student is not ineligible; saying either would replace one product lie with another.
 */
describe("insufficient-verification wording", () => {
  test('the badge reads "Needs verification"', () => {
    expect(NEEDS_VERIFICATION_LABEL).toBe("Needs verification");
  });

  test("neither the label nor the note claims the opportunity is closed", () => {
    for (const copy of [NEEDS_VERIFICATION_LABEL, INSUFFICIENT_VERIFICATION_REASON]) {
      expect(copy).not.toMatch(/closed|no longer|expired|deadline has passed/i);
    }
  });

  test("neither the label nor the note tells the student they are ineligible", () => {
    for (const copy of [NEEDS_VERIFICATION_LABEL, INSUFFICIENT_VERIFICATION_REASON]) {
      expect(copy).not.toMatch(/not eligible|ineligible|don't qualify|do not qualify/i);
    }
  });

  test("the note is distinct from the two non-actionable reasons, so surfaces can't conflate them", () => {
    expect(INSUFFICIENT_VERIFICATION_REASON).not.toBe(nonActionableOpportunityReason(row({ cycle_status: "closed" })));
    expect(INSUFFICIENT_VERIFICATION_REASON).not.toBe(nonActionableOpportunityReason(row({ cycle_status: "open", deadline: "2020-01-01" })));
    expect(INSUFFICIENT_VERIFICATION_REASON).toMatch(/verif/i);
  });
});
