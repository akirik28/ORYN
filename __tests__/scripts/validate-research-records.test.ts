/**
 * First test suite for scripts/validate-research-records.ts — RES-V1 package V1-7.
 *
 * WHY THIS EXISTS: the tool shipped nine real bugs across the packages that used it (see
 * docs/research/verification/v1-lane-closeout-2026-08-22.md §3 for the full catalog),
 * every one caught only because a human read a sample of actual output before trusting a
 * count — never because a rule looked correct on paper. This suite exists to stop that
 * being the only line of defense. It is weighted, per ORYN-BASORG's brief, toward:
 *   1. FALSE POSITIVES — a rule too strict, firing on legitimate input (the class that
 *      would have failed 8 correct DLOPP-P1 records had the found_deadline gate shipped
 *      as first written — §"DLOPP_CONTRACT.logicalRules" below).
 *   2. THE ESCAPE HATCHES — allowKeysetVariation and customLiveChecks, since interface
 *      additions are exactly where per-lane assumptions leak back in.
 *   3. ID MATCHING BY REAL id-FIELD VALUES, NEVER SUBSTRING — with ECW4-021's
 *      prose-citation case as a named regression test.
 *
 * WHAT THIS SUITE DOES NOT COVER — the standing condition from the closeout doc is still
 * true after these tests exist, not superseded by them:
 *   - checkIdDiscipline's git-plumbing loop itself (branch enumeration via `git branch
 *     -r`, blob hashing via `git hash-object`/`git rev-parse`/`git show`) is real process
 *     orchestration, not logic — deliberately left untested here as an integration
 *     concern. What WAS extracted and IS tested is the two places real bugs actually
 *     lived inside that loop: the origin/HEAD branch filter (filterRealBranches) and the
 *     substring-vs-JSON id matching (findIdCollisionsInFileContent).
 *   - main() (the CLI entry) is thin orchestration over the pieces tested here — not
 *     separately covered.
 *   - AU_R1_CONTRACT.customLiveChecks's university-RESOLUTION step (resolveUniversity)
 *     already has its own dedicated suite in __tests__/programs/ingest.test.ts; not
 *     re-tested here. Its duplicate-URL and postgraduate-leakage-scan sub-checks are
 *     simple, low-risk, and also not separately covered — only the taxonomy-consistency
 *     piece (findTaxonomyConsistencyGaps), the one that found a real gap, is extracted
 *     and tested below.
 *   - Hand-running the tool with manual output inspection was an acceptable substitute
 *     for tests so far. It is not an acceptable substitute for wiring this tool into any
 *     AUTOMATIC path (a CI gate, an auto-ingestion precondition, an unattended scheduled
 *     re-run) — this suite is what that precondition requires, not a replacement for
 *     continuing to read a sample of real output by hand.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  AU_R1_CONTRACT,
  DLOPP_CONTRACT,
  ECW_CONTRACT,
  checkContract,
  checkLiveIdentityAndVocab,
  checkWithinBatchIdDiscipline,
  filterRealBranches,
  findIdCollisionsInFileContent,
  findTaxonomyConsistencyGaps,
  type Json,
  type LaneContract,
} from "@/scripts/validate-research-records";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function findMonotonicityCheck(contract: LaneContract, name: string) {
  const check = contract.monotonicityChecks?.find((c) => c.name === name);
  if (!check) throw new Error(`no such monotonicity check on ${contract.id}: "${name}"`);
  return check;
}

/** Minimal PostgREST stand-in for the opportunities table, matching the shape
 * fetchLiveRows/customLiveChecks actually request: reads the id=in.(...) filter out of
 * the URL and returns whichever of the given rows are asked for. */
function stubOpportunitiesFetch(rowsById: Record<string, Record<string, unknown>>) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const inMatch = url.search.match(/id=in\.\(([^)]*)\)/);
    const ids = inMatch ? decodeURIComponent(inMatch[1]).split(",") : [];
    const rows = ids.filter((id) => id in rowsById).map((id) => ({ id, ...rowsById[id] }));
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => rows,
      text: async () => "",
    } as unknown as Response;
  });
}

// -----------------------------------------------------------------------------------
// checkContract — generic engine, tested against a small purpose-built contract so it
// stays robust to the real lanes' own required-field lists changing shape later.
// -----------------------------------------------------------------------------------

