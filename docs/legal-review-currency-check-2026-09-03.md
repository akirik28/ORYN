# LEGAL_REVIEW.md currency check — a diff against today, not a rewrite

**Not an edit to `LEGAL_REVIEW.md`.** Per explicit instruction: this reports what changed since
the packet was last read out of the code (2026-08-31) and lets whoever's coordinating the
counsel conversation decide what reaches the lawyer. Checked against `origin/main`@`af0ade97`.

## §2 first, plainly: yes, it now understates what Anthropic receives

**"The student's school name is not sent" — no longer true. Confirmed live in code, not
inferred.** Commit `0833bd54` (this morning, 05:24) added `student.schoolName` to the advisor
context, rendered directly into the prompt (`lib/ai/student-context.ts:597`, `"${e.schoolName}"`
style text, `"...at [school]"`). This was a specific, bolded reassurance in the packet's own
text — it is the single clearest concrete regression in this check, not a hedge that softened
over time.

**The same commit also adds five more categories to what reaches Anthropic on every
advisor_chat and weekly_plan call, none of which the packet's "compact profile summary" list
names:**

| Now sent to Anthropic | Not in §2's current list |
|---|---|
| `educationRecords[].schoolName` | School name (a second path to the same fact) |
| `educationRecords[].overallGpa` / `.gpaScale` | GPA |
| `courses[].courseName` / `.level` / `.gradeValue` / `.gradeScale` | Individual course names and grades |
| `testScores[].testName` / `.score` / `.maxScore` / `.subscores` | Standardized test scores, including per-section subscores |
| `certifications[].title` / `.organization` | Certification titles and issuing organizations |
| `volunteeringExperiences[]`, `workExperiences[]` (title, organization, employment type, paid status) | Employer/organization names |

Plus three smaller previously-dropped fields now rendered: `goals[].category`, `interests`, and
the `student.schoolName` line above. All of this was already being *fetched* (it feeds the
Academics/Intellectual Curiosity scores) — the commit's own framing is "a rendering fix, not a
new fetch," meaning the data was already in the server's memory for this request either way, but
§2 describes what reaches **Anthropic specifically**, and that boundary is what moved.

**What this means for §2's own claim, stated plainly since that's what was asked:** the current
text — "a compact profile summary — display name, graduation year, curriculum, country, weekly
time budget, dimension scores, and the *titles* of activities, projects, research, awards and
goals" — was accurate on 2026-08-31 and is not accurate today. It undercounts by a real,
specific list (above), not a rounding difference. GPA and test scores in particular are more
sensitive than anything currently named in that paragraph.

## Tavily / College Scorecard — checked, no §2 change needed

Both keys went live today, but `lib/providers/tavily.ts` and `lib/providers/college-scorecard.ts`
themselves were not touched (checked via `git log --since` against both files directly) — going
from not-configured to live changes *whether* real requests succeed, not *what* they send. §2's
existing claims for both ("search terms only, never describe a student" / "university identifiers
only") describe the request shape, which is unchanged. No update needed here.

## §4 ("what is actually implemented") — re-checked each anchor, all still hold

- `deleteMyAccount()` (`app/(app)/settings/actions.ts`) — still present, unchanged.
- Full data export (`app/api/export-data/route.ts`) — **touched today** (`3ece6b40`), but the
  commit's own scope is additive-only: a `meta.complete`/`meta.incompleteTables` flag so a
  failed read is distinguishable from genuinely-empty data in the downloaded file. Every table's
  actual exported shape is explicitly unchanged per that commit's own message — if anything this
  makes §4's export claim *more* true (a real access request is now less likely to silently omit
  something), not less. Worth a one-line mention if the packet is ever refreshed, not a
  correction.
- RLS (migration 0014), private storage buckets (migration 0015), server-side-only credentials,
  consent enforcement/recording (`__tests__/legal/consent.test.ts`) — none touched since
  2026-08-31, all still present.

## §5 (pre-publication checklist) — unchanged

`COMPANY` in `lib/legal/content.ts` — every field (`legalName`, `registrationNumber`,
`registeredAddress`, `verbisRegistration`, `contactEmail`, `privacyContactEmail`,
`dataProtectionOfficer`, `governingLaw`) is still `unresolved(...)`, unchanged since the packet
was written. This is the same fact
`docs/ultra-sales-readiness-scope-2026-09-03.md` already flagged from a different angle
(payment-provider registration needs the same entity) — two independent checks landing on the
same open item.

`legalCopyTr`/`legalCopyEn` (`lib/legal/content.ts`) — only one change since 2026-08-31: item 8
(opportunity-image licensing, `c111f979`), which is already correctly reflected in the packet's
current §3 — not a new gap, already accounted for.

## What this doesn't cover

Everything else in the packet not named above (§1/§1a document-rendering claims, §3 items 1, 2,
3, 5, 6 beyond what's touched above) was not independently re-verified against today's code —
scoped this check to what the assignment named (§2, §4, §5) rather than a full re-read of the
whole packet. If a fuller re-verification is wanted, that's a larger, separate pass.
