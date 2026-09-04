# Placeholder sweep — 2026-09-04

CEO dispatch, off the founder's own screenshot: `Operated by: [Registered name]` in the
site footer, live. Asked to sweep for the whole class — anything that reads as unfinished
to a real visitor — separate what's actually a bug from what's a decision only the founder
can make, and fix only what's unambiguous.

**Result: nothing unambiguous to fix.** The footer's exact complaint traces to two things,
both explained below, neither of which is a stray leftover string — one is a founder
decision, the other is a documented design tradeoff the founder's own reaction has now
called into question. Everything else checked came back clean.

**Independent corroboration, found on rebase:** commit `721f84e4` (landed on main while this
sweep was in progress, unrelated primary purpose — the quiet admin sign-in link in the same
footer) answers the identical `[Registered name]` question on its own, reaching the same
conclusion: unresolved on purpose, waiting on the founder, not an engineering defect. That
commit doesn't touch the actual bracket-rendering code, so the design-tension question below
is still open and unaddressed by it — noting the overlap for the record, not because either
pass needs redoing.

## What the founder saw, precisely

`features/legal/site-footer.tsx`'s company line renders `[Registered name]` because
`COMPANY.legalName` (`lib/legal/content.ts:112`) is `unresolved("companyLegalName")` — a
typed marker, not a string, that the codebase uses specifically so a privacy notice can
never accidentally assert a company identity that doesn't exist yet. The file's own header
comment: *"Proxola has no registered legal entity on file in this repository, and a privacy
notice naming the wrong controller is worse than one that names none."* This is deliberate,
and it is working as designed — the visible bracket is the point, not a bug that produces it.

**This is a decision-pending item, not a fix-list item**, and it isn't the only one:
`COMPANY` currently has eight unresolved fields, not one. Filling in the real value once
it exists resolves the footer AND every legal-document page at once (`lib/legal/content.ts`
is the single source both read from).

| Field | Waiting on | Where it renders |
|---|---|---|
| `legalName` | founder (company registration) | Footer, Privacy/Terms/KVKK "Controller details" |
| `registrationNumber` | founder | Privacy/Terms/KVKK "Controller details" |
| `registeredAddress` | founder | Privacy/Terms/KVKK "Controller details" |
| `verbisRegistration` | counsel (KVKK-specific) | KVKK "Controller details" |
| `privacyContactEmail` | founder (route `privacy@proxola.com`, confirmed not yet set up) | Privacy/Terms/KVKK "Contact details" |
| `dataProtectionOfficer` | counsel (GDPR Art. 37 applicability) | Privacy/Terms/KVKK "Contact details" |
| `governingLaw` | counsel | Privacy/Terms/KVKK "Jurisdiction" |

(`contactEmail` is already resolved — `hello@proxola.com`, live-verified per that constant's
own comment — so it's the one row not listed above.)

## The part that's genuinely a tension, not a bug — needs a call, not a fix

The seven fields above render as a loud, unmistakable `<Unconfirmed>` chip everywhere
*except* the footer: dashed amber border, tooltip, screen-reader text — impossible to
mistake for settled content. `features/legal/site-footer.tsx` deliberately does **not** use
that component for its own two unresolved-capable fields (`contactEmail`, `legalName`),
and says exactly why, in its own comment: *"in a footer the chip reads as a broken
component, whereas in a policy document the loudness is the point."* That reasoning was a
real, considered call — not an oversight — and the founder's own screenshot is now the
concrete evidence that plain brackets read as *more* broken than the reasoning predicted,
not less.

Not picking a fix here, per the "fix only what's unambiguous" instruction — this is a
design/copy judgment, not a mechanical correctness question, and the existing choice has
documented reasoning on record that a screenshot alone doesn't settle. Three options, not
recommended in order:

1. **Use `<Unconfirmed>` in the footer too**, accepting the loudness the original comment
   argued against.
2. **Keep it quiet, drop the brackets** — brackets are the specific visual signature that
   reads as an unrendered template variable; a plain aside ("registration pending") in the
   same muted styling might read as intentional without the chip's loudness.
3. **Omit the line entirely** while `legalName` is unresolved, and show it only once a real
   value exists — no visible placeholder at all, at the cost of the footer saying nothing
   about the operating entity in the meantime.

## Everything else checked, confirmed clean

Traced what actually renders, not raw grep hits — a hit in a fixture, test, dev-preview
route, or comment doesn't count, matching the same discipline named in the dispatch.

- **Both message catalogs** (`messages/en.json`, `messages/tr.json`) — no `TODO`/`TBD`/
  `FIXME`, no lorem ipsum, no bracket-placeholder strings anywhere in an actual copy value
  (checked programmatically, not by eyeballing). The one `example.com` hit
  (`emailPlaceholder: "parent@example.com"`) is a genuine HTML `placeholder=` attribute on
  an empty input — confirmed at its one call site, not assumed from the key name.
- **`LAWYER_FLAGS`** (`lib/legal/content.ts`) — the file's own comment claims these internal
  engineering-to-counsel notes are "rendered nowhere in the product." Verified rather than
  trusted: the one hit outside `content.ts` itself is a code *comment* citing
  `LAWYER_FLAGS.minorConsent` for a developer's context, not an import or a render.
- **`CompanyDetails`** (`features/legal/company-details.tsx`, the other consumer of
  `COMPANY`'s unresolved fields, used across all three legal documents) — consistently
  uses `<Unconfirmed>` for every field, no deviation. Confirmed only two files in the whole
  app touch `isUnresolved`/`COMPANY` at all: this one and the footer.
- **Landing page** (`app/page.tsx`, a literal Figma port with hardcoded English, the most
  likely place for leftover design-tool text) — no lorem/placeholder/sample/dummy strings,
  no testimonial section at all to carry a placeholder name.
- **General sweep** across `app/`, `features/`, `components/`, `lib/` for `John Doe`,
  `Jane Doe`, `foo@`, `test@test`, `acme.com`, `[insert...]`, `WIP`, `replace this`, "your
  company name here" and similar — every hit traced back to a false positive (a legitimate
  feature key named `oneThingNotToDo`, a comment about data-coverage gaps, a comment about
  an admin-only moderation label), not a real instance.

## Not fixed, and why

Nothing in this sweep met the bar for an unambiguous fix. The footer's specific complaint
has a real, principled owner-side answer (the founder needs to supply a company name) and a
real, separate design question (options above) — neither is a stray string an engineering
pass should silently pick a side on.