const MINI_CONTRACT: LaneContract = {
  id: "mini",
  description: "test fixture",
  idField: "id",
  idPrefix: "MINI-",
  requiredFields: ["id", "title"],
  logicalRules: () => [],
};

describe("checkContract", () => {
  test("flags a missing required field", () => {
    const defects = checkContract([{ id: "MINI-1" }], MINI_CONTRACT);
    expect(defects).toContain('MINI-1: missing required field "title"');
  });

  test("does not flag a record with every required field present", () => {
    const defects = checkContract([{ id: "MINI-1", title: "x" }], MINI_CONTRACT);
    expect(defects).toEqual([]);
  });

  test("flags keyset drift when two records don't share one field set", () => {
    const defects = checkContract(
      [
        { id: "MINI-1", title: "x" },
        { id: "MINI-2", title: "y", extra: "unexpected" },
      ],
      MINI_CONTRACT
    );
    expect(defects.some((d) => d.includes("distinct field keysets"))).toBe(true);
  });

  test("allowKeysetVariation suppresses the keyset-drift defect, but requiredFields is still enforced", () => {
    const variableContract: LaneContract = { ...MINI_CONTRACT, allowKeysetVariation: true };
    const defects = checkContract(
      [
        { id: "MINI-1", title: "x" },
        { id: "MINI-2", title: "y", extra: "atar-like additive field" },
        { id: "MINI-3" }, // missing title — must still be caught
      ],
      variableContract
    );
    expect(defects.some((d) => d.includes("distinct field keysets"))).toBe(false);
    expect(defects).toContain('MINI-3: missing required field "title"');
  });
});

// -----------------------------------------------------------------------------------
// filterRealBranches — bug #1 regression: `git branch -r` lists origin/HEAD as a bare
// `origin` entry, which the first version fed straight into the collision-check loop.
// -----------------------------------------------------------------------------------

describe("filterRealBranches", () => {
  test("drops the bare origin/HEAD symref, keeps real origin/<branch> entries", () => {
    expect(filterRealBranches(["origin", "origin/main", "origin/oryn/res-r2-summer-programs", ""])).toEqual([
      "origin/main",
      "origin/oryn/res-r2-summer-programs",
    ]);
  });

  test("trims whitespace the way git's --format output actually has around it", () => {
    expect(filterRealBranches(["  origin/main  "])).toEqual(["origin/main"]);
  });
});

// -----------------------------------------------------------------------------------
// checkWithinBatchIdDiscipline — the supersession-awareness fix from V1-5: a record
// carrying supersedes_record_id must not be flagged as "same live row researched twice."
// -----------------------------------------------------------------------------------

const FK_CONTRACT: LaneContract = {
  id: "fk-mini",
  description: "test fixture",
  idField: "research_record_id",
  idPrefix: "MINI-",
  requiredFields: [],
  foreignKeyField: "opportunity_id",
  logicalRules: () => [],
};

describe("checkWithinBatchIdDiscipline", () => {
  test("flags a duplicate record id within the batch", () => {
    const defects = checkWithinBatchIdDiscipline(
      [
        { research_record_id: "MINI-1", opportunity_id: "opp-a" },
        { research_record_id: "MINI-1", opportunity_id: "opp-b" },
      ],
      FK_CONTRACT
    );
    expect(defects.some((d) => d.includes('Record ID "MINI-1" appears 2 times'))).toBe(true);
  });

  test("flags the same live row researched twice via the foreign key", () => {
    const defects = checkWithinBatchIdDiscipline(
      [
        { research_record_id: "MINI-1", opportunity_id: "opp-a" },
        { research_record_id: "MINI-2", opportunity_id: "opp-a" },
      ],
      FK_CONTRACT
    );
    expect(defects.some((d) => d.includes('"opportunity_id"="opp-a" appears 2 times'))).toBe(true);
  });

  test("does NOT flag a supersession pair — the exact V1-5 rcheck shape (DLOPP-RCHECK-04/05)", () => {
    const defects = checkWithinBatchIdDiscipline(
      [
        { research_record_id: "MINI-1", opportunity_id: "opp-a" },
        { research_record_id: "MINI-2", opportunity_id: "opp-a", supersedes_record_id: "MINI-1" },
      ],
      FK_CONTRACT
    );
    expect(defects).toEqual([]);
  });

  test("a genuine third researched-twice record alongside an unrelated supersession pair is still caught", () => {
    const defects = checkWithinBatchIdDiscipline(
      [
        { research_record_id: "MINI-1", opportunity_id: "opp-a" },
        { research_record_id: "MINI-2", opportunity_id: "opp-a", supersedes_record_id: "MINI-1" },
        { research_record_id: "MINI-3", opportunity_id: "opp-b" },
        { research_record_id: "MINI-4", opportunity_id: "opp-b" },
      ],
      FK_CONTRACT
    );
    expect(defects.some((d) => d.includes('"opportunity_id"="opp-b" appears 2 times'))).toBe(true);
    expect(defects.some((d) => d.includes("opp-a"))).toBe(false);
  });
});

