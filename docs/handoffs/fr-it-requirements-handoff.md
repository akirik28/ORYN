# FR-IT-REQUIREMENTS — closing handoff

Companion to [`docs/research/university-requirements/fr-it-requirements-deadlines-summary.md`](../research/university-requirements/fr-it-requirements-deadlines-summary.md),
which has the verified counts and the substantive findings. This doc is the part meant for
whoever next touches France/Italy requirements work specifically — a technique writeup and
practical re-run guidance, not a restatement of the summary.

## A third extraction technique this repo now has, alongside the other two found today

Two Italian institutions (Bocconi, Politecnico di Torino) render their real admissions content
behind JS accordions. A plain fetch or `get_page_text` call returns only the section headings —
the actual requirement/deadline text does not exist in the DOM at all until the accordion control
is activated. This is a different failure mode from the two other extraction problems found
elsewhere in today's research (a PDF `WebFetch` can't parse; a page whose real data lives behind a
keyless API discoverable only by reading its own network calls) — here the content is genuinely
client-rendered on interaction, not just differently packaged.

**The fix, concretely:**

```js
(async () => {
  const btn = Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.trim() === 'When to apply');   // exact section heading text
  if (!btn) return 'button not found';
  btn.click();
  await new Promise(r => setTimeout(r, 800));                // let the panel render
  return document.body.innerText;                             // now contains the real content
})()
```

Run via the browser tool's JS-execution action against the already-loaded page. This is reading
the same content a human visitor sees after clicking — not fabricating anything, not bypassing
any access control, just triggering the interaction a plain HTTP fetch can't perform. Two things
that went wrong on the way to this working reliably, worth knowing in advance:

- **Exact-text `===` matching on button labels is fragile.** Whitespace/newlines inside the
  button's own markup make `.textContent.trim() === 'Elements of evaluation'` fail even when the
  button plainly says that (confirmed: it was in the button list, the exact-match query still
  returned nothing). No clean fix found this pass beyond falling back to `.includes()` or
  filtering by a shorter distinctive substring — flagging as an open rough edge, not a solved one.
- **Some accordions are single-open panels, not independent toggles.** At Bocconi, clicking a
  second section header after the first appeared to collapse the first back down rather than
  opening both — confirmed by `document.body.innerText.length` dropping after the second click.
  If you need two sections from the same accordion, read and record the first fully before
  clicking the second, rather than batching both clicks and reading once at the end.

## Practical guidance for the Italy re-run when 2027-28 calls publish

Per the coordinator's note, Bocconi is the marker: its 2027-28 calls (Early Session applications
2–29 Sept 2026, Winter Session 25 Nov 2026 – 26 Jan 2027) were already live and dated at the time
of this research (2026-08-21), while Sapienza and Politecnico di Torino's pages were both still
showing the closed 2026-27 cycle with no 2027-28 dates yet. That gap will close on its own
timeline per institution — don't assume all five remaining Italian universities publish on the
same schedule Bocconi does.

When re-running, in priority order by what's likely to have changed:

1. **Sapienza and Politecnico di Torino's Universitaly deadline** — both stated 30 June 2026 for
   the 2026-27 cycle, identically. Worth checking on the re-run whether that's a genuinely fixed
   national date (MUR-set) that will recur on the same day/month next cycle, or whether it moves
   year to year — this pass found the date but not its source authority (whose calendar it
   actually is), which would resolve whether it can safely become a `recurring_annual_undated`
   fact instead of needing a fresh look every cycle.
2. **Padua's multi-call calendar** — the specific dates will change, but the *structure* (three
   calls for unlimited-places programmes with non-EU-abroad excluded from the last one; two calls
   for limited-places programmes with non-EU-abroad exclusive to the first one) is a policy
   choice, not a per-cycle artifact. Confirm the structure still holds before assuming the new
   dates map onto the same pattern.
3. **Politecnico di Milano and Bologna's TOLC/TOLC-CEnT-S registration windows** were not captured
   as static dates this pass at all — both defer to a portal or an annual Call for Admission PDF.
   If a future pass has PDF-parsing capability this session didn't use, both institutions'
   official "Call for Admission" documents (linked directly from the pages this pass visited) are
   the primary source to go after, rather than searching for a restated date on an HTML page that
   may not carry one.
4. **Bologna's "no general deadline for pre-enrolment" claim** (see main summary doc) is still
   unconfirmed by this lane — genuinely worth a second look with PDF access, since if true it's a
   real and useful contrast with every other Italian institution in this batch, all of which
   *did* state a specific date.

## What isn't in the summary doc: two institutions where the France pattern nearly, but didn't
quite, repeat

Paris-Saclay's reorientation exception (any already-enrolled French post-bac student, regardless
of nationality, is routed through Parcoursup for reorientation — except "auditeur libre" status,
which isn't real student status for this purpose and falls back to DAP) and its UK-nationals
carve-out (Parcoursup for the admission decision, a separate Études en France visa step
afterward) were the two most structurally distinctive findings in the France half of this pass.
Neither was cross-checked against the other four French institutions — it's plausible both are
Paris-Saclay-specific policy rather than national rules, since neither Sciences Po, Sorbonne, PSL,
nor Paris Cité's own pages were searched specifically for either exception. Worth a deliberate
check rather than an assumption either way if a future pass touches French reorientation or
UK-national cases at another institution.
