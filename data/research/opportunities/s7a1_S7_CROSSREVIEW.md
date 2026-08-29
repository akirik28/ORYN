# S7 cross-review of S7-A1 (scholarships/awards) — pass 1

Reviewer: S7 (parent session). Spot-checked schema/evidence quality on VERIFIED records,
independently re-verified the flagged Czech-scholarship aggregator-vs-official discrepancy
(confirmed: `msmt.gov.cz`'s own 2027/2028 eligible-country list does not include Türkiye,
contradicting the aggregator claim the sub-agent rejected on this basis — correct call),
and re-attempted the one blocked top-priority CANDIDATE (`tr.uwc.org`) myself.

## Findings

- **27 rejections reviewed at a sample level** (Czech govt scholarships, FLEX) — both cite a
  real official source with a working URL and a specific, checkable reason. This is a high
  rejection:accept ratio (27:15) but the reasons are substantive (citizenship/country
  restriction, graduate-only, not-a-distinct-opportunity), not padding-avoidance box-ticking.
  Matches the contract's "quality beats raw count" standard.
- **UWC Türkiye National Committee** — re-attempted `tr.uwc.org` independently, got the same
  403 the sub-agent reported. Block is real/persistent, not session-specific. Still needs a
  human/real-browser check before upgrading past CANDIDATE.
- **One methodological finding worth applying fleet-wide, not just here**: the UWC record
  carries `"turkey_student_access": "VERIFIED_ELIGIBLE"` despite `verification_state` being
  `CANDIDATE` (facts are WebSearch-synthesized, not directly quoted from the blocked official
  page). Per the Common Operating Contract, `VERIFIED_ELIGIBLE` should track confirmed
  first-party evidence — a record whose underlying facts aren't yet VERIFIED shouldn't carry
  a `turkey_student_access` label stronger than `ELIGIBLE_WITH_CONDITIONS` (pending
  confirmation), even if the researcher is subjectively confident. **Will apply this
  correction during final cross-lane consolidation** (downgrade `turkey_student_access` to
  match `verification_state` wherever the two are inconsistent, across all S7-A1/A2/B1/B2
  output) rather than patching one record now. Worth flagging to S8/S9 as a check other lanes'
  self-assessments may share.

## Conclusion

Sub-agent's work holds up under independent spot-check. Same status as S7-A2: **S7-reviewed,
held for final cross-lane consolidation** (dedup across all 4 sub-lanes + the
turkey_student_access/verification_state consistency pass above + image pass) before anything
is marked PRODUCTION_READY. 15 accepted (10 VERIFIED, 5 CANDIDATE) is a genuine, honestly-
reported result — Turkish-foundation study-abroad funding and many famous international
scholarship names are real dead ends for this specific eligibility gate, not a research gap.