// -----------------------------------------------------------------------------------
// findIdCollisionsInFileContent — bug #8 regression: raw substring matching flagged
// ECW4-021 as colliding with a batch it never appeared in as an ID, only as a prose
// citation inside another record's `notes` field.
// -----------------------------------------------------------------------------------

describe("findIdCollisionsInFileContent", () => {
  const uniqueIds = ["ECW4-021", "ECW4-022"];

  test("does NOT match an id that only appears inside another record's notes field (the real ECW4-021 case)", () => {
    const content = [
      JSON.stringify({
        record_id: "ECW4-030",
        notes: "Distinct from the CTY Residential Program, ECW4-021, succeeding earlier this wave.",
      }),
    ].join("\n");
    expect(findIdCollisionsInFileContent(content, uniqueIds)).toEqual([]);
  });

  test("DOES match when the id is another record's actual id-field value", () => {
    const content = JSON.stringify({ record_id: "ECW4-021", notes: "unrelated text" });
    expect(findIdCollisionsInFileContent(content, uniqueIds)).toEqual([{ field: "record_id", value: "ECW4-021" }]);
  });

  test("checks all three known id-like fields, not just one", () => {
    const content = [JSON.stringify({ research_record_id: "ECW4-021" }), JSON.stringify({ research_program_id: "ECW4-022" })].join("\n");
    const matches = findIdCollisionsInFileContent(content, uniqueIds);
    expect(matches).toEqual(
      expect.arrayContaining([
        { field: "research_record_id", value: "ECW4-021" },
        { field: "research_program_id", value: "ECW4-022" },
      ])
    );
  });

  test("skips blank and malformed JSON lines without throwing", () => {
    const content = ["", "   ", "{not valid json", JSON.stringify({ record_id: "ECW4-021" })].join("\n");
    expect(() => findIdCollisionsInFileContent(content, uniqueIds)).not.toThrow();
    expect(findIdCollisionsInFileContent(content, uniqueIds)).toEqual([{ field: "record_id", value: "ECW4-021" }]);
  });

  test("does not match an id that isn't in the batch's own unique-id set at all", () => {
    const content = JSON.stringify({ record_id: "ECW4-999" });
    expect(findIdCollisionsInFileContent(content, uniqueIds)).toEqual([]);
  });
});

// -----------------------------------------------------------------------------------
// checkLiveIdentityAndVocab — generic engine, real fetch mocked (same pattern as
// __tests__/acquisition/paginate.test.ts). Uses the real DLOPP_CONTRACT so this
// exercises production configuration, not a synthetic stand-in.
// -----------------------------------------------------------------------------------

