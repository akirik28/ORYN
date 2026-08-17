# Opportunities — research handoff & scale-up notes

Companion to `docs/research-handoff-university-programs.md`, same rationale: a
git-committed JSONL contract at `data/research/opportunities/*.jsonl` so a parallel
research process and this repo's own tooling can hand off incrementally, independent of
the live `discoverOpportunitiesForQuery` AI-discovery pipeline (`lib/opportunities/discover.ts`),
which stays the automated path for finding *new* candidates via Tavily search.

## Architecture already in place (migration `0041_opportunity_verification_taxonomy.sql`)

Confirmed on this pass — no schema change needed before scaling past the current 11 rows:

- **`verification_state`** (`verified_current` / `verified_historical` / `verified_derived`
  / `unverified` / `conflicting`) is the same taxonomy `university_programs` uses, so one
  mental model covers both.
- **`selectivity_tier`** (`extremely_selective` → `open_enrollment` → `unknown`) is a
  *factual* signal, independent of `opportunity_matches.match_score` (Oryn's own
  relevance ranking) — the founder's non-negotiable that RSI and an open-enrollment
  commercial summer program must never read the same. Already wired into
  `features/opportunities/opportunity-card.tsx`'s badges; never infer this from brand
  prestige — it needs actual evidence (published acceptance rate, cohort size, qualifying
  exam, nomination-only, competitive rounds).
- **Cycle vs. persistent opportunity** — deliberately one row with `cycle_status` +
  `current_cycle_label` (e.g. `"2026 cycle closed; 2027 dates not yet posted"`) rather
  than a separate child table, per migration 0041's own comment. Revisit only if a single
  opportunity needs to track *multiple simultaneous* cycles with independently different
  deadlines/eligibility — not needed at current or near-term scale.
- **Dedup** (`lib/opportunities/dedup.ts`) — canonical-URL match, or same-organization +
  Jaccard title similarity ≥ 0.6. Already used both by the live AI-discovery pipeline and
  should be reused by any JSONL ingestion script, not reimplemented.
- **Organizer identity** — `organizations_entity_id` via `canonical_preferred_custom_fallback`
  (see `lib/entities/field-policy.ts`), same registry universities/schools use. A JSONL
  record's `organization` string resolves through the same `search_canonical_entities` path
  — no separate opportunity-provider resolution logic needed.

## Record shape (mirrors the opportunities table + taxonomy)

```json
{
  "research_opportunity_id": "RSRCH-OPP-2026-08-17-0001",
  "title": "PROMYS",
  "organization": "Boston University",
  "category": "summer_program",
  "official_url": "https://promys.org",
  "application_url": "https://promys.org/apply",
  "description": "A six-week summer program in mathematics for talented high school students.",
  "country": null,
  "eligible_countries": [],
  "remote_allowed": false,
  "minimum_age": 15,
  "maximum_age": 18,
  "eligible_grades": ["10", "11"],
  "fields": ["mathematics"],
  "cost": null,
  "financial_aid_available": true,
  "deadline": "2027-03-15",
  "application_open_date": null,
  "start_date": "2027-06-29",
  "end_date": "2027-08-09",
  "location_mode": "in_person",
  "citizenship_restrictions": null,
  "residency_restrictions": null,
  "application_requirements": ["essay", "recommendation", "transcript"],
  "selectivity_evidence": "Published acceptance rate ~15%; requires a challenging qualifying quiz.",
  "current_cycle_label": "2027",
  "cycle_status": "upcoming",
  "source_url": "https://promys.org/apply",
  "source_type": "official_primary",
  "verification_status": "Verified - official page fetched and read",
  "researched_at": "2026-08-17"
}
```

Required: `title`, `organization`, `category`, `official_url`, `source_url`, `source_type`,
`verification_status`, `researched_at`. `selectivity_evidence` is required whenever
`selectivity_tier` would resolve to anything above `open_enrollment` — free text is fine,
but it must cite the actual mechanism (acceptance rate, nomination, exam), not just assert
a tier.

## Verification gate

Same shape as programs: `official_url`/`source_url` present, `source_type` in the valid
set, `verification_status` reads as page-confirmed (not a search snippet), not a duplicate
by `lib/opportunities/dedup.ts`'s rule. A candidate with a real identity but ambiguous
organizer resolution is still insertable (unlike university programs) — `organization` is
`canonical_preferred_custom_fallback`, not `canonical_required` — but should still resolve
to an existing canonical entity where one plausibly exists rather than always minting a
new `organization_entity_id`.

## Category coverage for the founder's counseling-materials discovery list

Section 12's named candidates (RSI, Yale Young Global Scholars, PROMYS, SUMaC, Ross, SSP,
Pioneer Academics, Wharton Global Youth, Wharton M&TSI, LaunchX, BETA Camp, World Scholar's
Cup, Diamond Challenge, Conrad Challenge, Wharton Investment Competition, HMMT, Berkeley
Math Tournament, Stanford Math Tournament, Genius Olympiad, Breakthrough Junior Challenge,
iGEM) are discovery *targets*, not yet-verified facts — 9 of these 21 are already live
(RSI, YYGS, PROMYS, SUMaC, LaunchX, Diamond Challenge, Conrad Challenge, HMMT, Genius
Olympiad, Breakthrough Junior Challenge, iGEM — see current `opportunities` rows). The
remaining ones (Ross, SSP, Pioneer Academics, Wharton Global Youth, Wharton M&TSI, BETA
Camp, World Scholar's Cup, Wharton Investment Competition, Berkeley Math Tournament,
Stanford Math Tournament) are exactly the shape of candidate this JSONL contract is for —
each needs its own official-source verification pass before promotion, per the gate above.