describe("checkLiveIdentityAndVocab", () => {
  test("returns empty immediately for a lane with no liveTable/foreignKeyField (AU-R1's shape)", async () => {
    const result = await checkLiveIdentityAndVocab([{ research_program_id: "AU-R1-x-001" }], AU_R1_CONTRACT);
    expect(result).toEqual({ defects: [], monotonicityFindings: [] });
  });

  test("flags a foreign key that doesn't exist live", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    vi.stubGlobal("fetch", stubOpportunitiesFetch({}));
    const { defects } = await checkLiveIdentityAndVocab(
      [{ research_record_id: "DLOPP-X-01", opportunity_id: "opp-missing", opportunity_title: "t", category: "c" }],
      DLOPP_CONTRACT
    );
    expect(defects.some((d) => d.includes('opportunity_id="opp-missing" does not exist live'))).toBe(true);
  });

  test("flags an identityReconciliation mismatch (title/category drift against the live row)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      stubOpportunitiesFetch({ "opp-a": { title: "Real Title", category: "competition", verification_state: "verified_current", status: "active" } })
    );
    const { defects } = await checkLiveIdentityAndVocab(
      [{ research_record_id: "DLOPP-X-01", opportunity_id: "opp-a", opportunity_title: "Wrong Title", category: "competition" }],
      DLOPP_CONTRACT
    );
    expect(defects.some((d) => d.includes('opportunity_title="Wrong Title" does not match live title="Real Title"'))).toBe(true);
  });

  test("flags a live verification_state that doesn't match the lane's required scope", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      stubOpportunitiesFetch({ "opp-a": { title: "t", category: "c", verification_state: "unverified", status: "active" } })
    );
    const { defects } = await checkLiveIdentityAndVocab(
      [{ research_record_id: "DLOPP-X-01", opportunity_id: "opp-a", opportunity_title: "t", category: "c" }],
      DLOPP_CONTRACT
    );
    expect(defects.some((d) => d.includes('verification_state="unverified", expected "verified_current"'))).toBe(true);
  });

  test("requiredLiveStatus, when a lane sets it, is enforced the same way as verification_state", async () => {
    const statusScopedContract: LaneContract = { ...DLOPP_CONTRACT, requiredLiveStatus: "active", enumVocabChecks: [], monotonicityChecks: [] };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      stubOpportunitiesFetch({ "opp-a": { title: "t", category: "c", verification_state: "verified_current", status: "disabled" } })
    );
    const { defects } = await checkLiveIdentityAndVocab(
      [{ research_record_id: "DLOPP-X-01", opportunity_id: "opp-a", opportunity_title: "t", category: "c" }],
      statusScopedContract
    );
    expect(defects.some((d) => d.includes('status="disabled", expected "active"'))).toBe(true);
  });

  test("flags a research value with no live-vocabulary equivalent (the P1 'unknown' gap)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      stubOpportunitiesFetch({ "opp-a": { title: "t", category: "c", verification_state: "verified_current", status: "active", cycle_status: "closed" } })
    );
    const { defects } = await checkLiveIdentityAndVocab(
      [{ research_record_id: "DLOPP-X-01", opportunity_id: "opp-a", opportunity_title: "t", category: "c", cycle_status_found: "unknown" }],
      DLOPP_CONTRACT
    );
    expect(defects.some((d) => d.includes('cycle_status_found="unknown" is not in the live cycle_status vocabulary'))).toBe(true);
  });

  test("monotonicity hits land in monotonicityFindings, never in defects — they gate ingestion, they don't fail the batch", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      stubOpportunitiesFetch({
        "opp-a": { title: "t", category: "c", verification_state: "verified_current", status: "active", deadline: "2026-10-01", cycle_status: "closed" },
      })
    );
    const { defects, monotonicityFindings } = await checkLiveIdentityAndVocab(
      [{ research_record_id: "DLOPP-X-01", opportunity_id: "opp-a", opportunity_title: "t", category: "c", found_deadline: null, cycle_status_found: "closed" }],
      DLOPP_CONTRACT
    );
    expect(monotonicityFindings.some((f) => f.includes("found_deadline is null but live deadline is"))).toBe(true);
    expect(defects.some((d) => d.includes("found_deadline"))).toBe(false);
  });
});

// -----------------------------------------------------------------------------------
// DLOPP_CONTRACT.logicalRules — bug #3 regression, the highest-priority class per
// BASORG's brief: a rule too STRICT, firing on legitimate input. The original version
// assumed only finding_type=dated_current_cycle could carry a found_deadline; a closed
// cycle's own concluded deadline (finding_type=closed_historical) legitimately can too,
// per the DLOPP README — and independently re-confirmed against the real P1 batch files
// while writing the closeout doc: DLOPP-B1-08, B1-14, B2-02, B2-09, B3-15, B4-01, B4-02,
// B4-09 are 8 real, correct records this shape covers.
// -----------------------------------------------------------------------------------

describe("DLOPP_CONTRACT.logicalRules — found_deadline / finding_type gate", () => {
  const base = { retrieved_at: "2026-08-22", undated_deadline_verbatim: null };

  test("does NOT flag closed_historical with a populated found_deadline — the bug #3 false positive", () => {
    const r: Json = { ...base, finding_type: "closed_historical", found_deadline: "2025-10-01" };
    expect(DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-01")).toEqual([]);
  });

  test("does NOT flag dated_current_cycle with a populated found_deadline", () => {
    const r: Json = { ...base, finding_type: "dated_current_cycle", found_deadline: "2026-10-01" };
    expect(DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-02")).toEqual([]);
  });

  test("flags dated_current_cycle with a null found_deadline — a dated finding needs a date", () => {
    const r: Json = { ...base, finding_type: "dated_current_cycle", found_deadline: null };
    const defects = DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-03");
    expect(defects.some((d) => d.includes("found_deadline is null"))).toBe(true);
  });

  test("flags nothing_published carrying a found_deadline — only dated_current_cycle/closed_historical may", () => {
    const r: Json = { ...base, finding_type: "nothing_published", found_deadline: "2026-10-01" };
    const defects = DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-04");
    expect(defects.some((d) => d.includes("only dated_current_cycle/closed_historical may carry"))).toBe(true);
  });

  test("flags an invalid ISO date in found_deadline", () => {
    const r: Json = { ...base, finding_type: "dated_current_cycle", found_deadline: "October 1st" };
    const defects = DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-05");
    expect(defects.some((d) => d.includes("is not a valid ISO date"))).toBe(true);
  });

  test("flags undated_recurring with an empty undated_deadline_verbatim", () => {
    const r: Json = { ...base, finding_type: "undated_recurring", found_deadline: null, undated_deadline_verbatim: "" };
    const defects = DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-06");
    expect(defects.some((d) => d.includes("undated_deadline_verbatim is empty"))).toBe(true);
  });

  test("flags an empty retrieved_at", () => {
    const r: Json = { ...base, finding_type: "deferred", found_deadline: null, retrieved_at: "" };
    const defects = DLOPP_CONTRACT.logicalRules(r, "DLOPP-TEST-07");
    expect(defects.some((d) => d.includes("retrieved_at is empty"))).toBe(true);
  });
});

// -----------------------------------------------------------------------------------
// DLOPP_CONTRACT.monotonicityChecks — pure sync functions, no fetch needed. Each check
// is looked up by name so these tests fail loudly (not silently pass) if a check is
// ever renamed or removed.
// -----------------------------------------------------------------------------------

describe("DLOPP_CONTRACT.monotonicityChecks", () => {
  test("cycle_status: no-op when nothing is proposed", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "cycle_status");
    expect(check.isRegression(null, "open", {})).toBe(false);
  });

  test("cycle_status: a value with no live-vocabulary equivalent is always a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "cycle_status");
    expect(check.isRegression("unknown", "open", {})).toBe(true);
    expect(check.isRegression("unknown", "closed", {})).toBe(true);
  });

  test("cycle_status: an uninformative value over a determined live value is a regression — the Ashoka/DLOPP-B4-10 shape", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "cycle_status");
    expect(check.isRegression("unverified", "open", {})).toBe(true);
  });

  test("cycle_status: an uninformative value over an already-uninformative live value is NOT a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "cycle_status");
    expect(check.isRegression("unverified", "unverified", {})).toBe(false);
  });

  test("cycle_status: two different DETERMINED values is out of this check's scope (needs evidence review, not a mechanical guard)", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "cycle_status");
    expect(check.isRegression("open", "closed", {})).toBe(false);
  });

  test("deadline (erasure): null proposed over a populated live value is a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "deadline");
    expect(check.isRegression(null, "2026-10-01", {})).toBe(true);
    expect(check.isRegression(null, null, {})).toBe(false);
  });

  test("deadline (erasure): does not itself flag two different populated dates — that's the replacement check's job", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "deadline");
    expect(check.isRegression("2026-10-01", "2027-10-01", {})).toBe(false);
  });

  test("deadline (replacement): both populated and different is a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "deadline (replacement)");
    expect(check.isRegression("2026-10-01", "2027-01-15", {})).toBe(true);
  });

  test("deadline (replacement): both populated and equal, or either side empty, is not a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "deadline (replacement)");
    expect(check.isRegression("2026-10-01", "2026-10-01", {})).toBe(false);
    expect(check.isRegression(null, "2026-10-01", {})).toBe(false);
    expect(check.isRegression("2026-10-01", null, {})).toBe(false);
  });

  test("current_cycle_label: empty proposed over substantive live content (>15 chars) is a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "current_cycle_label");
    expect(check.isRegression(null, "2026 session (July 13-24, 2026); registrations closed", {})).toBe(true);
  });

  test("current_cycle_label: empty proposed over short/empty live content is not a regression", () => {
    const check = findMonotonicityCheck(DLOPP_CONTRACT, "current_cycle_label");
    expect(check.isRegression(null, "2026", {})).toBe(false);
    expect(check.isRegression(null, null, {})).toBe(false);
  });

  // Deliberately no "current_cycle_label (replacement)" check exists on DLOPP_CONTRACT —
  // built once for V1-5, produced 43 findings (37 pure paraphrase; the other 6 were a
  // structural false signal, since cycle_label_found on a closed_historical record
  // describes the HISTORICAL cycle, not a proposed replacement for the live CURRENT
  // label — confirmed directly on DLOPP-SP-B2-23). Removed, reasoning kept in the
  // contract's own code comments. This is a documented absence, not a gap: asserting
  // `monotonicityChecks.find((c) => c.name === "current_cycle_label (replacement)")` is
  // undefined here so a future change silently re-adding that check without re-reading
  // the reasoning shows up as a assertion change, not a silent new false-positive risk.
  test("current_cycle_label (replacement) does not exist — see DLOPP_CONTRACT's own code comment for why", () => {
    expect(DLOPP_CONTRACT.monotonicityChecks?.find((c) => c.name === "current_cycle_label (replacement)")).toBeUndefined();
  });
});

// -----------------------------------------------------------------------------------
// ECW_CONTRACT.monotonicityChecks
// -----------------------------------------------------------------------------------

describe("ECW_CONTRACT.monotonicityChecks", () => {
  test("eligible_countries: proposing nothing is never a regression", () => {
    const check = findMonotonicityCheck(ECW_CONTRACT, "eligible_countries");
    expect(check.isRegression(null, ["Germany"], {})).toBe(false);
    expect(check.isRegression([], ["Germany"], {})).toBe(false);
  });

  test("eligible_countries: populating an empty live array is permitted (RULE-INGEST-003), not a regression", () => {
    const check = findMonotonicityCheck(ECW_CONTRACT, "eligible_countries");
    expect(check.isRegression(["Germany"], null, {})).toBe(false);
    expect(check.isRegression(["Germany"], [], {})).toBe(false);
  });

  test("eligible_countries: proposing over an already-populated live array is a replacement, flagged", () => {
    const check = findMonotonicityCheck(ECW_CONTRACT, "eligible_countries");
    expect(check.isRegression(["Germany"], ["Turkey"], {})).toBe(true);
  });

  test("citizenship_restrictions prose: the real ECW3-016 shape — populating an empty live field is permitted", () => {
    const check = findMonotonicityCheck(ECW_CONTRACT, "citizenship_restrictions (prose, unadjudicated content)");
    expect(check.isRegression("propose_citizenship_restrictions_prose_only", null, {})).toBe(false);
  });

  test("citizenship_restrictions prose: proposing new prose over already-populated live prose is a replacement", () => {
    const check = findMonotonicityCheck(ECW_CONTRACT, "citizenship_restrictions (prose, unadjudicated content)");
    expect(check.isRegression("propose_citizenship_restrictions_prose_only", "existing restriction text", {})).toBe(true);
  });

  test("citizenship_restrictions prose: a record not proposing this field at all is never flagged, regardless of live content", () => {
    const check = findMonotonicityCheck(ECW_CONTRACT, "citizenship_restrictions (prose, unadjudicated content)");
    expect(check.isRegression("none_worldwide_confirmed", "existing restriction text", {})).toBe(false);
  });
});

// -----------------------------------------------------------------------------------
// DLOPP_CONTRACT.customLiveChecks — the escape hatch, exercised end-to-end with fetch
// mocked. Covers status-breakdown reporting and supersession-pair reporting, including
// the "superseded record not found in this file set" branch.
// -----------------------------------------------------------------------------------

describe("DLOPP_CONTRACT.customLiveChecks", () => {
  const target = { url: "https://example.supabase.co", key: "test-key" };

  test("reports a status breakdown and flags non-active records as findings, not defects", async () => {
    vi.stubGlobal("fetch", stubOpportunitiesFetch({ "opp-a": { status: "active" }, "opp-b": { status: "disabled" } }));
    const records: Json[] = [
      { research_record_id: "DLOPP-X-01", opportunity_id: "opp-a", opportunity_title: "A" },
      { research_record_id: "DLOPP-X-02", opportunity_id: "opp-b", opportunity_title: "B" },
    ];
    const { defects, findings } = await DLOPP_CONTRACT.customLiveChecks!(records, target);
    expect(defects).toEqual([]);
    expect(findings.some((f) => f.includes("active=1") && f.includes("disabled=1"))).toBe(true);
    expect(findings.some((f) => f.includes("DLOPP-X-02") && f.includes('status="disabled"'))).toBe(true);
  });

  test("reports a supersession pair with the finding_type transition when the original is in this file set", async () => {
    vi.stubGlobal("fetch", stubOpportunitiesFetch({ "opp-a": { status: "active" } }));
    const records: Json[] = [
      { research_record_id: "DLOPP-RCHECK-01", opportunity_id: "opp-a", finding_type: "deferred" },
      { research_record_id: "DLOPP-RCHECK-02", opportunity_id: "opp-a", finding_type: "closed_historical", supersedes_record_id: "DLOPP-RCHECK-01" },
    ];
    const { findings } = await DLOPP_CONTRACT.customLiveChecks!(records, target);
    expect(findings.some((f) => f.includes("DLOPP-RCHECK-02 supersedes DLOPP-RCHECK-01") && f.includes("deferred → closed_historical"))).toBe(true);
  });

  test("reports 'superseded record not found in this file set' when the original isn't in this batch", async () => {
    vi.stubGlobal("fetch", stubOpportunitiesFetch({ "opp-a": { status: "active" } }));
    const records: Json[] = [{ research_record_id: "DLOPP-RCHECK-03", opportunity_id: "opp-a", supersedes_record_id: "DLOPP-SP-B3-99" }];
    const { findings } = await DLOPP_CONTRACT.customLiveChecks!(records, target);
    expect(findings.some((f) => f.includes("DLOPP-RCHECK-03 supersedes DLOPP-SP-B3-99 (superseded record not found in this file set)"))).toBe(true);
  });
});

// -----------------------------------------------------------------------------------
// findTaxonomyConsistencyGaps — AU-R1's escape hatch logic, the mechanism that found the
// one real gap in V1-4 (10 Sydney combined-award records under-classified). Extracted so
// the calibrated case is a fast, network-free regression test.
// -----------------------------------------------------------------------------------

describe("findTaxonomyConsistencyGaps", () => {
  test("flags a title naming a graduate award when degree_level isn't the integrated-master's label — the real Sydney gap", () => {
    const findings = findTaxonomyConsistencyGaps([
      {
        research_program_id: "AU-R1-sydney-026",
        university_name: "University of Sydney",
        program_name: "Bachelor of Arts and Doctor of Medicine",
        degree_level: "Bachelor / first-cycle",
      },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("AU-R1-sydney-026");
    expect(findings[0]).toContain("Doctor of Medicine");
  });

  test("does NOT flag a graduate-award title correctly labeled integrated master's — the UNSW/Monash shape", () => {
    const findings = findTaxonomyConsistencyGaps([
      {
        research_program_id: "AU-R1-unsw-100",
        university_name: "UNSW Sydney",
        program_name: "Bachelor of Medical Science / Doctor of Medicine",
        degree_level: "Bachelor / first-cycle (integrated master's)",
      },
    ]);
    expect(findings).toEqual([]);
  });

  test("does NOT flag a title with no Master/Doctor token at all", () => {
    const findings = findTaxonomyConsistencyGaps([
      {
        research_program_id: "AU-R1-sydney-050",
        university_name: "University of Sydney",
        program_name: "Bachelor of Arts (Honours)",
        degree_level: "Bachelor / first-cycle (Honours)",
      },
    ]);
    expect(findings).toEqual([]);
  });
});
